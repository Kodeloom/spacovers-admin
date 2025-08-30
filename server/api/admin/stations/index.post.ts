import { unenhancedPrisma } from '~/server/lib/db';
import { auth } from '~/server/lib/auth';
import { recordAuditLog } from '~/server/utils/auditLog';

export default defineEventHandler(async (event) => {
  try {
    // Check authentication
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    const body = await readBody(event);
    const { name, barcode, description, roleIds } = body;

    if (!name) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Station name is required'
      });
    }

    // Create the station
    const newStation = await unenhancedPrisma.station.create({
      data: {
        name,
        barcode: barcode || null,
        description: description || null,
      }
    });

    // Create role associations if roleIds are provided
    if (roleIds && roleIds.length > 0) {
      await unenhancedPrisma.roleStation.createMany({
        data: roleIds.map((roleId: string) => ({
          roleId,
          stationId: newStation.id
        }))
      });
    }

    // Fetch the created station with role associations
    const stationWithRoles = await unenhancedPrisma.station.findUnique({
      where: { id: newStation.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Log the creation
    await recordAuditLog(event, {
      action: 'STATION_CREATE',
      entityName: 'Station',
      entityId: newStation.id,
      oldValue: null,
      newValue: stationWithRoles,
    }, sessionData.user.id);

    return { data: stationWithRoles };

  } catch (error) {
    console.error('Error creating station:', error);
    
    if (error.code === 'P2002') {
      throw createError({
        statusCode: 409,
        statusMessage: 'A station with this name already exists'
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create station'
    });
  }
});
