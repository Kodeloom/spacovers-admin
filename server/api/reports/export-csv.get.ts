import { auth } from '~/server/lib/auth';
import { TimezoneService } from '~/utils/timezoneService';
import { validateReportRequest } from '~/utils/reportValidation';
import { logError } from '~/utils/errorHandling';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { reportType, ...filters } = query;

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Authentication required'
      });
    }

    // Validate request parameters
    const validation = validateReportRequest({ reportType, ...filters });
    if (!validation.isValid) {
      const errorMessages = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid request parameters: ${errorMessages}`,
        data: {
          errors: validation.errors,
          suggestions: [
            'Check parameter formats and try again',
            'Ensure date range is valid and not too large',
            'Verify report type is "productivity" or "lead-time"'
          ]
        }
      });
    }

    let csvData: string;
    let filename: string;

    if (reportType === 'productivity') {
      // Get productivity data using the corrected API endpoint
      const productivityResponse = await $fetch('/api/reports/productivity', {
        query: filters,
        headers: event.headers
      });

      if (!productivityResponse.success || !productivityResponse.data) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch productivity data for export'
        });
      }

      // Convert to CSV with corrected field names and calculations
      const headers = [
        'Employee Name',
        'Station',
        'Items Processed', // This now correctly shows unique items processed
        'Total Time (hours)',
        'Average Time per Item (minutes)',
        'Efficiency (items/hour)',
        'Total Labor Cost ($)'
      ];

      const rows = productivityResponse.data.map((row: any) => [
        row.userName || 'Unknown User',
        row.stationName || 'Unknown Station',
        row.itemsProcessed || 0, // Unique items processed (corrected calculation)
        row.totalDuration ? (row.totalDuration / 3600).toFixed(2) : '0.00',
        row.avgDuration ? (row.avgDuration / 60).toFixed(1) : '0.0',
        row.efficiency || 0,
        row.totalCost ? row.totalCost.toFixed(2) : '0.00'
      ]);

      csvData = [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Include date range in filename if available
      const dateRange = productivityResponse.dateRange;
      const dateStr = dateRange?.startDate && dateRange?.endDate 
        ? `${dateRange.startDate.split('T')[0]}_to_${dateRange.endDate.split('T')[0]}`
        : new Date().toISOString().split('T')[0];
      
      filename = `productivity-report-${dateStr}.csv`;

    } else if (reportType === 'lead-time') {
      // Get lead time data using the corrected API endpoint
      const leadTimeResponse = await $fetch('/api/reports/lead-time', {
        query: filters,
        headers: event.headers
      });

      if (!leadTimeResponse.success || !leadTimeResponse.data) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Failed to fetch lead time data for export'
        });
      }

      // Convert to CSV with corrected field names and business day calculations
      const headers = [
        'Order Number',
        'Customer',
        'Order Status',
        'Created Date',
        'Approved Date',
        'Ready Date',
        'Days to Approval', // Business days calculation
        'Days in Production', // Business days calculation with minimum 1 day
        'Total Lead Time (days)', // Business days calculation
        'Total Items',
        'Items Completed',
        'Completion %',
        'Production Time (hours)', // Actual processing time
        'Production Time (business days)', // Business days from processing logs
        'Bottlenecks'
      ];

      const rows = leadTimeResponse.data.map((row: any) => [
        row.orderNumber || 'N/A',
        row.customerName || 'Unknown Customer',
        row.orderStatus ? row.orderStatus.replace(/_/g, ' ') : 'Unknown',
        row.createdAt ? TimezoneService.formatUTCForLocalDisplay(
          new Date(row.createdAt), 
          undefined, 
          { year: 'numeric', month: '2-digit', day: '2-digit' }
        ) : 'N/A',
        row.approvedAt ? TimezoneService.formatUTCForLocalDisplay(
          new Date(row.approvedAt), 
          undefined, 
          { year: 'numeric', month: '2-digit', day: '2-digit' }
        ) : 'N/A',
        row.readyToShipAt ? TimezoneService.formatUTCForLocalDisplay(
          new Date(row.readyToShipAt), 
          undefined, 
          { year: 'numeric', month: '2-digit', day: '2-digit' }
        ) : 'N/A',
        row.daysFromCreationToApproval || 0, // Business days calculation
        row.daysInProduction || 0, // Business days with minimum 1 day rule
        row.totalLeadTimeDays || 0, // Total business days
        row.totalItems || 0,
        row.itemsCompleted || 0,
        row.completionPercentage !== undefined ? `${row.completionPercentage}%` : '0%',
        row.totalProductionTimeHours || 0, // Actual hours from processing logs
        row.totalProductionTimeBusinessDays || 0, // Business days from processing logs
        Array.isArray(row.bottlenecks) ? row.bottlenecks.join(', ') : ''
      ]);

      csvData = [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      // Include date range in filename if available
      const dateRange = leadTimeResponse.dateRange;
      const dateStr = dateRange?.startDate && dateRange?.endDate 
        ? `${dateRange.startDate.split('T')[0]}_to_${dateRange.endDate.split('T')[0]}`
        : new Date().toISOString().split('T')[0];
      
      filename = `lead-time-report-${dateStr}.csv`;

    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid report type. Must be "productivity" or "lead-time"',
        data: {
          validTypes: ['productivity', 'lead-time'],
          suggestions: [
            'Use reportType=productivity for employee productivity reports',
            'Use reportType=lead-time for order lead time reports'
          ]
        }
      });
    }

    // Validate that we have data to export
    if (!csvData || csvData.trim().length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No data available for export with the specified filters',
        data: {
          suggestions: [
            'Try expanding the date range',
            'Remove some filters to include more data',
            'Verify that data exists for the selected criteria'
          ]
        }
      });
    }

    // Set headers for CSV download with proper encoding
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8');
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');

    return csvData;

  } catch (error: any) {
    // Log the error for debugging
    logError(error, 'csv_export_generation', sessionData?.user?.id);
    
    // If it's already a structured error, re-throw it
    if (error.statusCode) {
      throw error;
    }
    
    // Handle specific error types
    if (error.code === 'FETCH_ERROR' || error.message?.includes('fetch')) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to fetch report data for export',
        data: {
          retryable: true,
          suggestions: [
            'Try again in a few moments',
            'Check if the report API is accessible',
            'Reduce the date range if the query is too large'
          ]
        }
      });
    }

    if (error.code === 'P2024' || error.message?.includes('timeout')) {
      throw createError({
        statusCode: 408,
        statusMessage: 'CSV export timed out. Please try with a smaller date range.',
        data: {
          retryable: true,
          suggestions: [
            'Reduce the date range (try 30 days or less)',
            'Add more specific filters to reduce data size',
            'Try again during off-peak hours'
          ]
        }
      });
    }
    
    // Generic server error
    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected error occurred while exporting CSV report',
      data: {
        retryable: true,
        suggestions: [
          'Try again with a smaller date range',
          'Check your internet connection',
          'Contact support if the problem persists'
        ]
      }
    });
  }
});