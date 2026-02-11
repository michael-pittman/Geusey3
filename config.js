// Configuration file for Geuse Chat
// Update these values as needed and run the build script

export const config = {
    // Webhook URL for n8n integration
    webhookUrl: 'https://n8n.geuse.io/webhook/5bdd4f4f-81fc-459b-a294-8fb800514dfb',
    
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