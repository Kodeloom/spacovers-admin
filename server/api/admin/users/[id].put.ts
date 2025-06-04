import { defineEventHandler, readBody, createError, getRouterParam } from 'h3';
import { Prisma } from '@prisma-app/client';
import { getEnhancedPrismaClient } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  const enhancedPrisma = await getEnhancedPrismaClient(event);

  const userId = getRouterParam(event, 'id');
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'User ID is required.' });
  }

  const body = await readBody(event);
  const { name, email, password, status, roleIds } = body;

  // Basic validation
  if (!name || !email || !status) {
    throw createError({ statusCode: 400, statusMessage: 'Name, email, and status are required.' });
  }
  if (password && password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'New password must be at least 8 characters.' });
  }
  if (!['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user status.' });
  }
  if (roleIds && !Array.isArray(roleIds)) {
    throw createError({ statusCode: 400, statusMessage: 'roleIds must be an array.' });
  }

  try {
    const updatedUser = await enhancedPrisma.$transaction(async (prismaTx) => {
      // 1. Check if user exists (using transaction client)
      const existingUser = await prismaTx.user.findUnique({
        where: { id: userId },
      });
      if (!existingUser) {
        throw createError({ statusCode: 404, statusMessage: 'User not found.' });
      }

      // 2. Check if email is being changed to one that already exists for another user
      if (email && email !== existingUser.email) {
        const otherUserWithEmail = await prismaTx.user.findUnique({
          where: { email },
        });
        if (otherUserWithEmail) {
          throw createError({ statusCode: 409, statusMessage: 'Another user with this email already exists.' });
        }
      }

      // 3. Prepare user scalar data for update
      const userUpdateData: Prisma.UserUpdateInput = {
        name,
        email,
        status,
      };

      if (password) {
        const betterAuthCtx = await auth.$context;
        userUpdateData.passwordHash = await betterAuthCtx.password.hash(password);
        // Note: If Better Auth manages its own `Account` table for passwords,
        // this direct passwordHash update might be insufficient or conflict.
        // The auth.api.updateUser() or similar might be needed if BA has its own password update flow.
        // For now, assuming passwordHash is directly on User and managed this way for custom updates.
      }

      // 4. Update scalar fields of the user
      await prismaTx.user.update({
        where: { id: userId },
        data: userUpdateData,
      });

      // 5. Manage roles: Delete existing and create new ones
      if (roleIds) { // Only proceed if roleIds are provided (even if empty array)
        // Delete all existing UserRole entries for this user
        await prismaTx.userRole.deleteMany({
          where: { userId: userId },
        });

        // Create new UserRole entries if roleIds is not empty
        if (roleIds.length > 0) {
          await prismaTx.userRole.createMany({
            data: roleIds.map((roleId: string) => ({ userId, roleId })),
          });
        }
      } // If roleIds is undefined, roles are not being changed, so do nothing.

      // 6. Fetch the updated user with roles for the response
      return prismaTx.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, status: true,
          roles: { select: { role: { select: { name: true } } } }
        }
      });
    });

    if (!updatedUser) {
        // This should not happen if the transaction succeeded and user was found
        throw createError({ statusCode: 500, statusMessage: 'Failed to retrieve updated user after transaction.' });
    }

    return { success: true, user: updatedUser };

  } catch (error) {
    const apiError = error as { data?: { message?: string }, message?: string, statusCode?: number, code?: string };
    console.error('Error updating user in API:', error); // Log the original error

    // Check if it's a Prisma known request error for unique constraint violation
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      // This could still happen if the email check somehow misses a race condition,
      // or if other unique constraints are violated.
      // The `target` field in error.meta might indicate which fields caused it.
      const target = (error.meta?.target as string[])?.join(', ') || 'fields';
      throw createError({
        statusCode: 409,
        statusMessage: `Unique constraint failed on ${target}.`
      });
    }

    // Handle ZenStack policy denial error (example)
    if (apiError.code === 'P2004' || (apiError.message && apiError.message.includes("denied by policy"))) {
        throw createError({
            statusCode: 403, // Forbidden
            statusMessage: 'Operation denied by access policy.'
        });
    }

    if (apiError.code === 'P2025') { // Prisma error code for record not found (e.g., if roleId is invalid during createMany)
        throw createError({ statusCode: 400, statusMessage: 'Invalid role ID provided or related record not found.'});
    }
    // Rethrow other errors or use the existing generic error handler
    throw createError({
      statusCode: apiError.statusCode || 500,
      statusMessage: apiError.data?.message || apiError.message || 'Could not update user.'
    });
  }
}); 