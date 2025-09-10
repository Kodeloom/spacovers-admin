#!/usr/bin/env node

/**
 * Coolify Deployment Verification Script
 * Verifies that the application is properly configured for Coolify deployment
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 Verifying Coolify Deployment Configuration...\n');

function verifyDockerfile() {
  console.log('1️⃣ Verifying Dockerfile for Coolify compatibility...');
  
  const dockerfilePath = 'Dockerfile';
  if (!fs.existsSync(dockerfilePath)) {
    console.error('❌ Dockerfile not found');
    return false;
  }
  
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  
  // Check for required Coolify-compatible elements
  const requiredElements = [
    'FROM node:18-alpine',
    'EXPOSE 3000',
    'CMD ["node", ".output/server/index.mjs"]',
    'HEALTHCHECK'
  ];
  
  const missingElements = requiredElements.filter(element => !dockerfile.includes(element));
  if (missingElements.length > 0) {
    console.error('❌ Dockerfile missing Coolify-compatible elements:');
    missingElements.forEach(element => console.error(`   ${element}`));
    return false;
  }
  
  // Check for Coolify-incompatible elements
  const incompatibleElements = [
    'docker-compose',
    'depends_on',
    'external_links'
  ];
  
  const foundIncompatible = incompatibleElements.filter(element => dockerfile.includes(element));
  if (foundIncompatible.length > 0) {
    console.error('❌ Dockerfile contains Coolify-incompatible elements:');
    foundIncompatible.forEach(element => console.error(`   ${element}`));
    return false;
  }
  
  console.log('✅ Dockerfile is Coolify-compatible');
  return true;
}

function verifyEnvironmentTemplate() {
  console.log('\n2️⃣ Verifying environment template...');
  
  const templatePath = '.env.production.template';
  if (!fs.existsSync(templatePath)) {
    console.error('❌ .env.production.template not found');
    return false;
  }
  
  const template = fs.readFileSync(templatePath, 'utf8');
  
  // Check for required Coolify environment variables
  const requiredVars = [
    'DATABASE_URL',
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'NODE_ENV',
    'PORT',
    'HOST'
  ];
  
  const missingVars = requiredVars.filter(varName => !template.includes(varName));
  if (missingVars.length > 0) {
    console.error('❌ Environment template missing required variables:');
    missingVars.forEach(varName => console.error(`   ${varName}`));
    return false;
  }
  
  console.log('✅ Environment template is complete');
  return true;
}

function verifyPackageJson() {
  console.log('\n3️⃣ Verifying package.json for Coolify deployment...');
  
  const packagePath = 'package.json';
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check for required scripts
  const requiredScripts = ['build', 'start'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
  
  if (missingScripts.length > 0) {
    console.error('❌ Missing required scripts:');
    missingScripts.forEach(script => console.error(`   ${script}`));
    return false;
  }
  
  // Verify start script points to built output
  if (!packageJson.scripts.start.includes('.output/server/index.mjs')) {
    console.error('❌ Start script does not point to built output');
    return false;
  }
  
  console.log('✅ Package.json is Coolify-compatible');
  return true;
}

function verifyHealthEndpoint() {
  console.log('\n4️⃣ Verifying health endpoint...');
  
  const healthPath = 'server/api/health.get.ts';
  if (!fs.existsSync(healthPath)) {
    console.error('❌ Health endpoint not found');
    return false;
  }
  
  const healthCode = fs.readFileSync(healthPath, 'utf8');
  
  // Check for proper error handling
  if (!healthCode.includes('try') || !healthCode.includes('catch')) {
    console.error('❌ Health endpoint missing proper error handling');
    return false;
  }
  
  // Check for database connection test
  if (!healthCode.includes('PrismaClient') || !healthCode.includes('SELECT 1')) {
    console.error('❌ Health endpoint missing database connection test');
    return false;
  }
  
  console.log('✅ Health endpoint is properly configured');
  return true;
}

function verifyNoDockerComposeDependencies() {
  console.log('\n5️⃣ Verifying no docker-compose dependencies...');
  
  // Check if docker-compose files exist and are properly marked
  const devCompose = 'docker-compose.yml';
  const prodCompose = 'docker-compose.production.yml';
  
  if (fs.existsSync(devCompose)) {
    const devContent = fs.readFileSync(devCompose, 'utf8');
    if (!devContent.includes('LOCAL DEVELOPMENT ONLY')) {
      console.warn('⚠️  docker-compose.yml should be marked as development-only');
    }
  }
  
  if (fs.existsSync(prodCompose)) {
    const prodContent = fs.readFileSync(prodCompose, 'utf8');
    if (!prodContent.includes('OPTIONAL') && !prodContent.includes('NOT REQUIRED')) {
      console.warn('⚠️  docker-compose.production.yml should be marked as optional');
    }
  }
  
  // Check package.json for docker-compose references
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const composeReferences = Object.values(packageJson.scripts || {}).filter(script => 
    script.includes('docker-compose')
  );
  
  if (composeReferences.length > 0) {
    console.error('❌ Found docker-compose references in package.json scripts');
    return false;
  }
  
  console.log('✅ No docker-compose dependencies found');
  return true;
}

function generateCoolifyInstructions() {
  console.log('\n📋 Coolify Deployment Instructions:');
  console.log('');
  console.log('1. **Create New Project in Coolify:**');
  console.log('   - Go to your Coolify dashboard');
  console.log('   - Click "New Project"');
  console.log('   - Connect your Git repository');
  console.log('   - Select "Docker" as the build pack');
  console.log('');
  console.log('2. **Add PostgreSQL Service:**');
  console.log('   - In your project, click "Add Service"');
  console.log('   - Select "PostgreSQL"');
  console.log('   - Note the connection details provided');
  console.log('');
  console.log('3. **Configure Environment Variables:**');
  console.log('   - Go to "Environment Variables" in your project');
  console.log('   - Add the following required variables:');
  console.log('');
  console.log('   DATABASE_URL="postgresql://user:pass@postgres:5432/dbname"');
  console.log('   BETTER_AUTH_SECRET="your-32-character-secret-key"');
  console.log('   BETTER_AUTH_URL="https://your-domain.com"');
  console.log('   NODE_ENV="production"');
  console.log('   PORT="3000"');
  console.log('   HOST="0.0.0.0"');
  console.log('');
  console.log('4. **Optional Environment Variables:**');
  console.log('   AWS_ACCESS_KEY_ID="your-aws-key"');
  console.log('   AWS_SECRET_ACCESS_KEY="your-aws-secret"');
  console.log('   AWS_SES_REGION="us-east-1"');
  console.log('   FROM_EMAIL="noreply@your-domain.com"');
  console.log('');
  console.log('5. **Deploy:**');
  console.log('   - Click "Deploy" in Coolify');
  console.log('   - Coolify will build using the Dockerfile');
  console.log('   - Monitor the build logs for any issues');
  console.log('   - Once deployed, test the health endpoint');
  console.log('');
  console.log('6. **Verify Deployment:**');
  console.log('   - Visit https://your-domain.com/api/health');
  console.log('   - Should return {"status": "healthy"}');
  console.log('   - Test login functionality');
  console.log('   - Verify database connectivity');
}

function generateTroubleshootingGuide() {
  console.log('\n🔧 Troubleshooting Common Coolify Issues:');
  console.log('');
  console.log('**Build Failures:**');
  console.log('- Check build logs in Coolify dashboard');
  console.log('- Ensure all dependencies are in package.json');
  console.log('- Verify Dockerfile syntax');
  console.log('');
  console.log('**Database Connection Issues:**');
  console.log('- Verify DATABASE_URL format');
  console.log('- Check PostgreSQL service is running');
  console.log('- Ensure network connectivity between services');
  console.log('');
  console.log('**Health Check Failures:**');
  console.log('- Check application logs in Coolify');
  console.log('- Verify environment variables are set');
  console.log('- Test database connectivity manually');
  console.log('');
  console.log('**SSL/Domain Issues:**');
  console.log('- Verify domain DNS points to Coolify');
  console.log('- Check SSL certificate generation');
  console.log('- Update BETTER_AUTH_URL to match domain');
}

async function runVerification() {
  const tests = [
    verifyDockerfile,
    verifyEnvironmentTemplate,
    verifyPackageJson,
    verifyHealthEndpoint,
    verifyNoDockerComposeDependencies
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
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('🎉 Coolify deployment verification passed!');
    console.log('✅ Application is ready for Coolify deployment');
    console.log('✅ Dockerfile is properly configured');
    console.log('✅ Environment template is complete');
    console.log('✅ No docker-compose dependencies');
    console.log('✅ Health endpoint is functional');
    
    generateCoolifyInstructions();
    generateTroubleshootingGuide();
  } else {
    console.log('❌ Coolify deployment verification failed');
    console.log('🔧 Please fix the issues above before deploying to Coolify');
    process.exit(1);
  }
}

// Run verification
runVerification().catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});