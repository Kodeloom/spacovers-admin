import { createEventHandler } from '@zenstackhq/server/nuxt';
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
import type { H3Event } from 'h3';
import { z } from 'zod';
import { recordAuditLog } from '~/server/utils/auditLog';
import { auth } from '~/server/lib/auth';

const CreateRoleInputSchema = z.object({
    name: z.string().min(1, 'Role name is required.'),
    description: z.string().nullable(),
    permissionIds: z.array(z.string().cuid2({ message: 'Invalid permission ID format.' })).optional(),
});

const UpdateRoleInputSchema = z.object({
  name: z.string().min(1, 'Role name is required.'),
  description: z.string().nullable(),
  permissionIds: z.array(z.string().cuid2({ message: 'Invalid permission ID format.' })).optional(),
});

const CreateStationInputSchema = z.object({
    name: z.string().min(1, 'Station name is required.'),
    barcode: z.string().nullable(),
    description: z.string().nullable(),
    roleIds: z.array(z.string().cuid2({ message: 'Invalid role ID format.' })).optional(),
});

const UpdateStationInputSchema = z.object({
  name: z.string().min(1, 'Station name is required.'),
  barcode: z.string().nullable(),
  description: z.string().nullable(),
  roleIds: z.array(z.string().cuid2({ message: 'Invalid role ID format.' })).optional(),
});

const defaultHandler = createEventHandler({
    getPrisma: getEnhancedPrismaClient,
});

export default defineEventHandler(async (event: H3Event) => {
    const path = event.path;
    const parts = path.split('/');
    console.log('🔍 API Debug - Path:', path, 'Parts:', parts);
    
    // Fix: The path structure is /api/model/Station, so parts[3] should be the model
    const model = (parts.length >= 4 && parts[2] === 'model') ? parts[3] : null;
    console.log('🔍 API Debug - Model:', model, 'Method:', event.method);
    
    // Special handling for Role updates to manage many-to-many with permissions
    if (model?.toLowerCase() === 'role' && event.method === 'PUT') {
        const roleId = parts.length > 4 ? parts[4] : null;
        if (!roleId) {
            throw createError({ statusCode: 400, statusMessage: 'Role ID is required for update.' });
        }

        const result = await readValidatedBody(event, (body: any) => UpdateRoleInputSchema.safeParse(body.data));
        if (!result.success) {
            throw createError({ statusCode: 422, statusMessage: 'Validation failed.', data: result.error.flatten().fieldErrors });
        }
        
        const { name, description, permissionIds } = result.data;
        
        try {
            const sessionData = await auth.api.getSession({ headers: event.headers });
            const actorId = sessionData?.user?.id || null;

            const oldValue = await unenhancedPrisma.role.findUnique({
                where: { id: roleId },
                include: { permissions: { include: { permission: true } } },
            });

            await unenhancedPrisma.$transaction(async (tx) => {
                await tx.role.update({
                    where: { id: roleId },
                    data: { name, description },
                });
                await tx.rolePermission.deleteMany({
                    where: { roleId: roleId },
                });
                if (permissionIds && permissionIds.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissionIds.map(pId => ({ roleId: roleId, permissionId: pId })),
                    });
                }
            });

            const enhancedPrisma = await getEnhancedPrismaClient(event);
            const updatedRole = await enhancedPrisma.role.findUniqueOrThrow({
                where: { id: roleId },
                include: { permissions: { include: { permission: true } } },
            });

            await recordAuditLog(event, {
                action: 'ROLE_UPDATE',
                entityName: 'Role',
                entityId: roleId,
                oldValue,
                newValue: updatedRole,
            }, actorId);
            
            // Mimic the structure of a standard ZenStack response
            return { data: updatedRole };

        } catch (error) {
            console.error(`Error during special role update for role ${roleId}:`, error);
            throw createError({ statusCode: 500, statusMessage: 'Failed to update role.'});
        }
    }

    if (model?.toLowerCase() === 'role' && event.method === 'POST') {
        const result = await readValidatedBody(event, (body: any) => CreateRoleInputSchema.safeParse(body.data));
        if (!result.success) {
            throw createError({ statusCode: 422, statusMessage: 'Validation failed.', data: result.error.flatten().fieldErrors });
        }

        const { name, description, permissionIds } = result.data;

        try {
            const sessionData = await auth.api.getSession({ headers: event.headers });
            const actorId = sessionData?.user?.id || null;

            const newRole = await unenhancedPrisma.role.create({
                data: {
                    name,
                    description,
                    permissions: {
                        create: permissionIds?.map(pId => ({
                            permission: { connect: { id: pId } },
                        })),
                    },
                },
                include: { permissions: { include: { permission: true } } },
            });

            await recordAuditLog(event, {
                action: 'ROLE_CREATE',
                entityName: 'Role',
                entityId: newRole.id,
                oldValue: null,
                newValue: newRole,
            }, actorId);

            const enhancedPrisma = await getEnhancedPrismaClient(event);
            const createdRole = await enhancedPrisma.role.findUniqueOrThrow({
                where: { id: newRole.id },
                include: { permissions: { include: { permission: true } } },
            });

            // Mimic the structure of a standard ZenStack response
            return { data: createdRole };

        } catch (error) {
            console.error(`Error during special role creation:`, error);
            throw createError({ statusCode: 500, statusMessage: 'Failed to create role.'});
        }
    }

    // Special handling for Station creation to manage many-to-many with roles
    if (model?.toLowerCase() === 'station' && event.method === 'POST') {
        const result = await readValidatedBody(event, (body: any) => CreateStationInputSchema.safeParse(body.data));
        if (!result.success) {
            throw createError({ statusCode: 422, statusMessage: 'Validation failed.', data: result.error.flatten().fieldErrors });
        }

        const { name, barcode, description, roleIds } = result.data;

        try {
            const sessionData = await auth.api.getSession({ headers: event.headers });
            const actorId = sessionData?.user?.id || null;

            const newStation = await unenhancedPrisma.station.create({
                data: {
                    name,
                    barcode,
                    description,
                    roles: {
                        create: roleIds?.map(roleId => ({
                            role: { connect: { id: roleId } },
                        })),
                    },
                },
                include: { roles: { include: { role: true } } },
            });

            await recordAuditLog(event, {
                action: 'STATION_CREATE',
                entityName: 'Station',
                entityId: newStation.id,
                oldValue: null,
                newValue: newStation,
            }, actorId);

            const enhancedPrisma = await getEnhancedPrismaClient(event);
            const createdStation = await enhancedPrisma.station.findUniqueOrThrow({
                where: { id: newStation.id },
                include: { roles: { include: { role: true } } },
            });

            // Mimic the structure of a standard ZenStack response
            return { data: createdStation };

        } catch (error) {
            console.error(`Error during special station creation:`, error);
            throw createError({ statusCode: 500, statusMessage: 'Failed to create station.'});
        }
    }

    // For all other requests, use the default ZenStack handler
    if (model) {
        console.log('🔍 API Debug - Using default handler for model:', model);
        return defaultHandler(event);
    } else {
        console.log('🔍 API Debug - No model found, path:', path);
        throw createError({ 
            statusCode: 400, 
            statusMessage: `Invalid request path: ${path}. Expected format: /api/model/{ModelName}` 
        });
    }
}); 