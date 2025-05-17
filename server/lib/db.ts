import { PrismaClient } from "#shared/generated/prisma/client";
import { Prisma } from "#shared/generated/prisma";
import { enhance } from "@zenstackhq/runtime";
import { auth } from "./auth";
import { type H3Event, getRequestHeaders } from "h3";
import { Headers } from "undici";

const prisma = new PrismaClient();

/**
 * Enhances Prisma Client with ZenStack's runtime and user context from Better Auth.
 * This function should be used in server-side API handlers to get a Prisma client
 * that enforces access policies.
 * 
 * @param event The H3Event from the API handler.
 * @returns An enhanced Prisma Client instance.
 */
export async function getEnhancedPrismaClient(event: H3Event) {
  const rawHeaders = getRequestHeaders(event);
  const requestHeadersInstance = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (value !== undefined) {
        if (Array.isArray(value)) {
            value.forEach(v => requestHeadersInstance.append(key, v));
        } else {
            requestHeadersInstance.append(key, value as string);
        }
    }
  }
  
  // Fetch session using Better Auth's server-side API, passing the Headers object.
  const sessionData = await auth.api.getSession({ headers: requestHeadersInstance });

  const userContext = sessionData?.user || undefined;

  // Explicitly pass prismaModule, casting options to any to bypass TS error for this test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return enhance(prisma, { user: userContext, prismaModule: Prisma } as any);
}

// Optionally, you can export a default prisma instance for parts of the app
// that might not need enhancement or run in a context without an event (e.g., seed scripts)
// Be cautious with this, as it bypasses ZenStack policy checks.
// export const unenhancedPrisma = prisma;

/**
 * Enhance Prisma Client with ZenStack's runtime
 * Use Better Auth session to provide user context to ZenStack
 */