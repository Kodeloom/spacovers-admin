import { createEventHandler } from '@zenstackhq/server/nuxt';
import { getEnhancedPrismaClient } from '~/server/lib/db'; // Our existing function
import type { H3Event } from 'h3'; // Import H3Event type

export default createEventHandler({
    getPrisma: async (event: H3Event) => {
        // getEnhancedPrismaClient already fetches the session using Better Auth
        // and returns an enhanced Prisma client.
        return getEnhancedPrismaClient(event);
    },
    // Note: By default, this makes your models available at /api/model/:modelName
    // e.g., /api/model/role, /api/model/user
}); 