import { defineEventHandler, readBody, createError, readValidatedBody } from 'h3';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { z, ZodIssueCode } from 'zod';
import { auth } from '~/server/lib/auth';
import { Prisma } from '@prisma-app/client';
import { hashSync } from 'bcryptjs';
import { recordAuditLog } from '~/server/utils/auditLog';

// Zod schema for input validation
const CreateUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED'], {
    errorMap: (issue, ctx) => {
      if (issue.code === ZodIssueCode.invalid_enum_value) {
        return { message: 'Invalid user status' };
      }
      return { message: 'Invalid user status' };
    },
  }),
  roleIds: z.array(z.string()).optional(),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => CreateUserInputSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed.',
      data: result.error.flatten().fieldErrors,
    });
  }

  const { name, email, password, status, roleIds } = result.data;
  const prisma = await getEnhancedPrismaClient(event);

  const sessionData = await auth.api.getSession({ headers: event.headers });
  const actorId = sessionData?.user?.id || null;

  try {
    const newAccount = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        data: { status: status, roles: roleIds?.map(id => ({ id })) }
      }
    });

    const finalUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: {
          id: newAccount.user.id,
        }
      });

      if (!user) {
        throw new Error('User creation failed within transaction.');
      }

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          name,
          email,
          status,
        },
      });

      if (roleIds && roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId: string) => ({
            userId: user.id,
            roleId: roleId,
          })),
        });
      }

      const userWithRoles = await tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          roles: { include: { role: true } },
        },
      });

      return userWithRoles;
    });

    if (finalUser) {
      await recordAuditLog(event, {
          action: 'USER_CREATE',
          entityName: 'User',
          entityId: finalUser.id,
          oldValue: null,
          newValue: finalUser,
      }, actorId);
    }

    return { success: true, user: finalUser };
  } catch (error: unknown) {
    console.error(`[Admin] Error creating user:`, error);
    
    let errorMessage = 'Failed to create user.';
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        statusCode = 409; 
        const target = (error.meta as { target?: string[] } | undefined)?.target;
        if (target && target.includes('email')) {
          errorMessage = 'A user with this email already exists.';
        } else {
          errorMessage = 'A unique constraint was violated.';
        }
      }
    } else if (error instanceof Error) {
        errorMessage = error.message;
    }

    throw createError({
      statusCode: statusCode,
      statusMessage: errorMessage,
    });
  }
});