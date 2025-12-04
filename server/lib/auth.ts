import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { customSession, admin } from "better-auth/plugins";
// Using relative path for Prisma Client import for compatibility with external CLIs
import { PrismaClient } from "@prisma-app/client";

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
  session: {
    // Extend session duration to 7 days (in seconds)
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    // Update session expiration on each request to keep active users logged in
    updateAge: 60 * 60 * 24, // Update if session is older than 1 day
  },
  plugins: [
    customSession(async ({ user, session }) => {
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
                  name: true, // And specifically the name of that Role
                  roleType: { // Include the roleType relation
                    select: {
                      id: true,
                      name: true,
                      canUseStations: true,
                    }
                  },
                  permissions: {
                    select: {
                      permission: {
                        select: {
                          action: true,
                          subject: true,
                        }
                      }
                    }
                  }
                },
              }, 
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
    }),
    admin()
  ],
});
