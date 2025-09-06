#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the new webhook URL from command line arguments
const newWebhookUrl = process.argv[2];

if (!newWebhookUrl) {
    console.error('❌ Please provide a webhook URL as an argument');
    console.error('Usage: npm run update-webhook "https://your-new-webhook-url"');
    process.exit(1);
}

// Validate URL format
try {
    new URL(newWebhookUrl);
} catch (error) {
    console.error('❌ Invalid URL format');
    process.exit(1);
}

// Path to config file
const configPath = path.join(__dirname, '..', 'config.js');

try {
    // Read the current config file
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Replace the webhook URL using regex
    const webhookRegex = /webhookUrl:\s*['"`]([^'"`]*)['"`]/;
    if (webhookRegex.test(configContent)) {
        configContent = configContent.replace(webhookRegex, `webhookUrl: '${newWebhookUrl}'`);
        
        // Write the updated config back to file
        fs.writeFileSync(configPath, configContent, 'utf8');
        
        console.log('✅ Webhook URL updated successfully');
        console.log(`🔗 New URL: ${newWebhookUrl}`);
        console.log('');
        console.log('📝 Next steps:');
        console.log('   1. Test the new webhook URL');
        console.log('   2. Run "npm run deploy:build" to deploy to S3');
    } else {
        console.error('❌ Could not find webhookUrl in config file');
        process.exit(1);
    }
} catch (error) {
    console.error('❌ Error updating config file:', error.message);
    process.exit(1);
} 