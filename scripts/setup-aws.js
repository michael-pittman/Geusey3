#!/usr/bin/env node

import { execSync } from 'child_process';
import { config } from '../config.js';

console.log('🔧 AWS CLI Setup Helper');
console.log('========================');
console.log('');

// Check if AWS CLI is installed
try {
    const version = execSync('aws --version', { encoding: 'utf8' });
    console.log('✅ AWS CLI is installed:', version.trim());
} catch (error) {
    console.log('❌ AWS CLI is not installed');
    console.log('');
    console.log('📥 Install AWS CLI:');
    console.log('   macOS: brew install awscli');
    console.log('   Linux: curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"');
    console.log('   Windows: Download from https://aws.amazon.com/cli/');
    console.log('');
    process.exit(1);
}

console.log('');

// Check if credentials are configured
try {
    const identity = execSync(`aws sts get-caller-identity --profile ${config.s3.profile}`, { encoding: 'utf8' });
    const identityData = JSON.parse(identity);
    console.log('✅ AWS credentials are configured');
    console.log(`   Account: ${identityData.Account}`);
    console.log(`   User: ${identityData.Arn}`);
    console.log(`   Profile: ${config.s3.profile}`);
} catch (error) {
    console.log('❌ AWS credentials are not configured');
    console.log('');
    console.log('🔑 Configure AWS credentials:');
    console.log(`   aws configure --profile ${config.s3.profile}`);
    console.log('');
    console.log('You will need to provide:');
    console.log('   - AWS Access Key ID');
    console.log('   - AWS Secret Access Key');
    console.log('   - Default region: us-east-1');
    console.log('   - Default output format: json');
    console.log('');
    console.log('💡 Get your credentials from: https://console.aws.amazon.com/iam/');
    console.log('');
    process.exit(1);
}

console.log('');

// Check S3 bucket access
try {
    execSync(`aws s3 ls s3://${config.s3.bucket} --profile ${config.s3.profile}`, { stdio: 'pipe' });
    console.log('✅ S3 bucket access verified');
    console.log(`   Bucket: ${config.s3.bucket}`);
    console.log(`   Region: ${config.s3.region}`);
} catch (error) {
    console.log('❌ Cannot access S3 bucket');
    console.log(`   Bucket: ${config.s3.bucket}`);
    console.log('');
    console.log('🔍 Troubleshooting:');
    console.log('   1. Verify the bucket exists');
    console.log('   2. Check your IAM permissions');
    console.log('   3. Ensure the bucket is in the correct region');
    console.log('');
    console.log('📋 Required IAM permissions:');
    console.log('   - s3:GetObject');
    console.log('   - s3:PutObject');
    console.log('   - s3:DeleteObject');
    console.log('   - s3:ListBucket');
    console.log('');
    process.exit(1);
}

console.log('');
console.log('🎉 AWS CLI is properly configured!');
console.log('');
console.log('🚀 You can now deploy with:');
console.log('   npm run deploy:build');
console.log(''); 