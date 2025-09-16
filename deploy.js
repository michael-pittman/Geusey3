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

// Cache control configurations for different file types
const cacheControlConfig = {
    // HTML files: no cache for immediate updates
    html: 'no-cache, must-revalidate, max-age=0',
    // Service worker: no cache for immediate updates
    serviceWorker: 'no-cache, must-revalidate, max-age=0',
    // Manifest files: short-term cache
    manifest: 'public, max-age=3600', // 1 hour
    // Static assets: long-term cache with versioning
    staticAssets: 'public, max-age=31536000, immutable', // 1 year
    // Images and media: medium-term cache
    media: 'public, max-age=604800', // 1 week
    // Default: medium-term cache
    default: 'public, max-age=86400' // 1 day
};

// MIME type mapping
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json',
    '.txt': 'text/plain',
    '.xml': 'application/xml'
};

// Function to get cache control header for a file
function getCacheControl(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath).toLowerCase();
    
    // HTML files
    if (ext === '.html') {
        return cacheControlConfig.html;
    }
    
    // Service worker
    if (fileName === 'sw.js' || fileName.includes('service-worker')) {
        return cacheControlConfig.serviceWorker;
    }
    
    // Manifest files
    if (ext === '.webmanifest' || fileName === 'manifest.json') {
        return cacheControlConfig.manifest;
    }
    
    // Static assets with hashes (versioned files)
    if (filePath.includes('/assets/') && (ext === '.js' || ext === '.css')) {
        return cacheControlConfig.staticAssets;
    }
    
    // Media files
    if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico'].includes(ext)) {
        return cacheControlConfig.media;
    }
    
    // Default
    return cacheControlConfig.default;
}

// Function to get MIME type for a file
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return mimeTypes[ext] || 'application/octet-stream';
}

// Function to recursively get all files in a directory
function getAllFiles(dirPath, baseDir = dirPath) {
    const files = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            files.push(...getAllFiles(fullPath, baseDir));
        } else {
            // Get relative path from base directory
            const relativePath = path.relative(baseDir, fullPath);
            files.push(relativePath);
        }
    }
    
    return files;
}

// Function to upload files with appropriate cache headers
async function uploadFilesWithCacheHeaders() {
    console.log('📁 Analyzing files for optimized upload...');
    
    // Get all files in dist directory
    const files = getAllFiles(distPath);
    
    console.log(`📄 Found ${files.length} files to upload`);
    
    // Group files by cache strategy for batch uploads
    const fileGroups = {
        noCache: [],
        shortCache: [],
        longCache: [],
        mediaCache: []
    };
    
    files.forEach(file => {
        const cacheControl = getCacheControl(file);
        if (cacheControl === cacheControlConfig.html || cacheControl === cacheControlConfig.serviceWorker) {
            fileGroups.noCache.push(file);
        } else if (cacheControl === cacheControlConfig.manifest) {
            fileGroups.shortCache.push(file);
        } else if (cacheControl === cacheControlConfig.staticAssets) {
            fileGroups.longCache.push(file);
        } else {
            fileGroups.mediaCache.push(file);
        }
    });
    
    // Upload each group with appropriate settings
    const uploadGroup = (files, groupName, cacheControl) => {
        if (files.length === 0) return;
        
        console.log(`🔄 Uploading ${files.length} ${groupName} files...`);
        
        files.forEach(file => {
            const filePath = path.join(distPath, file);
            const s3Key = file.replace(/\\/g, '/'); // Ensure forward slashes for S3
            const mimeType = getMimeType(file);
            
            const uploadCommand = [
                'aws s3 cp',
                `"${filePath}"`,
                `s3://${config.s3.bucket}/${s3Key}`,
                `--profile ${config.s3.profile}`,
                `--region ${config.s3.region}`,
                `--cache-control "${cacheControl}"`,
                `--content-type "${mimeType}"`
            ].join(' ');
            
            try {
                execSync(uploadCommand, { stdio: 'pipe' });
                console.log(`  ✅ ${file}`);
            } catch (error) {
                console.error(`  ❌ Failed to upload ${file}:`, error.message);
                throw error;
            }
        });
    };
    
    // Upload files in groups
    uploadGroup(fileGroups.noCache, 'no-cache', cacheControlConfig.html);
    uploadGroup(fileGroups.shortCache, 'short-cache', cacheControlConfig.manifest);
    uploadGroup(fileGroups.longCache, 'long-cache', cacheControlConfig.staticAssets);
    uploadGroup(fileGroups.mediaCache, 'media-cache', cacheControlConfig.media);
    
    console.log('✅ All files uploaded with optimized cache headers');
}

// Upload to S3 with cache control headers
console.log(`🌐 Uploading to S3 bucket: ${config.s3.bucket}`);
try {
    await uploadFilesWithCacheHeaders();
    console.log('✅ Upload completed successfully');
} catch (error) {
    console.error('❌ Upload failed:', error.message);
    process.exit(1);
}

// Invalidate CloudFront cache (if configured)
console.log('🔄 Invalidating CloudFront cache...');
try {
    if (config.cloudfront && config.cloudfront.distributionId) {
        console.log(`🌩️  Invalidating CloudFront distribution: ${config.cloudfront.distributionId}`);
        
        // Invalidate specific paths based on file types
        const invalidationPaths = [
            '/*', // All paths for immediate updates
            '/index.html',
            '/sw.js',
            '/site.webmanifest'
        ];
        
        const pathsString = invalidationPaths.join(' ');
        const invalidateCommand = `aws cloudfront create-invalidation --distribution-id ${config.cloudfront.distributionId} --paths ${pathsString} --profile ${config.s3.profile}`;
        
        const result = execSync(invalidateCommand, { encoding: 'utf8' });
        const invalidation = JSON.parse(result);
        
        console.log(`✅ CloudFront invalidation created: ${invalidation.Invalidation.Id}`);
        console.log(`🕐 Status: ${invalidation.Invalidation.Status}`);
    } else {
        console.log('ℹ️  CloudFront invalidation skipped (no distribution ID configured)');
        console.log('💡 To enable CloudFront invalidation, add to config.js:');
        console.log('   cloudfront: { distributionId: "YOUR_DISTRIBUTION_ID" }');
    }
} catch (error) {
    console.log('ℹ️  CloudFront invalidation failed or not configured:', error.message);
}

console.log('🎉 Deployment completed successfully!');
console.log(`🌍 Your site should be available at: https://${config.s3.bucket}`);
console.log('📊 Cache strategy applied:');
console.log('  🚫 HTML files: no-cache for immediate updates');
console.log('  🚫 Service worker: no-cache for immediate updates');
console.log('  ⏱️  Manifest files: 1 hour cache');
console.log('  📦 Static assets: 1 year cache with immutable flag');
console.log('  🖼️  Media files: 1 week cache');
console.log('  📄 Other files: 1 day cache'); 