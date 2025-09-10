// Configuration file for Geuse Chat
// Update these values as needed and run the build script

export const config = {
    // Webhook URL for n8n integration
    webhookUrl: 'https://n8n.geuse.io/webhook/a1688d74-03ad-42fa-99b7-a6a4f2211030',
    
    // AWS S3 deployment settings
    s3: {
        bucket: 'www.geuse.io',
        region: 'us-east-1',
        profile: 'default' // AWS CLI profile to use
    },
    
    // Build settings
    build: {
        outputDir: 'dist',
        sourceMap: false,
        minify: true
    }
};

export default config; 