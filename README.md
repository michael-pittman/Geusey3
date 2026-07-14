# Geuse Chat

A 3D glassmorphic chat interface built with Three.js, featuring ultra-transparent design and n8n webhook integration. Live at [geuse.io](https://www.geuse.io).

## Features

- **3D Particle Visualization**: Six scene modes (plane, cube, sphere, random, spiral, fibonacci) with 512 CSS3D sprites
- **Glassmorphic Chat Interface**: Ultra-transparent liquid glass design with backdrop blur effects
- **Curator Link**: Floating icon linking to [Geuse Curator](https://www.geuse.io/curator/)
- **Smart Dark Mode**: System preference detection with manual toggle override
- **Enhanced UX**: First-run greeting, suggestion chips, discoverability hints
- **Accessibility**: Focus trap, reduced motion support, keyboard navigation (Section 508)
- **Haptic Feedback**: Tactile responses on supported devices
- **n8n Webhook Integration**: Real-time workflow processing and responses
- **AWS S3 Deployment**: Automated build and deployment with cache-optimized headers

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
Geusey3/
├── src/
│   ├── index.js           # Three.js particle system (6 visualization modes)
│   ├── chat.js            # Chat UI with n8n webhook integration
│   ├── core/              # EventHandler, GestureHandler
│   ├── modules/           # cameraManager, eventHandlers
│   ├── styles/chat.css    # Glassmorphic styling with CSS custom properties
│   └── utils/             # apiUtils, themeManager, sceneGenerators, mobileOptimizer
├── public/
│   ├── media/             # sprite.png, glitch.gif, fire.gif, framelink150x.png
│   ├── sw.js              # Service Worker template
│   ├── privacy.html       # Privacy policy
│   └── terms.html         # Terms of service
├── tests/                 # 15 Playwright test files
├── scripts/               # curator-ops.sh, update-webhook.js, setup-aws.js
├── docs/
│   ├── DEPLOYMENT.md      # AWS deployment guide
│   └── CURATOR_RUNBOOK.md # Curator backend ops runbook (stop/start safe)
├── config.js              # Webhook URL, S3, build settings
├── vite.config.js         # Build optimization, code splitting
├── deploy.js              # AWS S3 deployment with cache headers
├── generate-sw.js         # Service Worker generator from build output
└── playwright.config.ts   # Test configuration
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server (localhost:3000) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Deploy to S3 (run `build` first) |
| `npm run deploy:build` | Build and deploy in one command |
| `npm run curator:start` | Start Curator backend (EC2 + checks) |
| `npm run curator:stop` | Stop Curator backend EC2 instance |
| `npm run curator:restart` | Restart Curator backend |
| `npm run curator:status` | Show Curator backend status + run healthcheck |
| `npm run curator:healthcheck` | Check Curator backend endpoints used by the Curator UI |
| `npm run curator:db-stats` | Show Curator DB row counts for artworks + images (remote via SSM) |
| `npm run curator:import-opendata` | Full import from NGA Open Data (idempotent + verified, remote via SSM) |
| `npm run curator:sync-images` | Refresh Curator thumbnails in Postgres (remote via SSM) |
| `npm run update-webhook` | Update n8n webhook URL |
| `npm run setup-aws` | Verify AWS CLI and credentials |
| `npm test` | Run Playwright tests |
| `npm run test:ui` | Run Playwright tests with UI |

## AWS S3 Configuration

Deployment targets the S3 bucket `www.geuse.io` in `us-east-1`. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed setup. Required permissions:

- `s3:GetObject`
- `s3:PutObject`
- `s3:DeleteObject`
- `s3:ListBucket`

## Testing

Playwright tests cover:

- **Theme**: Dark/light mode switching and persistence
- **Chat UX**: First-run greeting, suggestions, focus trap, layout
- **Rendering**: Incremental message rendering, font accessibility
- **Responsive**: Mobile (iPhone 16 Pro), dynamic height validation

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
- Install Playwright browsers: `npx playwright install`
- Start the dev server for local tests: `npm start`

## License

This project is proprietary to Geuse. 
