import { defineEventHandler, readBody, createError } from 'h3';
import { getEnhancedPrismaClient } from '~/server/lib/db'; // Import the correct enhanced client getter
import { auth } from '~/server/lib/auth'; // To access password hashing
import { Prisma } from '@prisma-app/client'; // Import Prisma for error types

// TEMPORARY DEBUGGING: Log the auth object to inspect its structure
// console.log('Inspecting Better Auth object on server:', Object.keys(auth));
// if ((auth as any).plugins) {
//   console.log('Inspecting Better Auth plugins object on server:', Object.keys((auth as any).plugins));
//   if ((auth as any).plugins.admin) {
//     console.log('Inspecting Better Auth auth.plugins.admin object on server:', Object.keys((auth as any).plugins.admin));
//   }
// }
// if ((auth as any).admin) {
//   console.log('Inspecting Better Auth auth.admin object on server:', Object.keys((auth as any).admin));
// }
// END TEMPORARY DEBUGGING

// const prisma = new PrismaClient(); // Remove direct instantiation

// Define a minimal type for the Better Auth server-side API
interface BetterAuthServerAPIUserObject {
  id: string;
  [key: string]: unknown;
}

interface BetterAuthServerAPI {
  createUser: (args: {
    body: {
      name: string;
      email: string;
      password?: string;
      role?: string | string[];
      data?: Record<string, unknown>;
      // emailVerified?: boolean; // emailVerified is usually handled by the auth provider
    }
  }) => Promise<{ user: BetterAuthServerAPIUserObject } | null | undefined>; // Returns user object or null/undefined
}

export default defineEventHandler(async (event) => {
  const enhancedPrisma = await getEnhancedPrismaClient(event); // Get enhanced client

  // Manual admin check removed - assuming ZenStack policy handles this.
  // If not, it can be added back:
  // const requestAuthContext = event.context.auth; // BetterAuth populates this
  // if (!requestAuthContext?.user || !requestAuthContext.user.roles?.some((r: any) => r.role?.name === 'Admin')) {
  //   throw createError({
  //     statusCode: 403,
  //     statusMessage: 'Forbidden: Admin access required.'
  //   });
  // }

  const body = await readBody(event);
  const { name, email, password, status, roleIds } = body;

  // Basic validation
  if (!name || !email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Name, email, and password are required.' });
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password must be at least 8 characters.' });
  }
  if (!status || !['ACTIVE', 'INACTIVE', 'ARCHIVED'].includes(status)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user status.' });
  }
  if (roleIds && !Array.isArray(roleIds)) {
    throw createError({ statusCode: 400, statusMessage: 'roleIds must be an array.' });
  }

  try {
    // Check if user already exists (using enhancedPrisma for policy check)
    const existingUserCheck = await enhancedPrisma.user.findUnique({
      where: { email },
    });
    if (existingUserCheck) {
      throw createError({ statusCode: 409, statusMessage: 'User with this email already exists.' });
    }

    let roleNamesForBetterAuth: string[] = [];
    if (roleIds && roleIds.length > 0) {
      const roles = await enhancedPrisma.role.findMany({
        where: { id: { in: roleIds as string[] } },
        select: { name: true },
      });
      roleNamesForBetterAuth = roles.map(r => r.name);
      if (roleNamesForBetterAuth.length !== roleIds.length) {
        throw createError({ statusCode: 400, statusMessage: 'One or more provided role IDs are invalid (for fetching names).' });
      }
    }

    // Use auth.api for server-side admin actions
    const api = auth.api as unknown as BetterAuthServerAPI; // Cast to our defined type

    if (!api || typeof api.createUser !== 'function') {
      console.error("Better Auth Admin plugin's createUser function is not available on auth.api.createUser");
      throw createError({ statusCode: 500, statusMessage: 'Admin user creation server-side API is not configured correctly.' });
    }

    let apiCallResult: { user: BetterAuthServerAPIUserObject } | null | undefined;
    try {
      apiCallResult = await api.createUser({
        body: {
          name,
          email,
          password,
          role: roleNamesForBetterAuth,
          data: {
            status,
            emailVerified: true,
          }
        }
      });
    } catch (apiError) {
        console.error('Auth API createUser call failed directly:', apiError);
        const errorDetail = apiError instanceof Error ? apiError.message : String(apiError);
        throw createError({ statusCode: 500, statusMessage: `User creation via auth API failed: ${errorDetail}` });
    }

    const createdUserFromAuth = apiCallResult?.user;
    const userIdFromAuth = createdUserFromAuth?.id;

    if (typeof userIdFromAuth !== 'string' || userIdFromAuth === '') {
      console.error('Auth API createUser response missing valid user ID string. Full response:', apiCallResult, 'Extracted user object:', createdUserFromAuth, 'Extracted user ID:', userIdFromAuth);
      throw createError({ statusCode: 500, statusMessage: 'User creation via auth API did not return a valid user ID string.' });
    }

    // Now, create UserRole entries if roleIds were provided
    if (roleIds && roleIds.length > 0) {
      const userRoleData = roleIds.map((roleId: string) => ({
        userId: userIdFromAuth,
        roleId: roleId,
      }));
      
      await enhancedPrisma.userRole.createMany({
        data: userRoleData,
        skipDuplicates: true, // Optional: useful if this operation could be retried
      });
    }

    // Fetch the final user object with all relations, including the newly created UserRole entries
    const finalUser = await enhancedPrisma.user.findUnique({
      where: { id: userIdFromAuth }, 
      select: {
        id: true, name: true, email: true, status: true,
        banned: true,
        emailVerified: true,
        roles: { select: { role: { select: { id: true, name: true } } } } // Fetch roles via UserRole
      }
    });

    return { success: true, user: finalUser };

  } catch (error) {
    console.error('Error creating user in API:', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle ZenStack policy denial (often comes as a Prisma error with specific codes or messages)
      // Note: ZenStack might also throw its own error types in some cases.
      if (error.code === 'P2004' || (error.message && error.message.includes("denied by policy"))) {
        throw createError({
            statusCode: 403,
            statusMessage: 'Operation denied by access policy.'
        });
      }
      // Handle Prisma unique constraint violation for email
      if (error.code === 'P2002' && (error.meta?.target as string[])?.includes('email')) {
        throw createError({ statusCode: 409, statusMessage: 'User with this email already exists.' });
      }
    }
    
    // Check if the error is the specific PostgreSQL protocol error
    // This is a basic check; a more robust check might involve inspecting error.cause or similar
    const errorString = String(error);
    if (errorString.includes("08P01") && errorString.includes("insufficient data left in message")) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Database protocol error: Insufficient data. This might be a type mismatch or connection issue after schema changes. Please ensure the dev server was restarted.'
        });
    }
    
    // Handle errors from the auth.api.createUser if it throws specific types
    // For now, a generic catch and re-throw
    const genericError = error as { data?: { message?: string }, message?: string, statusCode?: number };
    throw createError({
      statusCode: genericError.statusCode || 500,
      statusMessage: genericError.data?.message || genericError.message || 'Could not create user.'
    });
  }
}); 