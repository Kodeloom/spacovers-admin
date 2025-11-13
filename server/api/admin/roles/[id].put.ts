import { defineEventHandler, getRouterParam } from 'h3';
import { Prisma } from '@prisma-app/client';
import { getEnhancedPrismaClient, unenhancedPrisma } from '~/server/lib/db';
import { z } from 'zod';
import { recordAuditLog } from '~/server/utils/auditLog';
import { auth } from '~/server/lib/auth';

const UpdateRoleInputSchema = z.object({
    name: z.string().min(1, 'Role name is required.'),
    description: z.string().nullable().optional(),
    roleTypeId: z.string().cuid2({ message: 'Invalid role type ID format.' }).nullable().optional(),
    permissionIds: z.array(z.string()),
});

export default defineEventHandler(async (event) => {
    const roleId = getRouterParam(event, 'id');
    if (!roleId) {
        throw createError({ statusCode: 400, statusMessage: 'Role ID is required.' });
    }

    const result = await readValidatedBody(event, body => UpdateRoleInputSchema.safeParse(body));
    if (!result.success) {
        throw createError({
            statusCode: 422,
            statusMessage: 'Validation failed.',
            data: result.error.flatten().fieldErrors,
        });
    }

    const { name, description, roleTypeId, permissionIds } = result.data;
    const prisma = await getEnhancedPrismaClient(event);

    try {
        const oldValue = await unenhancedPrisma.role.findUnique({
            where: { id: roleId },
            include: { permissions: { include: { permission: true } } },
        });

        const updatedRole = await prisma.$transaction(async (tx) => {
            // Update role name, description, and roleTypeId
            const role = await tx.role.update({
                where: { id: roleId },
                data: { 
                    name, 
                    description,
                    roleTypeId: roleTypeId || null,
                },
            });

            // Sync permissions
            await tx.rolePermission.deleteMany({
                where: { roleId: roleId },
            });

            if (permissionIds && permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map(permissionId => ({
                        roleId: roleId,
                        permissionId: permissionId,
                    })),
                });
            }

            return role;
        });
        
        const sessionData = await auth.api.getSession({ headers: event.headers });
        const actorId = sessionData?.user?.id || null;
        
        const newValue = await unenhancedPrisma.role.findUnique({
            where: { id: roleId },
            include: { permissions: { include: { permission: true } } },
        });

        await recordAuditLog(event, {
            action: 'ROLE_UPDATE',
            entityName: 'Role',
            entityId: roleId,
            oldValue,
            newValue,
        }, actorId);

        return { success: true, role: updatedRole };

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw createError({
                statusCode: 409,
                statusMessage: 'A role with this name already exists.',
            });
        }
        console.error('Error updating role:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'An unexpected error occurred.',
        });
    }
}); 