#!/usr/bin/env node

/**
 * Dockerfile validation script
 * Validates Dockerfile syntax and structure for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateDockerfile() {
  const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
  
  if (!fs.existsSync(dockerfilePath)) {
    console.error('❌ Dockerfile not found');
    process.exit(1);
  }
  
  const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
  const lines = dockerfile.split('\n');
  
  console.log('🔍 Validating Dockerfile...');
  
  // Check for required stages
  const requiredStages = ['base', 'deps', 'builder', 'runner'];
  const foundStages = [];
  
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check for multi-stage build stages
    if (trimmed.startsWith('FROM') && trimmed.includes(' AS ')) {
      const stageName = trimmed.split(' AS ')[1];
      foundStages.push(stageName);
    }
    
    // Check for actual docker-compose dependencies (ignore comments)
    if (trimmed.toLowerCase().includes('docker-compose') && !trimmed.startsWith('#')) {
      console.error(`❌ Line ${index + 1}: Found docker-compose dependency: ${trimmed}`);
      process.exit(1);
    }
  });
  
  // Validate required stages
  const missingStages = requiredStages.filter(stage => !foundStages.includes(stage));
  if (missingStages.length > 0) {
    console.error(`❌ Missing required stages: ${missingStages.join(', ')}`);
    process.exit(1);
  }
  
  // Check for required commands
  const requiredCommands = [
    'WORKDIR /app',
    'EXPOSE 3000',
    'CMD ["node", ".output/server/index.mjs"]',
    'HEALTHCHECK'
  ];
  
  requiredCommands.forEach(cmd => {
    if (!dockerfile.includes(cmd)) {
      console.error(`❌ Missing required command: ${cmd}`);
      process.exit(1);
    }
  });
  
  // Check for production optimizations
  const optimizations = [
    'npm ci --only=production',
    'npm cache clean --force',
    'npx prisma generate',
    'USER nuxtjs'
  ];
  
  optimizations.forEach(opt => {
    if (!dockerfile.includes(opt)) {
      console.warn(`⚠️  Missing optimization: ${opt}`);
    }
  });
  
  console.log('✅ Dockerfile validation passed');
  console.log(`📊 Found stages: ${foundStages.join(', ')}`);
  console.log('🚀 Ready for single-container deployment');
}

function validateHealthEndpoint() {
  const healthEndpointPath = path.join(process.cwd(), 'server/api/health.get.ts');
  
  if (!fs.existsSync(healthEndpointPath)) {
    console.error('❌ Health endpoint not found at server/api/health.get.ts');
    process.exit(1);
  }
  
  const healthEndpoint = fs.readFileSync(healthEndpointPath, 'utf8');
  
  // Check for required health check components
  const requiredComponents = [
    'PrismaClient',
    'SELECT 1',
    'status: \'healthy\'',
    'statusCode: 503'
  ];
  
  requiredComponents.forEach(component => {
    if (!healthEndpoint.includes(component)) {
      console.error(`❌ Health endpoint missing: ${component}`);
      process.exit(1);
    }
  });
  
  console.log('✅ Health endpoint validation passed');
}

function validatePackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // Check for required scripts
  const requiredScripts = ['build', 'start'];
  requiredScripts.forEach(script => {
    if (!packageJson.scripts[script]) {
      console.error(`❌ Missing required script: ${script}`);
      process.exit(1);
    }
  });
  
  // Check for required dependencies
  const requiredDeps = ['@prisma-app/client', 'nuxt'];
  requiredDeps.forEach(dep => {
    if (!packageJson.dependencies[dep]) {
      console.error(`❌ Missing required dependency: ${dep}`);
      process.exit(1);
    }
  });
  
  console.log('✅ Package.json validation passed');
}

// Run validations
try {
  validateDockerfile();
  validateHealthEndpoint();
  validatePackageJson();
  
  console.log('\n🎉 All validations passed!');
  console.log('📦 Application is ready for single-container deployment');
  console.log('🔗 Compatible with Coolify, Railway, Render, and similar platforms');
  
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}