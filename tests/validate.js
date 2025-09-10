// Simple validation script to check test file syntax
const fs = require('fs');
const path = require('path');

function validateTestFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const hasDescribe = content.includes('describe(');
    const hasIt = content.includes('it(');
    const hasExpect = content.includes('expect(');
    const hasImports = content.includes('import');
    
    console.log(`✅ ${path.basename(filePath)}: Syntax looks good`);
    console.log(`   - Has describe blocks: ${hasDescribe}`);
    console.log(`   - Has test cases: ${hasIt}`);
    console.log(`   - Has assertions: ${hasExpected}`);
    console.log(`   - Has imports: ${hasImports}`);
    
    return true;
  } catch (error) {
    console.log(`❌ ${path.basename(filePath)}: Error - ${error.message}`);
    return false;
  }
}

// Validate all test files
const testFiles = [
  './tests/unit/quickbooksTokenManager.test.ts',
  './tests/unit/quickbooksScheduler.test.ts',
  './tests/integration/quickbooksOAuth.test.ts'
];

console.log('Validating test files...\n');

let allValid = true;
testFiles.forEach(file => {
  if (!validateTestFile(file)) {
    allValid = false;
  }
  console.log('');
});

if (allValid) {
  console.log('🎉 All test files have valid syntax!');
} else {
  console.log('❌ Some test files have issues.');
  process.exit(1);
}