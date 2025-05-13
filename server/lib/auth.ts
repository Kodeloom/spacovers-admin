import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession } from "better-auth/plugins";
// Using relative path for Prisma Client import for compatibility with external CLIs
import { PrismaClient } from "~/generated/prisma"; 

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    // Specify your database provider type
    provider: "postgresql", 
  }),
  emailAndPassword: {
    enabled: true, // Enable email and password authentication
    // We can add more configurations here later, like:
    // disableSignUp: false,
    // requireEmailVerification: true, // Recommended for production
  },
  plugins: [customSession(async ({ user, session }) => {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        emailVerified: true,
        roles: { // Select UserRole records
          select: {
            role: { // And within each UserRole, select the related Role
              select: {
                name: true // And specifically the name of that Role
              }
            }
          }
        }
      }
    });

    return {
      user: {
        ...user,
        ...dbUser, // dbUser now includes roles structured as [{ role: { name: 'Admin' } }, ...]
      },
      session,
    }
  })],
});
