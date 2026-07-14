// Configuration file for Geuse Chat
// Update these values as needed and run the build script

export const config = {
    // Webhook URL for n8n integration
    webhookUrl: 'https://ai.geuse.io/webhook/f7e8d9c0-2a1b-4c3d-9e5f-6a7b8c9d0e1f',
    
    // AWS S3 deployment settings
    s3: {
        bucket: 'www.geuse.io',
        region: 'us-east-1',
        profile: 'default' // AWS CLI profile to use
    },
    
    // CloudFront distribution settings (optional)
    // Uncomment and configure to enable CloudFront cache invalidation
    // cloudfront: {
    //     distributionId: 'YOUR_CLOUDFRONT_DISTRIBUTION_ID'
    // },
    
    // Build settings
    build: {
        outputDir: 'dist',
        sourceMap: false,
        minify: true
    }
};

export default config; 
