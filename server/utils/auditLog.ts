import type { Prisma } from '@prisma-app/client';
import { PrismaClient } from '@prisma-app/client';
import type { H3Event } from 'h3';
import { getRequestIP } from 'h3';
// Placeholder for actual session retrieval logic.
// You will need to replace this with your actual implementation,
// possibly using getServerSession from better-auth-nuxt or a similar Nuxt auth utility.
// Example: import { getServerSession } from '#auth'; // Or the specific path for better-auth-nuxt

const prisma = new PrismaClient();

export interface AuditLogDetail {
    action: string; // e.g., USER_CREATE, ROLE_UPDATE, USER_LOGIN
    entityName?: string; // e.g., User, Role
    entityId?: string; // ID of the affected entity
    oldValue?: unknown; // Changed from any to unknown for broader input, will be sanitized by safeJsonParse
    newValue?: unknown; // Changed from any to unknown
}

// Returning primitive null for null inputs.
// The field type in Prisma.AuditLogCreateInput for oldValue/newValue is typically:
// Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined
// where Prisma.InputJsonValue itself can be null.
function safeJsonParse(value: unknown): Prisma.JsonValue | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (e) {
        console.error("Failed to serialize value for audit log:", e);
        return { error: "Failed to serialize to JSON", originalValue: String(value) };
    }
}

export async function recordAuditLog(
    event: H3Event,
    logDetail: AuditLogDetail,
    actorId: string | null // Changed from explicitUserId to actorId for clarity
): Promise<void> {
    try {
        const ipAddress = getRequestIP(event, { xForwardedFor: true }) ?? null;
        
        const dataToCreate: Prisma.AuditLogCreateInput = {
            action: logDetail.action,
            entityName: logDetail.entityName,
            entityId: logDetail.entityId,
            ipAddress: ipAddress,
            oldValue: safeJsonParse(logDetail.oldValue) as any,
            newValue: safeJsonParse(logDetail.newValue) as any,
            ...(actorId ? { user: { connect: { id: actorId } } } : {}),
        };
        
        await prisma.auditLog.create({ data: dataToCreate });

        console.log(`Audit log recorded: Action="${logDetail.action}", UserID="${actorId ?? 'N/A'}", Entity="${logDetail.entityName ?? 'N/A'}:${logDetail.entityId ?? 'N/A'}"`);

    } catch (error) {
        console.error('Failed to create audit log entry:', {
            errorMessage: (error as Error).message,
            logDetail,
            actorId,
            stack: (error as Error).stack,
        });
        // Depending on your error handling policy, you might want to re-throw the error
        // or handle it silently so it doesn't break the main operation.
        // For now, it logs the error and continues.
    }
}

// Example of how oldValue and newValue might be captured and used (conceptual):
//
// For an update operation:
// const entityIdToUpdate = 'some-id';
// const updatePayload = { name: 'new name' };
// const oldValue = await prisma.user.findUnique({ where: { id: entityIdToUpdate } });
// const newValue = await prisma.user.update({ where: { id: entityIdToUpdate }, data: updatePayload });
// await recordAuditLog(event, {
//   action: 'USER_UPDATE',
//   entityName: 'User',
//   entityId: newValue.id,
//   oldValue: oldValue,
//   newValue: newValue, // Or more accurately, the state *after* update which is `newValue` here
// }, actorUserId);
//
// For a create operation:
// const createPayload = { email: 'test@example.com', name: 'Test User' };
// const newValue = await prisma.user.create({ data: createPayload });
// await recordAuditLog(event, {
//   action: 'USER_CREATE',
//   entityName: 'User',
//   entityId: newValue.id,
//   newValue: newValue,
// }, actorUserId);
//
// For a delete operation:
// const entityIdToDelete = 'some-id';
// const oldValue = await prisma.user.findUnique({ where: { id: entityIdToDelete } });
// if (oldValue) {
//   await prisma.user.delete({ where: { id: entityIdToDelete } });
//   await recordAuditLog(event, {
//     action: 'USER_DELETE',
//     entityName: 'User',
//     entityId: oldValue.id, // ID from the record before deletion
//     oldValue: oldValue,
//   }, actorUserId);
// } 