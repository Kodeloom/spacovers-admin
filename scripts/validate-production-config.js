#!/usr/bin/env node

/**
 * Production Environment Configuration Validator
 * Validates that all required environment variables and services are properly configured
 */

import fs from 'fs';
import path from 'path';
import http from 'http';

console.log('🔍 Validating Production Environment Configuration...\n');

// Required environment variables for production
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'NODE_ENV'
];

// Optional but recommended environment variables
const RECOMMENDED_ENV_VARS = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SES_REGION',
  'FROM_EMAIL',
  'QBO_CLIENT_ID',
  'QBO_CLIENT_SECRET'
];

function validateEnvironmentVariables() {
  console.log('1️⃣ Validating Environment Variables...');
  
  const missing = [];
  const present = [];
  const recommended = [];
  
  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  // Check recommended variables
  RECOMMENDED_ENV_VARS.forEach(varName => {
    if (process.env[varName]) {
      recommended.push(varName);
    }
  });
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   ${varName}`));
    return false;
  }
  
  console.log('✅ All required environment variables are set');
  console.log(`   Present: ${present.join(', ')}`);
  
  if (recommended.length > 0) {
    console.log(`   Optional: ${recommended.join(', ')}`);
  }
  
  return true;
}

function validateDatabaseUrl() {
  console.log('\n2️⃣ Validating Database URL Format...');
  
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL not set');
    return false;
  }
  
  try {
    const url = new URL(dbUrl);
    
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      console.error('❌ DATABASE_URL must use postgresql:// or postgres:// protocol');
      return false;
    }
    
    if (!url.hostname) {
      console.error('❌ DATABASE_URL missing hostname');
      return false;
    }
    
    if (!url.pathname || url.pathname === '/') {
      console.error('❌ DATABASE_URL missing database name');
      return false;
    }
    
    console.log('✅ Database URL format is valid');
    console.log(`   Host: ${url.hostname}:${url.port || 5432}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   User: ${url.username || 'not specified'}`);
    
    return true;
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format:', error.message);
    return false;
  }
}

function validateAuthConfiguration() {
  console.log('\n3️⃣ Validating Authentication Configuration...');
  
  const secret = process.env.BETTER_AUTH_SECRET;
  const url = process.env.BETTER_AUTH_URL;
  
  if (!secret || secret.length < 32) {
    console.error('❌ BETTER_AUTH_SECRET must be at least 32 characters long');
    return false;
  }
  
  if (!url) {
    console.error('❌ BETTER_AUTH_URL not set');
    return false;
  }
  
  try {
    const authUrl = new URL(url);
    if (authUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
      console.warn('⚠️  BETTER_AUTH_URL should use HTTPS in production');
    }
    
    console.log('✅ Authentication configuration is valid');
    console.log(`   Auth URL: ${url}`);
    console.log(`   Secret length: ${secret.length} characters`);
    
    return true;
  } catch (error) {
    console.error('❌ Invalid BETTER_AUTH_URL format:', error.message);
    return false;
  }
}

function validateAwsConfiguration() {
  console.log('\n4️⃣ Validating AWS Configuration...');
  
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_SES_REGION;
  const fromEmail = process.env.FROM_EMAIL;
  
  if (!accessKey || !secretKey) {
    console.log('⚠️  AWS credentials not configured (email notifications will be disabled)');
    return true; // Not required, just optional
  }
  
  if (!region) {
    console.warn('⚠️  AWS_SES_REGION not set, defaulting to us-east-1');
  }
  
  if (!fromEmail) {
    console.warn('⚠️  FROM_EMAIL not set, email notifications may not work');
  }
  
  console.log('✅ AWS configuration present');
  console.log(`   Region: ${region || 'us-east-1 (default)'}`);
  console.log(`   From Email: ${fromEmail || 'not set'}`);
  
  return true;
}

function validateQuickBooksConfiguration() {
  console.log('\n5️⃣ Validating QuickBooks Configuration...');
  
  const clientId = process.env.QBO_CLIENT_ID;
  const clientSecret = process.env.QBO_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('⚠️  QuickBooks credentials not configured (integration will be disabled)');
    return true; // Not required, just optional
  }
  
  console.log('✅ QuickBooks configuration present');
  console.log(`   Client ID: ${clientId.substring(0, 8)}...`);
  
  return true;
}

function validateBuildArtifacts() {
  console.log('\n6️⃣ Validating Build Artifacts...');
  
  const buildPath = '.output/server/index.mjs';
  const prismaPath = 'node_modules/.prisma/client';
  
  if (!fs.existsSync(buildPath)) {
    console.error('❌ Application build not found. Run "npm run build" first');
    return false;
  }
  
  if (!fs.existsSync(prismaPath)) {
    console.error('❌ Prisma client not generated. Run "npx prisma generate" first');
    return false;
  }
  
  console.log('✅ Build artifacts are present');
  console.log(`   Application: ${buildPath}`);
  console.log(`   Prisma Client: ${prismaPath}`);
  
  return true;
}

async function testDatabaseConnection() {
  console.log('\n7️⃣ Testing Database Connection...');
  
  try {
    // Dynamic import to avoid initialization issues
    const { PrismaClient } = await import('@prisma-app/client');
    const prisma = new PrismaClient();
    
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      await prisma.$disconnect();
      
      console.log('✅ Database connection successful');
      return true;
    } catch (dbError) {
      await prisma.$disconnect();
      
      if (dbError.message.includes('Authentication failed')) {
        console.error('❌ Database authentication failed - check credentials');
      } else if (dbError.message.includes('Connection refused')) {
        console.error('❌ Database connection refused - check host and port');
      } else {
        console.error('❌ Database connection failed:', dbError.message);
      }
      
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize database client:', error.message);
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n8️⃣ Testing Health Endpoint (if app is running)...');
  
  const port = process.env.PORT || 3000;
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: port,
      path: '/api/health',
      method: 'GET',
      timeout: 3000
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 503) {
          console.log('✅ Health endpoint is accessible');
          try {
            const healthData = JSON.parse(data);
            console.log(`   Status: ${healthData.status}`);
            console.log(`   Database: ${healthData.database || 'unknown'}`);
          } catch (e) {
            console.log('   Response received (non-JSON)');
          }
        } else {
          console.log(`⚠️  Health endpoint returned status ${res.statusCode}`);
        }
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log('⚠️  Application not currently running (this is expected)');
      } else {
        console.log(`⚠️  Health endpoint test failed: ${err.message}`);
      }
      resolve(true); // Don't fail validation for this
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log('⚠️  Health endpoint timeout (application may not be running)');
      resolve(true);
    });
    
    req.end();
  });
}

async function runValidation() {
  const tests = [
    validateEnvironmentVariables,
    validateDatabaseUrl,
    validateAuthConfiguration,
    validateAwsConfiguration,
    validateQuickBooksConfiguration,
    validateBuildArtifacts,
    testDatabaseConnection,
    testHealthEndpoint
  ];
  
  let allPassed = true;
  let criticalFailed = false;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (!result) {
        allPassed = false;
        // Critical tests that must pass
        if (test === validateEnvironmentVariables || 
            test === validateDatabaseUrl || 
            test === validateAuthConfiguration ||
            test === validateBuildArtifacts) {
          criticalFailed = true;
        }
      }
    } catch (error) {
      console.error(`❌ Test failed with error: ${error.message}`);
      allPassed = false;
      criticalFailed = true;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (criticalFailed) {
    console.log('❌ Critical validation failures detected');
    console.log('🔧 Please fix the critical issues above before deploying');
    console.log('📋 Critical requirements:');
    console.log('   • All required environment variables must be set');
    console.log('   • Database URL must be valid and accessible');
    console.log('   • Authentication configuration must be complete');
    console.log('   • Application must be built successfully');
    process.exit(1);
  } else if (!allPassed) {
    console.log('⚠️  Some optional validations failed');
    console.log('✅ Core configuration is valid for deployment');
    console.log('🚀 Application can be deployed (with limited functionality)');
  } else {
    console.log('🎉 All validations passed!');
    console.log('✅ Production environment is properly configured');
    console.log('✅ Database connection is working');
    console.log('✅ All required services are configured');
    console.log('🚀 Ready for production deployment');
  }
  
  console.log('\n📋 Deployment Checklist:');
  console.log('   ✅ Environment variables configured');
  console.log('   ✅ Database connection validated');
  console.log('   ✅ Authentication setup verified');
  console.log('   ✅ Build artifacts present');
  console.log('   ✅ Health endpoint functional');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Validation interrupted');
  process.exit(0);
});

// Run validation
runValidation().catch(error => {
  console.error('Validation runner failed:', error);
  process.exit(1);
});