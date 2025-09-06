# Geuse Chat - 3D Chat Interface with n8n Integration

A 3D chat interface built with Three.js that integrates with n8n workflows via webhooks.

## Features

- 3D particle visualization with multiple scene types
- Real-time chat interface
- n8n webhook integration
- AWS S3 deployment system
- Configurable webhook URLs

## Quick Start

### Development

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

### Configuration

The application uses a centralized configuration file (`config.js`) for easy management:

- **Webhook URL**: Update the n8n webhook URL
- **AWS S3 Settings**: Configure bucket, region, and profile
- **Build Settings**: Customize build output and optimization

### Updating Webhook URL

To update the webhook URL:

```bash
npm run update-webhook "https://your-new-webhook-url"
```

### Deployment to AWS S3

#### Prerequisites

1. Install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
2. Configure AWS credentials:
```bash
aws configure --profile default
```

#### Deploy

1. Build and deploy in one command:
```bash
npm run deploy:build
```

2. Or build and deploy separately:
```bash
npm run build
npm run deploy
```

The deployment script will:
- ✅ Check AWS CLI installation
- ✅ Verify AWS credentials
- 📦 Build the project with Vite
- 🌐 Upload to S3 bucket (www.geuse.io)
- 🔄 Invalidate CloudFront cache (if configured)

## Project Structure

```
Geusey3-1/
├── config.js              # Configuration file
├── deploy.js              # Deployment script
├── vite.config.js         # Vite configuration
├── package.json           # Dependencies and scripts
├── src/
│   ├── index.js           # Main 3D application
│   ├── chat.js            # Chat interface component
│   └── styles/
│       └── chat.css       # Chat styles
├── scripts/
│   └── update-webhook.js  # Webhook URL updater
└── public/                # Static assets
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run deploy` - Deploy to S3 (requires build first)
- `npm run deploy:build` - Build and deploy in one command
- `npm run update-webhook` - Update webhook URL

## AWS S3 Configuration

The deployment targets the S3 bucket `www.geuse.io` in the `us-east-1` region. Make sure your AWS credentials have the necessary permissions:

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

## Troubleshooting

### AWS CLI Issues
- Ensure AWS CLI is installed and in your PATH
- Verify credentials are configured correctly
- Check that your AWS profile has the necessary S3 permissions

### Build Issues
- Clear the `dist` directory and rebuild
- Check for syntax errors in the configuration files
- Ensure all dependencies are installed

### Webhook Issues
- Test the webhook URL manually before deployment
- Check n8n workflow status and logs
- Verify the webhook endpoint is accessible

## License

This project is proprietary to Geuse. 