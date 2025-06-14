import type { H3Event } from 'h3';

declare module '@zenstackhq/runtime' {
    interface EnhancementContext {
        meta?: {
            event?: H3Event;
        };
    }
}

export {}; 