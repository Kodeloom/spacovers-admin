import { auth } from '~/server/lib/auth';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const { reportType, ...filters } = query;

    // Get the current user session
    const sessionData = await auth.api.getSession({ headers: event.headers });
    if (!sessionData?.user?.id) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized'
      });
    }

    let csvData: string;
    let filename: string;

    if (reportType === 'productivity') {
      // Get productivity data
      const productivityResponse = await $fetch('/api/reports/productivity', {
        query: filters,
        headers: event.headers
      });

      // Convert to CSV
      const headers = [
        'Employee Name',
        'Station',
        'Items Processed',
        'Total Time (hours)',
        'Average Time per Item (minutes)',
        'Efficiency (items/hour)',
        'Total Labor Cost ($)'
      ];

      const rows = productivityResponse.data.map((row: any) => [
        row.userName,
        row.stationName,
        row.itemsProcessed,
        (row.totalDuration / 3600).toFixed(2),
        (row.avgDuration / 60).toFixed(1),
        row.efficiency,
        row.totalCost.toFixed(2)
      ]);

      csvData = [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      filename = `productivity-report-${new Date().toISOString().split('T')[0]}.csv`;

    } else if (reportType === 'lead-time') {
      // Get lead time data
      const leadTimeResponse = await $fetch('/api/reports/lead-time', {
        query: filters,
        headers: event.headers
      });

      // Convert to CSV
      const headers = [
        'Order Number',
        'Customer',
        'Order Status',
        'Created Date',
        'Approved Date',
        'Ready Date',
        'Days to Approval',
        'Days in Production',
        'Total Lead Time (days)',
        'Total Items',
        'Items Completed',
        'Completion %',
        'Production Time (hours)',
        'Bottlenecks'
      ];

      const rows = leadTimeResponse.data.map((row: any) => [
        row.orderNumber,
        row.customerName,
        row.orderStatus.replace(/_/g, ' '),
        new Date(row.createdAt).toLocaleDateString(),
        row.approvedAt ? new Date(row.approvedAt).toLocaleDateString() : 'N/A',
        row.readyToShipAt ? new Date(row.readyToShipAt).toLocaleDateString() : 'N/A',
        row.daysFromCreationToApproval,
        row.daysInProduction,
        row.totalLeadTimeDays,
        row.totalItems,
        row.itemsCompleted,
        row.completionPercentage + '%',
        row.totalProductionTimeHours,
        row.bottlenecks.join(', ')
      ]);

      csvData = [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');

      filename = `lead-time-report-${new Date().toISOString().split('T')[0]}.csv`;

    } else {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid report type. Must be "productivity" or "lead-time"'
      });
    }

    // Set headers for CSV download
    setHeader(event, 'Content-Type', 'text/csv');
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`);

    return csvData;

  } catch (error) {
    console.error('Error exporting CSV:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Error exporting CSV report'
    });
  }
});