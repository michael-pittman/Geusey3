# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

```
Geusey3/
├── src/                           # Source code
│   ├── index.js                   # Main Three.js application (34KB)
│   ├── chat.js                    # Chat interface component (22KB)
│   ├── core/                      # Core event and interaction architecture
│   │   ├── EventHandler.js       # Window/viewport/keyboard event management
│   │   └── GestureHandler.js     # Touch gesture recognition (tap/longtap/swipe)
│   ├── modules/                   # Application modules
│   │   ├── cameraManager.js      # Camera state & TrackballControls management
│   │   └── eventHandlers.js      # Canvas-specific interaction handlers
│   ├── styles/
│   │   └── chat.css              # Glassmorphic styling with CSS custom properties
│   └── utils/
│       ├── apiUtils.js           # Centralized API calls & error handling
│       ├── themeManager.js       # Theme detection & persistence
│       ├── sceneGenerators.js    # Three.js scene position generators
│       ├── dynamicTypeManager.js # iOS Dynamic Type accessibility support
│       └── mobile/
│           └── mobileOptimizer.js # Mobile performance & FPS monitoring
├── public/                        # Static assets
│   ├── sw.js                     # Service Worker template
│   ├── media/                    # Images: sprite.png, glitch.gif, fire.gif
│   ├── privacy.html              # Privacy policy
│   └── terms.html                # Terms of service
├── tests/                         # Playwright test suite (14 test files)
│   ├── theme.spec.ts             # Theme toggle & persistence
│   ├── incremental-rendering.spec.ts
│   ├── font-accessibility-audit.spec.js
│   └── mobile-iphone16pro.spec.ts
├── scripts/                       # Utility scripts
│   ├── update-webhook.js         # Update n8n webhook URL
│   └── setup-aws.js              # AWS configuration verification
├── api/
│   └── proxy.js                  # API proxy (currently empty/unused)
├── .claude/                       # Claude Code agent configurations
│   ├── agents/                   # 6 specialized agent definitions
│   └── settings.local.json       # Local Claude settings
├── config.js                     # Centralized configuration
├── vite.config.js                # Vite build configuration
├── deploy.js                     # AWS S3 deployment script
├── generate-sw.js                # Service Worker generator
└── playwright.config.ts          # Playwright test configuration
```

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
- **Build-time injection**: Version (`__VERSION__`), build timestamp (`__BUILD_TIME__`), and webhook URL (`__WEBHOOK_URL__`) embedded at compile time
- **Automated service worker generation**: Vite plugin runs generate-sw.js after build completes

**CloudFront Integration:**
To enable CloudFront cache invalidation, add to `config.js`:
```javascript
cloudfront: {
    distributionId: 'YOUR_CLOUDFRONT_DISTRIBUTION_ID'
}
```

**Testing:**
```bash
npm test                              # Run all Playwright tests
npm run test:ui                       # Run Playwright tests with UI
npx playwright test <test-file>       # Run specific test file
npx playwright test --grep "<pattern>" # Run tests matching pattern
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
- Integrated event architecture with EventHandler, GestureHandler, and CameraManager
- Chunked particle creation (50 per frame) to prevent UI blocking
- FPS monitoring and performance tracking
- Modular interaction system with scene cycling, swipe gestures, and touch optimization

**Chat Interface (src/chat.js):**
- High-performance incremental message rendering system
- Glassmorphic UI with ultra-transparent design and backdrop blur
- n8n webhook integration with centralized error handling (apiUtils.js)
- Dark/light theme toggle with system preference detection (themeManager.js)
- Accessibility features: focus trap, ARIA landmarks, keyboard navigation
- Haptic feedback for supported devices
- Session persistence and message history
- Mobile keyboard handling with Visual Viewport API support
- Performance metrics tracking: render times, incremental vs full renders
- Email fallback: mailto link in header when chat offline

**Styling:**
- **[src/styles/chat.css](src/styles/chat.css)**: Main glassmorphic styling with CSS custom properties system
- **[src/styles/chat-enhanced.css](src/styles/chat-enhanced.css)**: Additional enhancements (if being developed)
- Consolidated 70% CSS reduction with computed liquid glass materials
- CSS custom properties system with base values and computed derivatives
- Theme-aware CSS variables for dark/light mode
- Mobile-responsive layouts with safe area support
- Three.js renderer full viewport coverage with proper z-indexing
- Reduced motion support for accessibility

**Performance Optimizations:**
- **Chat Rendering**: Incremental DOM updates, document fragments, performance metrics tracking
- **3D Scene**: Optimized animation loops, theme-based speed adjustment, chunked particle creation (50/frame)
- **Mobile Performance**: Real-time FPS monitoring with automatic CSS filter reduction below 45 FPS
- **Service Worker**: Build-time asset discovery, intelligent cache strategies, automatic cleanup
- **CSS**: Computed properties system reducing redundancy by 70%
- **Interaction**: Hit testing to prevent gesture conflicts, debounced event handlers, efficient event delegation

### Key Architecture Patterns

**Configuration System:**
- Centralized config in `config.js` with webhook URL, S3 settings, and build options
- Vite build-time injection of webhook URL via `__WEBHOOK_URL__` global
- Environment-specific settings for development vs production
- Scripts for updating webhook URL and AWS setup verification

**Theme Management (src/utils/themeManager.js):**
- System preference detection with manual override capability
- CSS custom properties for consistent theming with computed values
- Three.js background color integration with smooth transitions (#edcfcf light, #141416 dark)
- Local storage persistence with safe fallbacks
- Meta theme-color updates for mobile status bars

**3D Scene Management (src/utils/sceneGenerators.js):**
- CSS3DRenderer-specific background handling (not WebGL patterns)
- Six particle visualization modes: plane, cube, sphere, random, spiral, fibonacci
- Particle position calculation for multiple geometric patterns
- TWEEN.js animations for smooth scene transitions and background colors
- Camera state management integrated with chat visibility
- Theme-responsive animation speeds for enhanced UX (40% slower in dark mode)
- Global window.getThreeJSScene() for testing and debugging

**Error Handling & API Integration (src/utils/apiUtils.js):**
- Centralized API utility with typed error handling (5 error types)
- createFetchConfig(), handleApiResponse(), makeApiCall() utilities
- Graceful degradation for empty responses and parse errors
- User-friendly error messages with context-aware messaging
- CORS, network, HTTP, parse, and empty response error types

**Event Architecture (src/core/):**
- **EventHandler.js**: Centralized window/viewport/keyboard event management with capability detection
- **GestureHandler.js**: Touch gesture recognition (tap, long-tap, swipe) with hit testing to distinguish canvas vs chat interactions
- Event delegation pattern with proper cleanup and memory management
- Custom event system for cross-module communication

**Interaction System (src/modules/):**
- **cameraManager.js**: Camera state management with chat-aware positioning and smooth TWEEN transitions
- **eventHandlers.js**: Canvas-specific interactions including scene cycling, mouse wheel routing, and keyboard shortcuts
- Mouse wheel routing: canvas zoom vs suggestions horizontal scroll with hit testing
- Keyboard shortcuts: Space key cycles scenes when chat is hidden
- Touch optimization with pinch-to-zoom and swipe gesture support

**Mobile Optimization (src/utils/mobile/):**
- **mobileOptimizer.js**: FPS monitoring (60 target, 45 threshold) with automatic CSS filter reduction
- Viewport unit management (dvh, svh) with fallbacks for older browsers
- Keyboard detection and dynamic padding using Visual Viewport API
- Haptic feedback utilities with intensity levels (light, medium, heavy)
- iOS/Android capability detection and feature gating

**Mobile & Accessibility:**
- iOS Dynamic Type support via dynamicTypeManager.js
- Visual Viewport API integration for keyboard handling and viewport management
- Safe area support for notched devices (env(safe-area-inset-*))
- Focus management and ARIA compliance (Section 508)
- Touch interaction optimizations with haptic feedback (tap, long-tap, swipe)
- Reduced motion preferences respected (@media prefers-reduced-motion)

**User Interaction Features:**
- **Tap on canvas**: Cycles through 6 3D formations (plane → cube → sphere → random → spiral → fibonacci)
- **Long-tap on canvas**: Triggers haptic feedback (ready for future context menu features)
- **Swipe left on chat**: Hides chat dialog with smooth animation
- **Swipe right on chat**: Shows suggestion chips for quick actions
- **Mouse wheel on canvas**: Zooms in/out on 3D scene (TrackballControls)
- **Mouse wheel on suggestions**: Horizontal scroll through suggestion chips
- **Space key**: Cycles scenes when chat is hidden (keyboard accessibility)
- **Pinch gesture**: Zoom on 3D scene (mobile touch optimization)
- All gestures use hit testing to distinguish canvas vs chat interactions

**Testing Strategy:**
- Playwright test suite with 14 test files
- Cross-browser testing: Chromium, Firefox, WebKit
- Theme functionality and UX feature validation
- Font accessibility audits and iOS-specific tests
- Mobile responsive testing (iPhone 16 Pro viewport)
- Incremental rendering performance tests
- Gesture and interaction testing (tap, swipe, long-tap)
- 30-second timeout, retain-on-failure traces

## Development Notes

**Dependencies (package.json):**
- `three@^0.160.0` - 3D graphics and particle systems (CSS3DRenderer, TrackballControls)
- `@tweenjs/tween.js@^25.0.0` - Smooth animations for scene transitions
- `vite@^5.0.0` - Build tooling and development server
- `@playwright/test@^1.55.0` - End-to-end testing framework

**Deployment Target:**
- AWS S3 bucket: `www.geuse.io` in `us-east-1` region
- Requires proper IAM permissions: s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket
- CloudFront cache invalidation supported (optional, configured in config.js)
- Automated deployment via deploy.js with cache headers
- Manual verification via scripts/setup-aws.js

**Accessibility Compliance:**
- Section 508 compliant with ARIA landmarks and roles
- Focus management and keyboard navigation support
- Screen reader optimizations with live regions
- Reduced motion preferences respected (@media prefers-reduced-motion)
- iOS Dynamic Type support for text scaling
- Haptic feedback on supported devices
- High contrast mode compatible

**n8n Integration:**
- Webhook URL: `https://n8n.geuse.io/webhook/a1688d74-03ad-42fa-99b7-a6a4f2211030`
- Session-based conversation tracking with generated session IDs
- Configurable webhook URL management via scripts/update-webhook.js
- POST requests with JSON payload (sessionId, message)
- Centralized error handling with user-friendly messages

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

## File Organization & Key Files

**Core Application Files:**
- [src/index.js](src/index.js) - Three.js particle system with 6 visualization modes, camera management
- [src/chat.js](src/chat.js) - Chat UI with incremental rendering, webhook integration, accessibility
- [src/styles/chat.css](src/styles/chat.css) - Glassmorphic design with CSS custom properties system

**Core Architecture:**
- [src/core/EventHandler.js](src/core/EventHandler.js) - Window/viewport/keyboard event management, capability detection
- [src/core/GestureHandler.js](src/core/GestureHandler.js) - Touch gesture recognition (tap/longtap/swipe) with hit testing

**Application Modules:**
- [src/modules/cameraManager.js](src/modules/cameraManager.js) - Camera state management, TrackballControls, chat-aware positioning
- [src/modules/eventHandlers.js](src/modules/eventHandlers.js) - Canvas interactions, scene cycling, mouse wheel routing, keyboard shortcuts

**Utility Modules:**
- [src/utils/apiUtils.js](src/utils/apiUtils.js) - API error handling, typed errors, user-friendly messages
- [src/utils/themeManager.js](src/utils/themeManager.js) - Theme detection, persistence, meta tag updates
- [src/utils/sceneGenerators.js](src/utils/sceneGenerators.js) - Six geometric position generators
- [src/utils/dynamicTypeManager.js](src/utils/dynamicTypeManager.js) - iOS accessibility font scaling
- [src/utils/mobile/mobileOptimizer.js](src/utils/mobile/mobileOptimizer.js) - FPS monitoring, filter reduction, haptic feedback

**Configuration & Build:**
- [config.js](config.js) - Webhook URL, S3 bucket, CloudFront, build settings
- [vite.config.js](vite.config.js) - Build optimization, asset hashing, code splitting
- [generate-sw.js](generate-sw.js) - Auto-generates service worker from build output
- [deploy.js](deploy.js) - AWS S3 deployment with cache control headers

**Service Worker System:**
- [public/sw.js](public/sw.js) - Service worker template with cache strategies
- Build-time asset discovery via generate-sw.js
- Three-tier caching: static (cache-first), HTML (network-first), dynamic (network-first)
- Version-based cache invalidation using build timestamp

**Testing Infrastructure:**
- [playwright.config.ts](playwright.config.ts) - Test configuration, 3 browsers, 30s timeout
- [tests/](tests/) - 14 test files covering themes, rendering, accessibility, mobile
- Test categories: integration, layout, font audits, performance validation

**Documentation:**
- [README.md](README.md) - Project overview and quick start
- [DEPLOYMENT.md](DEPLOYMENT.md) - AWS deployment instructions
- [ACCESSIBILITY_INTEGRATION_GUIDE.md](ACCESSIBILITY_INTEGRATION_GUIDE.md) - Accessibility features
- [FONT_VALIDATION_REPORT.md](FONT_VALIDATION_REPORT.md) - Font rendering analysis
- [PRD.md](PRD.md) - Product requirements document

**Static Assets:**
- [public/media/](public/media/) - sprite.png, glitch.gif, fire.gif
- [public/](public/) - Favicons, manifest, privacy.html, terms.html
- All assets get content hashes during build for cache busting

**Agent Configuration:**
- [.claude/agents/](/.claude/agents/) - 6 specialized agent definitions
- [.claude/settings.local.json](/.claude/settings.local.json) - Local Claude settings

**Unused/Legacy Files:**
- [api/proxy.js](api/proxy.js) - Empty file, potential future API proxy
- [src/Refrenceindex.html](src/Refrenceindex.html) - Empty reference file
- [scripts/archive/](scripts/archive/) - Archived utility scripts

## Specialized Development Agents

This project leverages specialized Claude Code agents for comprehensive development and maintenance:

**Core Development Agents:**
- `threejs-developer` - 3D particle systems, performance optimization, and Three.js scene management
- `ui-designer` - Ultra-transparent design system, glassmorphic theming, and visual accessibility
- `integration-specialist` - n8n webhook integration, session management, and real-time messaging

**Quality Assurance Agents:**
- `testing-engineer` - Comprehensive testing with Playwright MCP, automatic cleanup, cross-browser validation
- `documentation-specialist` - Code quality assurance, security reviews, documentation updates

**Infrastructure & Orchestration:**
- `orchestrator` - Main coordinator for task decomposition and parallel agent execution

**Agent Locations:**
- [.claude/agents/threejs-developer.md](/.claude/agents/threejs-developer.md)
- [.claude/agents/ui-designer.md](/.claude/agents/ui-designer.md)
- [.claude/agents/integration-specialist.md](/.claude/agents/integration-specialist.md)
- [.claude/agents/testing-engineer.md](/.claude/agents/testing-engineer.md)
- [.claude/agents/documentation-specialist.md](/.claude/agents/documentation-specialist.md)
- [.claude/agents/orchestrator.md](/.claude/agents/orchestrator.md)

**Agent Usage:**
Agents automatically chain to relevant specialists based on task requirements. All agents leverage Playwright MCP tools for browser automation and include proper resource cleanup.