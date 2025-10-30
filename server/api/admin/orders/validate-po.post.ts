import { z } from 'zod';
import { validatePONumber } from '~/server/utils/poValidationService';
import { auth } from '~/server/lib/auth';

const ValidatePOSchema = z.object({
  customerId: z.string().cuid2('Invalid customer ID format'),
  poNumber: z.string().min(1, 'PO number is required'),
  excludeOrderId: z.string().cuid2().optional(),
  excludeOrderItemId: z.string().cuid2().optional()
});

export default defineEventHandler(async (event) => {
  try {
    // Authentication check
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
    }

    // Authorization check - only office employees, admins, and super admins can validate PO numbers
    const userRoles = sessionData.user.roles?.map(r => r.role.name) || [];
    const allowedRoles = ['Super Admin', 'Admin', 'Office Employee'];
    
    if (!userRoles.some(role => allowedRoles.includes(role))) {
      throw createError({
        statusCode: 403,
        statusMessage: 'Insufficient permissions to validate PO numbers'
      });
    }

    // Parse and validate request body
    const body = await readBody(event);
    const result = ValidatePOSchema.safeParse(body);

    if (!result.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: result.error.issues
      });
    }

    const { customerId, poNumber, excludeOrderId, excludeOrderItemId } = result.data;

    // Validate the PO number
    const validationResult = await validatePONumber(
      customerId,
      poNumber,
      excludeOrderId,
      excludeOrderItemId
    );

    return {
      success: true,
      data: validationResult
    };

  } catch (error) {
    console.error('PO validation error:', error);
    
    // If it's already a createError, re-throw it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Otherwise, create a generic error
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to validate PO number'
    });
  }
});