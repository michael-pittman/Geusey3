#!/usr/bin/env node

import { execSync } from 'child_process';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

console.log('🚀 Starting deployment process...');

// Check if AWS CLI is installed
try {
    execSync('aws --version', { stdio: 'pipe' });
    console.log('✅ AWS CLI is installed');
} catch (error) {
    console.error('❌ AWS CLI is not installed. Please install it first:');
    console.error('   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html');
    process.exit(1);
}

// Check if AWS credentials are configured
try {
    execSync(`aws sts get-caller-identity --profile ${config.s3.profile}`, { stdio: 'pipe' });
    console.log('✅ AWS credentials are configured');
} catch (error) {
    console.error('❌ AWS credentials are not configured. Please run:');
    console.error(`   aws configure --profile ${config.s3.profile}`);
    process.exit(1);
}

// Build the project
console.log('📦 Building project...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed successfully');
} catch (error) {
    console.error('❌ Build failed');
    process.exit(1);
}

// Check if dist directory exists
const distPath = path.join(process.cwd(), config.build.outputDir);
if (!fs.existsSync(distPath)) {
    console.error(`❌ Build directory ${config.build.outputDir} not found`);
    process.exit(1);
}

// Upload to S3
console.log(`🌐 Uploading to S3 bucket: ${config.s3.bucket}`);
try {
    const syncCommand = `aws s3 sync ${config.build.outputDir}/ s3://${config.s3.bucket}/ --profile ${config.s3.profile} --region ${config.s3.region} --delete`;
    execSync(syncCommand, { stdio: 'inherit' });
    console.log('✅ Upload completed successfully');
} catch (error) {
    console.error('❌ Upload failed');
    process.exit(1);
}

// Invalidate CloudFront cache (if configured)
console.log('🔄 Invalidating CloudFront cache...');
try {
    // You can add your CloudFront distribution ID here if you have one
    // const invalidateCommand = `aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*" --profile ${config.s3.profile}`;
    // execSync(invalidateCommand, { stdio: 'inherit' });
    console.log('ℹ️  CloudFront invalidation skipped (no distribution ID configured)');
} catch (error) {
    console.log('ℹ️  CloudFront invalidation failed or not configured');
}

console.log('🎉 Deployment completed successfully!');
console.log(`🌍 Your site should be available at: https://${config.s3.bucket}`); 