import { z } from 'zod';
import { getEnhancedPrismaClient } from '~/server/lib/db';
// Import Prisma namespace as a value
import { Prisma } from '@prisma-app/client'; 

// Zod schema for input validation
const UpdateRoleInputSchema = z.object({
  name: z.string().min(1, 'Role name is required.'),
  description: z.string().nullable().optional(), // Allow string, null, or undefined
  permissionIds: z.array(z.string().cuid2({ message: 'Invalid permission ID format.' })).optional(), // CUIDs for permission IDs
});

export default defineEventHandler(async (event) => {
  const roleId = getRouterParam(event, 'id');
  if (!roleId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Role ID is required.',
    });
  }

  const result = await readValidatedBody(event, body => UpdateRoleInputSchema.safeParse(body));

  if (!result.success) {
    throw createError({
      statusCode: 422, // Unprocessable Entity
      statusMessage: 'Validation failed.',
      data: result.error.flatten().fieldErrors,
    });
  }

  const { name, description, permissionIds } = result.data;
  // Await the Prisma client from getEnhancedPrismaClient
  const prisma = await getEnhancedPrismaClient(event); 

  try {
    const updatedRole = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Update Role's direct fields
      const roleUpdateData: { name: string; description?: string | null } = { name };
      if (description !== undefined) { // Only include description if provided
        roleUpdateData.description = description || null; // Set to null if empty string, otherwise the value
      }
      
      const role = await tx.role.update({
        where: { id: roleId },
        data: roleUpdateData,
      });

      if (!role) {
        // This should ideally not happen if the update itself doesn't throw for not found
        // but as a safeguard inside transaction:
        throw new Error('Role not found for update after attempting update.'); 
      }

      // 2. Delete existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { roleId: roleId },
      });

      // 3. Create new permissions if any are provided
      if (permissionIds && permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map(pId => ({
            roleId: roleId,
            permissionId: pId,
          })),
        });
      }
      
      // 4. Return the updated role with its new permissions for confirmation
      //    (ZenStack will ensure only readable fields are returned based on policy)
      return tx.role.findUniqueOrThrow({
        where: { id: roleId },
        include: {
          permissions: { include: { permission: true } },
        },
      });
    });

    return updatedRole;

  } catch (error: unknown) {
    console.error(`Error updating role ${roleId}:`, error);
    
    let errorMessage = 'Failed to update role.';
    let statusCode = 500;
    let errorResponseData: unknown = null;

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      errorMessage = error.message;
      if (error.code === 'P2025') {
        statusCode = 404;
        errorMessage = `Role with ID ${roleId} not found.`;
      } else if (error.code === 'P2002') { // Handle unique constraint violation for name on update
        statusCode = 409; // Conflict
        const target = error.meta?.target as string[] | undefined;
        if (target && target.includes('name')) {
          errorMessage = 'A role with this name already exists.';
        } else {
          errorMessage = 'A unique constraint was violated during update.';
        }
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      if (errorMessage.includes('denied by access policy')) {
        statusCode = 403;
        // errorMessage is already set to the policy denial message
      }
    }
        
    // Attempt to get Zod error data if re-thrown by ZenStack or other wrapped errors
    // This check should be outside the `error instanceof Error` if `error` could be other things with a `data` field.
    // However, for now, let's keep it simple. If error.data exists from a Zod re-throw by ZenStack, it would usually be an `Error` instance.
    if (typeof error === 'object' && error !== null && 'data' in error && typeof error.data === 'object' && error.data !== null) {
        // Check if error.data has a fieldErrors structure from Zod, which might be nested further by ZenStack
        const potentialZodData = error.data as { fieldErrors?: unknown }; // Be more specific if ZenStack's structure is known
        if (potentialZodData.fieldErrors) {
             errorResponseData = potentialZodData; // Pass the whole data part if it contains fieldErrors
        } else {
            // If not fieldErrors, maybe it's a simpler data structure or the top-level error.data is what we want
            errorResponseData = error.data; 
        }
    } else if (result && !result.success) { // If initial Zod validation failed
        errorResponseData = result.error.flatten().fieldErrors;
    }

    throw createError({
      statusCode: statusCode,
      statusMessage: errorMessage,
      data: errorResponseData,
    });
  }
}); 