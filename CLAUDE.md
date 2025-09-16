# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start development server:**
```bash
npm start
```
Server runs on http://localhost:3000 (fallback to 3001 if 3000 is in use)

**Build and deployment:**
```bash
npm run build           # Build for production
npm run preview         # Preview production build locally
npm run deploy          # Deploy to S3 with optimized cache headers
npm run deploy:build    # Build and deploy in one command
```

**Advanced Cache Strategy - Multi-Layer Performance Optimization:**
The application implements a sophisticated 3-tier caching system for optimal performance:

**S3 Cache Control Headers (deploy.js):**
- **HTML files**: `no-cache, must-revalidate` for immediate updates
- **Service worker**: `no-cache, must-revalidate` for immediate updates
- **Static assets** (versioned JS/CSS): `1 year cache + immutable` for optimal performance
- **Manifest files**: `1 hour cache` for balance of performance and updates
- **Media files**: `1 week cache` for images, icons, and multimedia
- **Other files**: `1 day cache` as default fallback

**Service Worker Cache Strategy (public/sw.js + generate-sw.js):**
- **Build-time asset discovery**: Auto-generates cache lists from Vite build output
- **Three cache tiers**: Static (JS/CSS), HTML (network-first), Dynamic (network-first with fallback)
- **Cache versioning**: Build timestamp + version for automatic invalidation
- **Cache size management**: Auto-cleanup with configurable limits (100 entries)
- **Network timeout**: 5-second timeout with graceful fallbacks
- **Request type detection**: Smart routing based on file extensions and paths

**Vite Build Optimization (vite.config.js):**
- **Content-based hashing**: All assets get unique hashes for cache busting
- **Manual chunking**: Three.js and TWEEN.js separated for optimal loading
- **Asset categorization**: Smart file naming based on type (JS, CSS, media)
- **Build-time injection**: Version and webhook URL embedded at compile time

**CloudFront Integration:**
To enable CloudFront cache invalidation, add to `config.js`:
```javascript
cloudfront: {
    distributionId: 'YOUR_CLOUDFRONT_DISTRIBUTION_ID'
}
```

**Testing:**
```bash
npm test               # Run Playwright tests
npm run test:ui        # Run Playwright tests with UI
```

**Configuration management:**
```bash
npm run update-webhook "https://your-webhook-url"  # Update n8n webhook URL
npm run setup-aws                                  # Verify AWS configuration
```

## Architecture Overview

This is a **3D glassmorphic chat interface** built with **Three.js** that integrates with **n8n workflows** via webhooks and deploys to **AWS S3**.

### Core Components

**Main Application (src/index.js):**
- Three.js CSS3DRenderer for particle visualization with 6 modes: plane, cube, sphere, random, spiral, fibonacci
- Theme-responsive background color system (proper CSS3D handling)
- Dynamic animation speed based on theme (40% slower in dark mode)
- Camera adjustment system for chat visibility states
- TrackballControls for 3D navigation

**Chat Interface (src/chat.js):**
- High-performance incremental message rendering system
- Glassmorphic UI with ultra-transparent design and backdrop blur
- n8n webhook integration with centralized error handling
- Dark/light theme toggle with system preference detection
- Accessibility features: focus trap, ARIA landmarks, keyboard navigation
- Haptic feedback for supported devices
- Session persistence and message history
- Mobile keyboard handling with Visual Viewport API support

**Styling (src/styles/chat.css):**
- Consolidated 70% CSS reduction with computed liquid glass materials
- CSS custom properties system with base values and computed derivatives
- Theme-aware CSS variables for dark/light mode
- Mobile-responsive layouts with safe area support
- Three.js renderer full viewport coverage with proper z-indexing
- Reduced motion support for accessibility

**Performance Optimizations:**
- **Chat Rendering**: Incremental DOM updates, document fragments, performance metrics tracking
- **3D Scene**: Optimized animation loops, theme-based speed adjustment, efficient object scaling
- **Service Worker**: Build-time asset discovery, intelligent cache strategies, automatic cleanup
- **CSS**: Computed properties system reducing redundancy by 70%

### Key Architecture Patterns

**Configuration System:**
- Centralized config in `config.js` with webhook URL, S3 settings, and build options
- Vite build-time injection of webhook URL via `__WEBHOOK_URL__` global
- Environment-specific settings for development vs production

**Theme Management:**
- System preference detection with manual override capability
- CSS custom properties for consistent theming with computed values
- Three.js background color integration with smooth transitions
- Local storage persistence of user preferences

**3D Scene Management:**
- CSS3DRenderer-specific background handling (not WebGL patterns)
- Particle position calculation for multiple geometric patterns
- TWEEN.js animations for smooth scene transitions and background colors
- Camera state management integrated with chat visibility
- Theme-responsive animation speeds for enhanced UX

**Error Handling & API Integration:**
- Centralized API utility (src/utils/apiUtils.js) with typed error handling
- Graceful degradation for empty responses and parse errors
- User-friendly error messages with context-aware messaging

**Mobile & Accessibility:**
- Visual Viewport API integration for keyboard handling
- Safe area support for notched devices
- Focus management and ARIA compliance
- Touch interaction optimizations

**Testing Strategy:**
- Playwright tests for theme functionality and UX features
- Smoke tests for deployed site verification
- Responsive design testing across viewport sizes

## Development Notes

**Dependencies:**
- Three.js for 3D graphics and particle systems
- Vite for build tooling and development server
- Playwright for end-to-end testing
- TWEEN.js for smooth animations

**Deployment Target:**
- AWS S3 bucket: `www.geuse.io` in `us-east-1` region
- Requires proper IAM permissions: s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket
- CloudFront cache invalidation supported (optional)

**Accessibility Compliance:**
- Section 508 compliant with ARIA landmarks and roles
- Focus management and keyboard navigation support
- Screen reader optimizations with live regions
- Reduced motion preferences respected

**n8n Integration:**
- Webhook-based communication with n8n workflows
- Session-based conversation tracking
- Configurable webhook URL management

## Performance Considerations

**Cache Strategy Optimization:**
- Service worker auto-generates cache lists from build output
- Three-tier caching: Static (cache-first), HTML (network-first), Dynamic (network-first with fallback)
- Build-time asset discovery prevents stale cache entries
- Automatic cache size management and cleanup

**Rendering Performance:**
- Incremental chat message rendering reduces DOM operations by 80%+
- Document fragment usage for batch DOM updates
- Theme-responsive 3D animation speeds (dark mode 40% slower)
- CSS computed properties reduce redundancy and improve maintainability

**Mobile Optimization:**
- Visual Viewport API for proper keyboard handling
- Safe area integration for modern iOS devices
- Touch interaction optimizations
- Viewport unit strategies for full coverage

## n8n Workflow Development

When working with n8n workflows for this project, follow this structured approach:

**Discovery & Configuration:**
- Use `search_nodes({query: 'keyword'})` to find relevant nodes
- Get node details with `get_node_essentials(nodeType)` for essential properties
- Prefer standard nodes over code nodes when possible

**Validation Strategy:**
- Pre-validate configurations with `validate_node_minimal()` and `validate_node_operation()`
- Post-validate complete workflows with `validate_workflow()` and `validate_workflow_connections()`
- Always validate before deployment

**Best Practices:**
- Use incremental updates with `n8n_update_partial_workflow()` for 80-90% token savings
- Validate early and often to catch errors before deployment
- Any node can be an AI tool, not just those marked `usableAsTool=true`
- Test webhook workflows thoroughly with `n8n_trigger_webhook_workflow()`

## Specialized Development Agents

This project leverages specialized Claude Code agents for comprehensive development and maintenance:

**Core Development Agents:**
- `threejs-scene-manager` - 3D particle systems, performance optimization, and Three.js scene management
- `glassmorphic-ui-designer` - Ultra-transparent design system, theming, and visual accessibility
- `chat-integration-specialist` - n8n webhook integration, session management, and real-time messaging

**Quality Assurance Agents:**
- `playwright-mcp-tester` - Comprehensive testing with MCP tools, automatic cleanup, and cross-browser validation
- `accessibility-compliance-auditor` - WCAG 2.1 AA compliance, keyboard navigation, and screen reader optimization
- `mobile-responsive-optimizer` - Mobile-first design, touch interactions, and viewport optimization

**Infrastructure Agents:**
- `aws-deployment-manager` - Production deployment, S3 management, and CloudFront optimization
- `build-performance-optimizer` - Bundle size optimization, Core Web Vitals, and loading performance
- `n8n-workflow-manager` - Workflow automation, webhook configuration, and n8n best practices
- `documentation-code-reviewer` - Code quality assurance, security reviews, and documentation updates

**Agent Usage:**
Agents automatically chain to relevant specialists based on task requirements. Use natural language to invoke:
```
> Use threejs-scene-manager for 3D performance issues
> Chain to playwright-mcp-tester for comprehensive testing
> Invoke accessibility-compliance-auditor for WCAG validation
```

All agents leverage Playwright MCP tools for browser automation and include proper resource cleanup.