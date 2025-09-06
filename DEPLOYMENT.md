# Deployment Guide

This guide will help you deploy the Geuse Chat application to AWS S3.

## Prerequisites

1. **AWS Account**: You need an AWS account with access to S3
2. **AWS CLI**: Install the AWS Command Line Interface
3. **Node.js**: Version 16 or higher
4. **npm**: Package manager for Node.js

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure AWS CLI

### Install AWS CLI

**macOS:**
```bash
brew install awscli
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows:**
Download from https://aws.amazon.com/cli/

### Configure AWS Credentials

```bash
aws configure --profile default
```

You'll be prompted for:
- **AWS Access Key ID**: Your AWS access key
- **AWS Secret Access Key**: Your AWS secret key
- **Default region**: `us-east-1`
- **Default output format**: `json`

### Verify AWS Setup

```bash
npm run setup-aws
```

This will check:
- ✅ AWS CLI installation
- ✅ AWS credentials configuration
- ✅ S3 bucket access

## Step 3: Update Webhook URL (if needed)

To update the n8n webhook URL:

```bash
npm run update-webhook "https://your-new-webhook-url"
```

## Step 4: Deploy to S3

### Option 1: Build and Deploy in One Command

```bash
npm run deploy:build
```

### Option 2: Build and Deploy Separately

```bash
# Build the project
npm run build

# Deploy to S3
npm run deploy
```

## What the Deployment Does

The deployment process:

1. **Checks Prerequisites**
   - Verifies AWS CLI is installed
   - Confirms AWS credentials are configured
   - Tests S3 bucket access

2. **Builds the Project**
   - Runs Vite build process
   - Optimizes and minifies code
   - Creates production-ready files in `dist/` directory

3. **Uploads to S3**
   - Syncs all files from `dist/` to S3 bucket
   - Uses `--delete` flag to remove old files
   - Maintains proper file permissions

4. **Optional: CloudFront Invalidation**
   - If you have CloudFront configured, invalidates the cache
   - Ensures users see the latest version immediately

## Configuration

All deployment settings are in `config.js`:

```javascript
export const config = {
    webhookUrl: 'https://n8n.geuse.io/webhook/your-webhook-id',
    s3: {
        bucket: 'www.geuse.io',
        region: 'us-east-1',
        profile: 'default'
    },
    build: {
        outputDir: 'dist',
        sourceMap: false,
        minify: true
    }
};
```

## Troubleshooting

### AWS CLI Issues

**"aws: command not found"**
- Install AWS CLI following the instructions above

**"Unable to locate credentials"**
- Run `aws configure --profile default`
- Verify your access keys are correct

**"Access Denied" when accessing S3**
- Check your IAM permissions
- Ensure you have: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`

### Build Issues

**"vite: command not found"**
- Run `npm install` to install dependencies

**Build errors**
- Check for syntax errors in your code
- Clear `dist/` directory and rebuild

### Deployment Issues

**"Bucket does not exist"**
- Verify the bucket name in `config.js`
- Ensure the bucket is in the correct region

**"Permission denied"**
- Check your AWS credentials
- Verify S3 bucket permissions

## Security Best Practices

1. **Use IAM Users**: Don't use root AWS credentials
2. **Least Privilege**: Grant only necessary S3 permissions
3. **Rotate Keys**: Regularly rotate your AWS access keys
4. **Monitor Access**: Use AWS CloudTrail to monitor S3 access

## IAM Policy Example

Here's a minimal IAM policy for S3 deployment:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::www.geuse.io",
                "arn:aws:s3:::www.geuse.io/*"
            ]
        }
    ]
}
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `npm run setup-aws` to verify your configuration
3. Check AWS CloudTrail for detailed error logs
4. Contact your AWS administrator for permission issues 