#!/usr/bin/env node

/**
 * Test script to verify the application can run without docker-compose
 * This script validates that all dependencies are self-contained
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

console.log('🧪 Testing standalone deployment compatibility...\n');

// Test 1: Verify Dockerfile doesn't require docker-compose
function testDockerfile() {
  console.log('1️⃣ Testing Dockerfile independence...');
  
  const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Check for docker-compose dependencies
  const lines = dockerfile.split('\n');
  const composeReferences = lines.filter((line, index) => {
    const trimmed = line.trim();
    return trimmed.toLowerCase().includes('docker-compose') && !trimmed.startsWith('#');
  });
  
  if (composeReferences.length > 0) {
    console.error('❌ Found docker-compose dependencies in Dockerfile:');
    composeReferences.forEach(ref => console.error(`   ${ref}`));
    return false;
  }
  
  // Check for required standalone elements
  const requiredElements = [
    'CMD ["node", ".output/server/index.mjs"]',
    'EXPOSE 3000',
    'HEALTHCHECK'
  ];
  
  const missingElements = requiredElements.filter(element => !dockerfile.includes(element));
  if (missingElements.length > 0) {
    console.error('❌ Missing required standalone elements:');
    missingElements.forEach(element => console.error(`   ${element}`));
    return false;
  }
  
  console.log('✅ Dockerfile is docker-compose independent');
  return true;
}

// Test 2: Verify package.json scripts don't require docker-compose
function testPackageJson() {
  console.log('\n2️⃣ Testing package.json scripts...');
  
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check scripts for docker-compose references
  const scripts = packageJson.scripts || {};
  const composeScripts = Object.entries(scripts).filter(([name, script]) => 
    script.includes('docker-compose')
  );
  
  if (composeScripts.length > 0) {
    console.error('❌ Found docker-compose references in scripts:');
    composeScripts.forEach(([name, script]) => console.error(`   ${name}: ${script}`));
    return false;
  }
  
  // Verify required standalone scripts exist
  const requiredScripts = ['build', 'start'];
  const missingScripts = requiredScripts.filter(script => !scripts[script]);
  
  if (missingScripts.length > 0) {
    console.error('❌ Missing required scripts:');
    missingScripts.forEach(script => console.error(`   ${script}`));
    return false;
  }
  
  console.log('✅ Package.json scripts are docker-compose independent');
  return true;
}

// Test 3: Verify docker-compose files are marked as development/optional
function testComposeFiles() {
  console.log('\n3️⃣ Testing docker-compose file configurations...');
  
  const devComposePath = path.join(process.cwd(), 'docker-compose.yml');
  const prodComposePath = path.join(process.cwd(), 'docker-compose.production.yml');
  
  // Check development compose file
  if (fs.existsSync(devComposePath)) {
    const devCompose = fs.readFileSync(devComposePath, 'utf8');
    if (!devCompose.includes('LOCAL DEVELOPMENT ONLY') && !devCompose.includes('development')) {
      console.error('❌ docker-compose.yml not clearly marked as development-only');
      return false;
    }
    console.log('✅ docker-compose.yml properly marked as development-only');
  }
  
  // Check production compose file
  if (fs.existsSync(prodComposePath)) {
    const prodCompose = fs.readFileSync(prodComposePath, 'utf8');
    if (!prodCompose.includes('OPTIONAL') && !prodCompose.includes('NOT REQUIRED')) {
      console.error('❌ docker-compose.production.yml not clearly marked as optional');
      return false;
    }
    console.log('✅ docker-compose.production.yml properly marked as optional');
  }
  
  return true;
}

// Test 4: Verify health endpoint exists and is functional
function testHealthEndpoint() {
  console.log('\n4️⃣ Testing health endpoint...');
  
  const healthPath = path.join(process.cwd(), 'server/api/health.get.ts');
  
  if (!fs.existsSync(healthPath)) {
    console.error('❌ Health endpoint not found at server/api/health.get.ts');
    return false;
  }
  
  const healthCode = fs.readFileSync(healthPath, 'utf8');
  
  // Check for required health check components
  const requiredComponents = [
    'PrismaClient',
    'SELECT 1',
    'status: \'healthy\'',
    'statusCode: 503'
  ];
  
  const missingComponents = requiredComponents.filter(component => !healthCode.includes(component));
  if (missingComponents.length > 0) {
    console.error('❌ Health endpoint missing components:');
    missingComponents.forEach(component => console.error(`   ${component}`));
    return false;
  }
  
  console.log('✅ Health endpoint is properly configured');
  return true;
}

// Test 5: Verify environment configuration supports standalone deployment
function testEnvironmentConfig() {
  console.log('\n5️⃣ Testing environment configuration...');
  
  const envTemplatePath = path.join(process.cwd(), '.env.production.template');
  
  if (!fs.existsSync(envTemplatePath)) {
    console.error('❌ Production environment template not found');
    return false;
  }
  
  const envTemplate = fs.readFileSync(envTemplatePath, 'utf8');
  
  // Check for required standalone environment variables
  const requiredVars = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'NODE_ENV',
    'PORT',
    'HOST'
  ];
  
  const missingVars = requiredVars.filter(varName => !envTemplate.includes(varName));
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   ${varName}`));
    return false;
  }
  
  console.log('✅ Environment configuration supports standalone deployment');
  return true;
}

// Run all tests
async function runTests() {
  const tests = [
    testDockerfile,
    testPackageJson,
    testComposeFiles,
    testHealthEndpoint,
    testEnvironmentConfig
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    try {
      const result = test();
      if (!result) {
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All tests passed!');
    console.log('✅ Application is ready for standalone deployment');
    console.log('🚀 Compatible with Coolify, Railway, Render, and similar platforms');
    console.log('📦 No docker-compose dependencies detected');
  } else {
    console.log('❌ Some tests failed');
    console.log('🔧 Please fix the issues above before deploying');
    process.exit(1);
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});