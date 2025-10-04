Product Requirements Overview

Real‑time 3D chat surface that pairs an animated particle scene (Three.js CSS3D) with a floating support dialog; must load instantly, never block scene animation, and remain functional when restored from scratch.
Persistent chat module with API-backed history (session id, webhook integration), solid keyboard/touch support, haptics, and accessibility (ARIA roles, live regions, focus traps).
Unified mobile optimizer handling viewport units, safe areas, keyboard adjustments, haptic feedback, and capability detection so the app behaves consistently across iOS/Android/desktop.
Centralized event architecture: EventHandler for window/viewport/keyboard; GestureHandler for touch gestures (tap/longtap/swipe) with hit testing; EventHandlers module for mouse/keyboard canvas interactions and focus styling.
Core Features

3D Scene: CSS3D particle system with multiple formations (plane, cube, sphere, random, spiral, fibonacci) and tweened transitions; camera managed via CameraManager (trackball controls, chat-aware zoom).
Chat Dialog:
Toggle via floating launcher (glitch.gif/fire.gif states) with preload and hint pill.
Lazy-loaded Chat class: builds DOM via safe utilities, stores messages, renders incrementally, traps focus, supports suggestion chips, handles API calls with makeApiCall, maintains local metrics.
API endpoints: sendMessage, loadPreviousSession (expects webhook integration defined in config.js).
Session persistence: random UUID v4 per load, uses local storage for hint suppression.
Accessibility: dialog role, aria-live log, aria-expanded on header button, keyboard shortcuts (Esc to close, Enter to send), focus outlines.
Interaction Requirements

Tap on canvas cycles scenes; keyboard Space cycles scenes if chat hidden.
Swipe gestures over chat: swipe-left hides dialog, swipe-right shows suggestions; gestures over canvas only affect scene (hit-testing prevents conflict).
Long-tap recognized for future extensions (currently logs & haptic feedback).
Mouse wheel over chat suggestions scrolls horizontally; over canvas zooms scene (preventDefault to block page scroll).
Canvas accessible by keyboard via tabIndex=0, aria-label, and focus outlines.
Performance & Resilience

Preload critical assets (launcher icons, sprite).
Chunked particle creation (50 per frame) to avoid blocking.
Mobile optimizer reduces filters when FPS drops, sets CSS variables for viewport/safe area, manages keyboard padding.
CSS critical section in index.html to avoid flash of unstyled content; should mirror main stylesheet.
Robust capability detection (EventHandler + MobileOptimizer) merged to avoid double UA parsing.
Responsive Behavior

Default desktop/tablet: chat anchored bottom-right above launcher, width/height via clamp.
Mobile (≤480px): centered dialog (translateX) with safe-area aware dimensions; keyboard/landscape breakpoints adjust height.
Additional height-based media queries for short viewports; iOS-specific support for dvh/svh.
Inline CSS in index.html must stay in sync with chat.css (avoid conflicting positioning rules).
Dependency Summary

Runtime: three, @tweenjs/tween.js.
Dev: vite.
Testing (previous): Playwright specs (responsive, interaction, fonts, CSS load), now removed but should be restored.
File/Module Map

index.html: shell, critical CSS, bootstraps src/index.js.
src/index.js: app entry (scene setup, camera, event wiring, chat lazy load, tap/gesture handling).
src/chat.js: chat logic/module.
src/modules/: eventHandlers.js (canvas-specific events), cameraManager.js.
src/core/: EventHandler.js (window/viewport/keyboard) and GestureHandler.js.
src/utils/: mobile/mobileOptimizer.js, apiUtils.js, domUtils.js, eventManager.js, cssLoadingGuard.js, themeManager.js, sceneGenerators.js.
Assets under public/media (glitch/fire GIFs, sprite).
Config + deploy scripts: config.js, deploy.js, generate-sw.js, etc.
Rebuild Checklist

Restore source tree (src/) with modules listed above, public assets, and supporting utils.
Reinstate styles: src/styles/chat.css plus inline critical CSS.
Bring back archived docs/tests if desired; key Playwright suites: interaction, responsiveness, gesture, CSS loading.
npm install (three, @tweenjs/tween.js, vite), npm run dev/build.
Verify on desktop + mobile (touch gestures, keyboard, haptics, theme switching).
Run Playwright test suite; confirm service worker generation if deploying.
Operational Requirements

Chat must fail gracefully on API errors (user-friendly messages).
Loggers (console.log) acceptable for debugging but can be toggled/removed in production build.
Ensure deploy scripts (S3/CloudFront) reflect current output.
This PRD should help you reconstitute the project to the state before accidental deletions: restore module structure, styling contracts, and interaction rules, then re-run tests to confirm parity.