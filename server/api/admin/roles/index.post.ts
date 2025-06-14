import { z } from 'zod';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { Prisma } from '@prisma-app/client';
import { recordAuditLog } from '~/server/utils/auditLog';
import { auth } from '~/server/lib/auth';

// Zod schema for input validation
const CreateRoleInputSchema = z.object({
  name: z.string().min(1, 'Role name is required.'),
  description: z.string().nullable().optional(), // Description can be null or omitted
  permissionIds: z.array(z.string().cuid2({ message: 'Invalid permission ID format.' })).optional(),
});

export default defineEventHandler(async (event) => {
  const result = await readValidatedBody(event, body => CreateRoleInputSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 422, // Unprocessable Entity
      statusMessage: 'Validation failed.',
      data: result.error.flatten().fieldErrors,
    });
  }

  const { name, description, permissionIds } = result.data;
  const prisma = await getEnhancedPrismaClient(event);

  const sessionData = await auth.api.getSession({ headers: event.headers });
  const actorId = sessionData?.user?.id || null;

  try {
    const newRole = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Create the Role
      const role = await tx.role.create({
        data: {
          name,
          description: description,
        },
      });

      // 2. Create RolePermission entries if permissionIds are provided
      if (permissionIds && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(pId => ({
            roleId: role.id,
            permissionId: pId,
          })),
        });
      }

      // 3. Return the created role with its permissions for confirmation
      return tx.role.findUniqueOrThrow({
        where: { id: role.id },
        include: {
          permissions: { include: { permission: true } },
        },
      });
    });

    await recordAuditLog(event, {
      action: 'ROLE_CREATE',
      entityName: 'Role',
      entityId: newRole.id,
      oldValue: null,
      newValue: newRole,
    }, actorId);

    return newRole;

  } catch (error: unknown) {
    console.error(`Error creating role:`, error);
    
    let errorMessage = 'Failed to create role.';
    let statusCode = 500;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Check for unique constraint violation (e.g., role name already exists)
      if (error.code === 'P2002') {
        statusCode = 409; // Conflict
        const target = error.meta?.target as string[] | undefined;
        if (target && target.includes('name')) {
          errorMessage = 'A role with this name already exists.';
        } else {
          errorMessage = 'A unique constraint was violated.';
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('denied by access policy')) {
        statusCode = 403;
        errorMessage = 'Operation denied by access policy.';
      }
    }

    throw createError({
      statusCode: statusCode,
      statusMessage: errorMessage,
      // Optionally pass back more structured error data if needed
      // data: { ... }
    });
  }
}); 