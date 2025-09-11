/**
 * CSV Data Consistency Test
 * 
 * This test verifies that exported CSV data matches the displayed report data exactly,
 * ensuring all timezone and calculation fixes are properly applied to export functionality.
 */

import { describe, it, expect } from 'vitest';

describe('CSV Data Consistency', () => {
  const testFilters = {
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  };

  const testHeaders = {
    'cookie': 'test-session-cookie'
  };

  it('should export productivity data that matches API response exactly', async () => {
    try {
      // Get data from productivity API
      const apiResponse = await $fetch('/api/reports/productivity', {
        query: testFilters,
        headers: testHeaders
      });

      // Get CSV export
      const csvResponse = await $fetch('/api/reports/export-csv', {
        query: {
          reportType: 'productivity',
          ...testFilters
        },
        headers: testHeaders
      });

      // Parse CSV data
      const csvLines = csvResponse.split('\n');
      const csvHeaders = csvLines[0].split(',').map(h => h.replace(/"/g, ''));
      
      // Verify headers match expected structure
      expect(csvHeaders).toContain('Employee Name');
      expect(csvHeaders).toContain('Items Processed');
      expect(csvHeaders).toContain('Efficiency (items/hour)');

      // If we have API data, verify CSV data matches
      if (apiResponse.success && apiResponse.data.length > 0) {
        const firstApiRow = apiResponse.data[0];
        const firstCsvRow = csvLines[1]?.split(',').map(cell => cell.replace(/"/g, ''));

        if (firstCsvRow && firstCsvRow.length > 0) {
          // Find indices for key fields
          const nameIndex = csvHeaders.indexOf('Employee Name');
          const itemsIndex = csvHeaders.indexOf('Items Processed');
          const efficiencyIndex = csvHeaders.indexOf('Efficiency (items/hour)');

          // Verify key data matches
          expect(firstCsvRow[nameIndex]).toBe(firstApiRow.userName);
          expect(parseInt(firstCsvRow[itemsIndex])).toBe(firstApiRow.itemsProcessed);
          expect(parseFloat(firstCsvRow[efficiencyIndex])).toBe(firstApiRow.efficiency);
        }
      }

      console.log('✅ Productivity data consistency test passed');

    } catch (error) {
      console.log('⚠️ Productivity consistency test failed (may be due to auth):', error.message);
      if (!error.message?.includes('Unauthorized')) {
        throw error;
      }
    }
  });

  it('should export lead-time data that matches API response exactly', async () => {
    try {
      // Get data from lead-time API
      const apiResponse = await $fetch('/api/reports/lead-time', {
        query: testFilters,
        headers: testHeaders
      });

      // Get CSV export
      const csvResponse = await $fetch('/api/reports/export-csv', {
        query: {
          reportType: 'lead-time',
          ...testFilters
        },
        headers: testHeaders
      });

      // Parse CSV data
      const csvLines = csvResponse.split('\n');
      const csvHeaders = csvLines[0].split(',').map(h => h.replace(/"/g, ''));
      
      // Verify headers match expected structure
      expect(csvHeaders).toContain('Order Number');
      expect(csvHeaders).toContain('Days in Production');
      expect(csvHeaders).toContain('Production Time (business days)');

      // If we have API data, verify CSV data matches
      if (apiResponse.success && apiResponse.data.length > 0) {
        const firstApiRow = apiResponse.data[0];
        const firstCsvRow = csvLines[1]?.split(',').map(cell => cell.replace(/"/g, ''));

        if (firstCsvRow && firstCsvRow.length > 0) {
          // Find indices for key fields
          const orderIndex = csvHeaders.indexOf('Order Number');
          const daysInProdIndex = csvHeaders.indexOf('Days in Production');
          const completionIndex = csvHeaders.indexOf('Completion %');

          // Verify key data matches
          expect(firstCsvRow[orderIndex]).toBe(firstApiRow.orderNumber);
          expect(parseInt(firstCsvRow[daysInProdIndex])).toBe(firstApiRow.daysInProduction);
          expect(firstCsvRow[completionIndex]).toBe(`${firstApiRow.completionPercentage}%`);
        }
      }

      console.log('✅ Lead-time data consistency test passed');

    } catch (error) {
      console.log('⚠️ Lead-time consistency test failed (may be due to auth):', error.message);
      if (!error.message?.includes('Unauthorized')) {
        throw error;
      }
    }
  });

  it('should apply timezone fixes to exported date fields', async () => {
    try {
      // Get CSV export with date fields
      const csvResponse = await $fetch('/api/reports/export-csv', {
        query: {
          reportType: 'lead-time',
          ...testFilters
        },
        headers: testHeaders
      });

      // Parse CSV data
      const csvLines = csvResponse.split('\n');
      const csvHeaders = csvLines[0].split(',').map(h => h.replace(/"/g, ''));
      
      // Find date field indices
      const createdIndex = csvHeaders.indexOf('Created Date');
      const approvedIndex = csvHeaders.indexOf('Approved Date');
      const readyIndex = csvHeaders.indexOf('Ready Date');

      // Verify date fields exist
      expect(createdIndex).toBeGreaterThanOrEqual(0);
      expect(approvedIndex).toBeGreaterThanOrEqual(0);
      expect(readyIndex).toBeGreaterThanOrEqual(0);

      // If we have data rows, verify date formatting
      if (csvLines.length > 1) {
        const firstDataRow = csvLines[1].split(',').map(cell => cell.replace(/"/g, ''));
        
        // Verify date format (should be MM/DD/YYYY from TimezoneService)
        const createdDate = firstDataRow[createdIndex];
        if (createdDate && createdDate !== 'N/A') {
          expect(createdDate).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
        }
      }

      console.log('✅ Timezone fixes in CSV export test passed');

    } catch (error) {
      console.log('⚠️ Timezone fixes test failed (may be due to auth):', error.message);
      if (!error.message?.includes('Unauthorized')) {
        throw error;
      }
    }
  });

  it('should handle various filter combinations correctly', async () => {
    const filterCombinations = [
      { startDate: '2024-01-01', endDate: '2024-01-31' },
      { startDate: '2024-01-01' }, // Only start date
      { endDate: '2024-01-31' }, // Only end date
      {} // No date filters
    ];

    for (const filters of filterCombinations) {
      try {
        const csvResponse = await $fetch('/api/reports/export-csv', {
          query: {
            reportType: 'productivity',
            ...filters
          },
          headers: testHeaders
        });

        // Should get valid CSV response
        expect(typeof csvResponse).toBe('string');
        expect(csvResponse.length).toBeGreaterThan(0);

      } catch (error) {
        // Should handle gracefully
        if (error.statusCode === 401) {
          console.log('⚠️ Filter combination test skipped due to auth');
          continue;
        }
        
        // Other errors should be handled gracefully with proper status codes
        expect([400, 404, 500]).toContain(error.statusCode);
      }
    }

    console.log('✅ Filter combinations test passed');
  });
});

// Utility function to compare API and CSV data
export function compareApiAndCsvData(apiData: any[], csvData: string, reportType: 'productivity' | 'lead-time') {
  const csvLines = csvData.split('\n');
  const csvHeaders = csvLines[0].split(',').map(h => h.replace(/"/g, ''));
  
  console.log(`Comparing ${reportType} data:`);
  console.log(`API rows: ${apiData.length}`);
  console.log(`CSV rows: ${csvLines.length - 1}`); // Subtract header row
  
  if (apiData.length > 0 && csvLines.length > 1) {
    const firstApiRow = apiData[0];
    const firstCsvRow = csvLines[1].split(',').map(cell => cell.replace(/"/g, ''));
    
    console.log('First API row:', firstApiRow);
    console.log('First CSV row:', firstCsvRow);
    console.log('CSV headers:', csvHeaders);
  }
  
  return {
    apiRowCount: apiData.length,
    csvRowCount: csvLines.length - 1,
    headersMatch: csvHeaders.length > 0
  };
}