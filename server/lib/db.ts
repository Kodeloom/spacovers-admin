import { PrismaClient } from "@prisma-app/client";
import { enhance } from "@zenstackhq/runtime";
import { auth } from "./auth";
import { type H3Event, getRequestHeaders } from "h3";

const prisma = new PrismaClient();

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
    const sessionData = await auth.api.getSession({ headers: requestHeadersInstance });
    const userContext = sessionData?.user || undefined;

    return enhance(prisma, { user: userContext as any });
}

export const unenhancedPrisma = prisma;