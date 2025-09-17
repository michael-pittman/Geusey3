# Geuse Chat - 3D Glassmorphic Chat Interface with n8n Integration

A modern 3D chat interface built with Three.js featuring ultra-transparent glassmorphic design that integrates with n8n workflows via webhooks.

## Features

- **3D Particle Visualization**: Multiple scene types with interactive particle systems
- **Glassmorphic Chat Interface**: Ultra-transparent liquid glass design with backdrop blur effects
- **Smart Dark Mode**: System preference detection with manual toggle override
- **Enhanced UX**: First-run greeting, suggestion chips, discoverability hints
- **Accessibility**: Focus trap, reduced motion support, keyboard navigation
- **Haptic Feedback**: Tactile responses on supported devices
- **n8n Webhook Integration**: Real-time workflow processing and responses
- **AWS S3 Deployment**: Automated build and deployment system
- **Configurable Webhook URLs**: Easy webhook management and updates

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

3. Open http://localhost:3000 in your browser (or http://localhost:3001 if port 3000 is in use)

### Design Features

The chat interface features a modern glassmorphic design with:

- **Ultra-transparent glass panels** with backdrop blur effects
- **Liquid glass styling** for message bubbles with subtle gradients
- **Smart dark mode** with system detection and manual toggle override
- **Readable typography** with native OS fonts and optimized contrast
- **Smooth animations** and micro-interactions for enhanced UX
- **First-run experience** with greeting message and suggestion chips
- **Discoverability hints** with one-time pill to guide users
- **Responsive design** optimized for mobile, tablet, and desktop
- **Accessibility features** including focus management and reduced motion support

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
│   ├── index.js           # Main 3D application with theme initialization
│   ├── chat.js            # Chat interface with UX enhancements
│   └── styles/
│       └── chat.css       # Glassmorphic chat styles with dark mode
├── tests/
│   ├── theme.spec.ts      # Theme toggle and UX tests
│   └── smoke.spec.ts      # Deployed site verification
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
- `npm test` - Run Playwright tests
- `npm run test:ui` - Run Playwright tests with UI

## AWS S3 Configuration

The deployment targets the S3 bucket `www.geuse.io` in the `us-east-1` region. Make sure your AWS credentials have the necessary permissions:

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

## Testing

The project includes comprehensive Playwright tests for:

- **Theme Toggle**: Dark/light mode switching and persistence
- **UX Features**: First-run greeting, suggestions, focus trap
- **Smoke Tests**: Deployed site verification and asset loading
- **Responsive Design**: Mobile, tablet, and desktop viewport testing

Run tests with:
```bash
npm test              # Run all tests
npm run test:ui       # Run with Playwright UI
```

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

### Testing Issues
- Ensure Playwright browsers are installed: `npx playwright install`
- Check that the development server is running for local tests
- Verify network connectivity for smoke tests against deployed site

## License

This project is proprietary to Geuse. 