import { PrismaClient } from '#shared/generated/prisma/client'; // Use Nuxt alias for server routes
import { auth } from '~/server/lib/auth';
import { defineEventHandler, readBody, createError } from 'h3';

const prisma = new PrismaClient();
const PLACEHOLDER_HASH = 'SEED_PLACEHOLDER_NEEDS_RESET_VIA_BETTER_AUTH_FLOW';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, password: newPassword } = body; // Renamed for clarity within this scope

  // Basic validation
  if (!email || typeof email !== 'string' || !newPassword || typeof newPassword !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Email and password are required.',
    });
  }
  if (newPassword.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Password must be at least 8 characters long.',
    });
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found.' });
  }
  if (user.passwordHash !== PLACEHOLDER_HASH) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden: Initial password already set or user cannot be set up this way.',
    });
  }

  try {
    const ctx = await auth.$context; // Get Better-Auth context
    const hashedPassword = await ctx.password.hash(newPassword); // Hash the new password
    
    // Update password using the internal adapter
    await ctx.internalAdapter.updatePassword(user.id, hashedPassword);

    console.log(`Admin password securely set for user: ${email} via Better-Auth internal adapter.`);
    return { success: true, message: 'Admin password set successfully.' };

  } catch (error: any) {
    console.error('Error setting initial admin password via Better-Auth:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error setting password via Better-Auth.',
    });
  }
}); 