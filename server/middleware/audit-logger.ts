import { unenhancedPrisma } from '~/server/lib/db';
import { recordAuditLog } from '~/server/utils/auditLog';
import { type H3Event, readBody, getQuery } from 'h3';
import { auth } from '~/server/lib/auth';

const AUDITABLE_MODELS = [
    'user', 
    'role', 
    'permission',
    'customer',
    'item',
    'order',
    'orderitem',
    'station',
    'itemprocessinglog'
];

function getModelAndAction(event: H3Event, requestBody: any): { model: string; action: string; id: string | null } | null {
    const path = event.path;
    const parts = path.split('/');
    if (parts.length < 4 || parts[2] !== 'model') {
        return null;
    }
    const model = parts[3].toLowerCase();
    
    if (!AUDITABLE_MODELS.includes(model)) {
        return null;
    }

    let action = 'UNKNOWN';
    let id: string | null = null;
    
    switch (event.method) {
        case 'POST':
            action = 'create';
            break;
        case 'PUT':
            action = 'update';
            if (requestBody?.where?.id) id = requestBody.where.id;
            break;
        case 'DELETE':
            action = 'delete';
            const query = getQuery(event);
            if (typeof query.q === 'string') {
                try {
                    const parsedQuery = JSON.parse(query.q);
                    if (parsedQuery?.where?.id) {
                        id = parsedQuery.where.id;
                    }
                } catch {}
            }
            break;
    }
    
    if (['create', 'update', 'delete'].includes(action)) {
        return { model, action, id };
    }
    return null;
}

export default defineEventHandler(async (event) => {
    const requestBody = (event.method !== 'GET' && event.method !== 'HEAD') ? await readBody(event).catch(() => undefined) : undefined;
    
    if(requestBody) {
        (event.context as any)._body = requestBody;
    }

    // Capture response body to get created entity ID
    const originalEnd = event.node.res.end;
    let responseBodyChunk: any;
    event.node.res.end = function (chunk: any) {
        if (chunk) {
            responseBodyChunk = chunk;
        }
        return originalEnd.apply(this, arguments as any);
    };

    const modelAndAction = getModelAndAction(event, requestBody);
    if (!modelAndAction) {
        return; // Not an auditable CUD operation
    }

    const { model, action, id } = modelAndAction;

    // For update/delete, we MUST fetch the old value BEFORE the handler runs to avoid a race condition.
    if ((action === 'update' || action === 'delete') && id) {
        let include;
        if (model === 'role') {
            include = { permissions: { include: { permission: true } } };
        } else if (model === 'user') {
            include = { roles: { include: { role: true } } };
        }

        try {
            // Awaiting here is crucial to prevent the race condition.
            const oldValue = await (unenhancedPrisma as any)[model].findUnique({ where: { id }, include });
            (event.context as any).oldValue = oldValue;
        } catch(e) {
            console.error(`[AUDIT] Failed to fetch old value for ${model}#${id}`, e);
            (event.context as any).oldValue = null;
        }
    }

    event.node.res.on('finish', async () => {
        if (event.node.res.statusCode >= 300) {
            return;
        }

        if (responseBodyChunk) {
            try {
                (event.context as any)._responseBody = JSON.parse(responseBodyChunk.toString());
            } catch (e) {
                // Ignore parsing errors for non-json responses
            }
        }

        try {
            const prismaModel = (unenhancedPrisma as any)[model];
            if (!prismaModel) return;

            const sessionData = await auth.api.getSession({ headers: event.headers });
            const actor = sessionData?.user || null;

            let oldValue: any = null;
            let newValue: any = null;
            let entityId: string | null = id;

            // The old value was already fetched and stored on the context.
            if ((action === 'update' || action === 'delete')) {
                oldValue = (event.context as any).oldValue;
            }

            if (action === 'update' && entityId) {
                newValue = await prismaModel.findUnique({ where: { id: entityId } });
            } else if (action === 'create' && requestBody) {
                const responseBody = (event.context as any)._responseBody;
                if (responseBody?.data?.id) {
                    entityId = responseBody.data.id;
                    newValue = responseBody.data;
                } else {
                    // Fallback for when the response body isn't in the expected shape
                    const whereClause: { [key: string]: any } = {};
                    const createData = requestBody.data || requestBody;
                    for (const key in createData) {
                        if (typeof createData[key] !== 'object' || createData[key] === null) {
                            whereClause[key] = createData[key];
                        }
                    }
                    if (Object.keys(whereClause).length > 0) {
                        newValue = await prismaModel.findFirst({
                            where: whereClause,
                            orderBy: { createdAt: 'desc' },
                        });
                        entityId = newValue?.id;
                    }
                }
            } else if (action === 'delete') {
                newValue = null;
                if (oldValue) entityId = oldValue.id;
            }

            if (!entityId) {
                return;
            }
            
            await recordAuditLog(
                event,
                {
                    action: `${model.toUpperCase()}_${action.toUpperCase()}`,
                    entityName: model.charAt(0).toUpperCase() + model.slice(1),
                    entityId: entityId,
                    oldValue: oldValue,
                    newValue: newValue,
                },
                actor?.id || null
            );
        } catch (error) {
            console.error('[AUDIT] Error in audit logger finish event:', error);
        }
    });
}); 