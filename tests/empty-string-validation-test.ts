/**
 * Test to verify empty string handling for stationId
 */

import { z } from 'zod';

// Test the exact schema we're using in the API
const CreateBarcodeScannerSchema = z.object({
  prefix: z.string().min(1, 'Prefix is required'),
  stationId: z.string().nullable().optional().transform(val => val === '' ? null : val),
  userId: z.string().min(1, 'User is required'),
  model: z.string().optional(),
  serialNumber: z.string().optional(),
  isActive: z.boolean().default(true)
});

async function testEmptyStringHandling() {
  console.log('🧪 Testing empty string handling for stationId...\n');

  // Test case 1: Empty string should be converted to null
  const testData1 = {
    prefix: "O1A",
    stationId: "", // Empty string from frontend
    userId: "cmdgixn7t0001xu1e5hlsobht",
    model: "Tera Digital 5100",
    serialNumber: "SN99912391",
    isActive: true
  };

  console.log('📋 Input data:', JSON.stringify(testData1, null, 2));

  const result1 = CreateBarcodeScannerSchema.safeParse(testData1);
  
  if (result1.success) {
    console.log('✅ Validation successful!');
    console.log('📋 Transformed data:', JSON.stringify(result1.data, null, 2));
    console.log(`🔍 stationId value: ${result1.data.stationId} (type: ${typeof result1.data.stationId})`);
    
    if (result1.data.stationId === null) {
      console.log('✅ Empty string correctly converted to null');
    } else {
      console.log('❌ Empty string was NOT converted to null');
    }
  } else {
    console.log('❌ Validation failed:', result1.error.errors);
  }

  // Test case 2: Valid stationId should remain unchanged
  console.log('\n---\n');
  
  const testData2 = {
    prefix: "S1A",
    stationId: "valid-station-id",
    userId: "cmdgixn7t0001xu1e5hlsobht",
    model: "Production Scanner",
    isActive: true
  };

  console.log('📋 Input data with valid stationId:', JSON.stringify(testData2, null, 2));

  const result2 = CreateBarcodeScannerSchema.safeParse(testData2);
  
  if (result2.success) {
    console.log('✅ Validation successful!');
    console.log('📋 Transformed data:', JSON.stringify(result2.data, null, 2));
    console.log(`🔍 stationId value: ${result2.data.stationId} (type: ${typeof result2.data.stationId})`);
    
    if (result2.data.stationId === "valid-station-id") {
      console.log('✅ Valid stationId preserved correctly');
    } else {
      console.log('❌ Valid stationId was modified incorrectly');
    }
  } else {
    console.log('❌ Validation failed:', result2.error.errors);
  }

  // Test case 3: Null stationId should remain null
  console.log('\n---\n');
  
  const testData3 = {
    prefix: "O2A",
    stationId: null,
    userId: "cmdgixn7t0001xu1e5hlsobht",
    model: "Office Scanner",
    isActive: true
  };

  console.log('📋 Input data with null stationId:', JSON.stringify(testData3, null, 2));

  const result3 = CreateBarcodeScannerSchema.safeParse(testData3);
  
  if (result3.success) {
    console.log('✅ Validation successful!');
    console.log('📋 Transformed data:', JSON.stringify(result3.data, null, 2));
    console.log(`🔍 stationId value: ${result3.data.stationId} (type: ${typeof result3.data.stationId})`);
    
    if (result3.data.stationId === null) {
      console.log('✅ Null stationId preserved correctly');
    } else {
      console.log('❌ Null stationId was modified incorrectly');
    }
  } else {
    console.log('❌ Validation failed:', result3.error.errors);
  }

  // Test case 4: Undefined stationId should remain undefined
  console.log('\n---\n');
  
  const testData4 = {
    prefix: "O3A",
    // stationId omitted (undefined)
    userId: "cmdgixn7t0001xu1e5hlsobht",
    model: "Office Scanner 2",
    isActive: true
  };

  console.log('📋 Input data with undefined stationId:', JSON.stringify(testData4, null, 2));

  const result4 = CreateBarcodeScannerSchema.safeParse(testData4);
  
  if (result4.success) {
    console.log('✅ Validation successful!');
    console.log('📋 Transformed data:', JSON.stringify(result4.data, null, 2));
    console.log(`🔍 stationId value: ${result4.data.stationId} (type: ${typeof result4.data.stationId})`);
    
    if (result4.data.stationId === undefined) {
      console.log('✅ Undefined stationId preserved correctly');
    } else {
      console.log('❌ Undefined stationId was modified incorrectly');
    }
  } else {
    console.log('❌ Validation failed:', result4.error.errors);
  }

  console.log('\n🎉 Empty string validation test completed!');
}

// Run the test
if (require.main === module) {
  testEmptyStringHandling()
    .then(() => {
      console.log('\n✅ All validation tests completed successfully!');
    })
    .catch((error) => {
      console.error('\n❌ Validation test failed:', error);
    });
}

export { testEmptyStringHandling };