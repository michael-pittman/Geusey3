import * as THREE from 'three';
import { CSS3DRenderer, CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import TWEEN from 'three/addons/libs/tween.module.js';
import { initializeTheme, getCurrentTheme } from './utils/themeManager.js';
import { generateAllScenes } from './utils/sceneGenerators.js';
import './styles/chat.css';

let camera, scene, renderer;
let controls;
let chat = null;

// Expose scene variables globally for testing and debugging
if (typeof window !== 'undefined') {
    window.getThreeJSScene = () => ({ camera, scene, renderer, controls });
}

// Store original camera settings for chat state management
let originalCameraPosition = { x: 600, y: 400, z: 1500 };
let originalMinDistance = 500;
let originalMaxDistance = 6000;

const particlesTotal = 512;
const positions = [];
const objects = [];
let current = 0;
const sceneNames = ['plane', 'cube', 'sphere', 'random', 'spiral', 'fibonacci'];
let currentScene = 'plane';
let isTransitioning = false;

// Simple time tracking for animation
let animationTime = 0;

// Lazy load chat component
async function loadChat() {
    if (!chat) {
        const Chat = (await import('./chat.js')).default;
        chat = new Chat();
        // Set up callback for camera adjustment
        chat.onVisibilityChange = adjustCameraForChat;
    }
    return chat;
}

// Function to adjust camera distance based on chat visibility
function adjustCameraForChat(isChatActive) {
    if (!camera || !controls) return;

    if (isChatActive) {
        // Move camera further away when chat is active
        const newPosition = {
            x: originalCameraPosition.x * 1.5,
            y: originalCameraPosition.y * 1.2,
            z: originalCameraPosition.z * 1.8
        };

        // Smoothly animate camera to new position
        new TWEEN.Tween(camera.position)
            .to(newPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // Adjust controls to allow closer/further zoom
        controls.minDistance = originalMinDistance * 0.8;
        controls.maxDistance = originalMaxDistance * 1.5;
    } else {
        // Return camera to original position when chat is closed
        new TWEEN.Tween(camera.position)
            .to(originalCameraPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // Restore original control settings
        controls.minDistance = originalMinDistance;
        controls.maxDistance = originalMaxDistance;
    }
}

// Function to update scene background based on current theme with smooth transitions
// Note: CSS3DRenderer doesn't use traditional WebGL scene.background - we handle via CSS
async function updateSceneBackground() {
    const currentTheme = getCurrentTheme();

    // Import theme colors from themeManager to maintain consistency
    const { THEME_COLORS } = await import('./utils/themeManager.js');

    const targetColor = THEME_COLORS[currentTheme];

    // For CSS3DRenderer, we need to update the document body background
    // This creates the background behind the CSS3D elements
    const body = document.body;
    const currentBodyColor = window.getComputedStyle(body).backgroundColor;

    // Convert hex to rgb for smooth transition
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    };

    const targetRgb = hexToRgb(targetColor);
    if (!targetRgb) return;

    // Get current color or use a default
    let currentRgb = { r: 237, g: 207, b: 207 }; // default light color

    // Parse current background color if it exists
    const rgbMatch = currentBodyColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (rgbMatch) {
        currentRgb = {
            r: parseInt(rgbMatch[1]),
            g: parseInt(rgbMatch[2]),
            b: parseInt(rgbMatch[3])
        };
    }

    // Create smooth color transition using TWEEN
    new TWEEN.Tween(currentRgb)
        .to({
            r: targetRgb.r,
            g: targetRgb.g,
            b: targetRgb.b
        }, 800) // 800ms transition for smooth feel
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
            const r = Math.round(currentRgb.r);
            const g = Math.round(currentRgb.g);
            const b = Math.round(currentRgb.b);
            body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        })
        .start();
}

// Setup theme change observer to automatically update scene background
function setupThemeObserver() {

    // Create MutationObserver to watch for data-theme attribute changes
    const themeObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' &&
                mutation.attributeName === 'data-theme' &&
                mutation.target === document.documentElement) {
                updateSceneBackground().catch(console.error);
            }
        });
    });

    // Start observing data-theme attribute changes on document element
    themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    return themeObserver;
}

function createChatIconSprite() {
    const div = document.createElement('div');
    div.id = 'chat-icon';
    div.style.cssText = `
        position: fixed !important;
        bottom: calc(20px + env(safe-area-inset-bottom, 0px)) !important;
        right: calc(20px + env(safe-area-inset-right, 0px)) !important;
        left: auto !important;
        width: 60px !important;
        height: 60px !important;
        cursor: pointer !important;
        z-index: 1002 !important;
        pointer-events: auto !important;
        user-select: none !important;
        touch-action: manipulation !important;
    `;
    div.setAttribute('aria-label', 'Open chat');
    div.setAttribute('tabindex', '0');

    const img = document.createElement('img');
    img.src = 'https://www.geuse.io/media/glitch.gif';
    img.alt = 'Open chat interface';
    img.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        border-radius: 8px !important;
        pointer-events: none !important;
        user-select: none !important;
        -webkit-user-drag: none !important;
    `;
    img.loading = 'eager'; // Since this is above the fold
    img.draggable = false;
    div.appendChild(img);

    // One-time discoverability hint
    try {
        if (!localStorage.getItem('hint_shown')) {
            const pill = document.createElement('div');
            pill.className = 'chat-hint-pill';
            pill.textContent = 'Chat with us';
            document.body.appendChild(pill);
            setTimeout(() => { pill.style.opacity = '0'; }, 3000);
            setTimeout(() => { pill.remove(); }, 3800);
            localStorage.setItem('hint_shown', '1');
        }
    } catch (_) {}

    div.addEventListener('click', async () => {
        const chatInstance = await loadChat();
        const isVisible = chatInstance.toggle();
        img.src = isVisible ? 'https://www.geuse.io/media/fire.gif' : 'https://www.geuse.io/media/glitch.gif';
    });

    document.body.appendChild(div);
    return div;
}

function generatePositions() {
    positions.length = 0;
    const allScenePositions = generateAllScenes(particlesTotal);
    positions.push(...allScenePositions);
}

function setScene(sceneName) {
    currentScene = sceneName;
    // Set target positions for all objects
    const offset = sceneNames.indexOf(sceneName) * particlesTotal * 3;
    for (let i = 0, j = offset; i < particlesTotal; i++, j += 3) {
        objects[i].userData.target = {
            x: positions[j],
            y: positions[j + 1],
            z: positions[j + 2]
        };
    }

    // Objects will be transitioning to new positions
}

function init() {
    try {
        // Initialize theme using shared theme manager
        initializeTheme();
        // Initialize with lower resolution for better initial load
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        
        // Get viewport dimensions using dynamic viewport units for better mobile support
        // CRITICAL: Calculate extended viewport dimensions including safe areas
        let viewportWidth = window.innerWidth;
        let viewportHeight = window.innerHeight;
        
        // Extend dimensions to cover safe areas if supported
        if (CSS.supports('top: env(safe-area-inset-top)')) {
            // Get safe area insets - these will be 0 if not supported
            const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')) || 0;
            const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
            const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left')) || 0;
            const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right')) || 0;
            
            viewportWidth += safeAreaLeft + safeAreaRight;
            viewportHeight += safeAreaTop + safeAreaBottom;
        }
        
        // Support for dynamic viewport height on mobile
        document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        document.documentElement.style.setProperty('--vw', `${window.innerWidth * 0.01}px`);
        
        camera = new THREE.PerspectiveCamera(75, viewportWidth / viewportHeight, 1, 5000);
        camera.position.set(600, 400, 1500);
        camera.lookAt(0, 0, 0);
        
        scene = new THREE.Scene();
        // Set initial background color based on current theme
        updateSceneBackground().catch(console.error);

        // Setup theme change observer to automatically update background
        setupThemeObserver();
        
        // CRITICAL: Ensure chat icon is created and positioned before 3D renderer
        createChatIconSprite();
        
        // Defensive check to ensure chat icon visibility
        const chatIcon = document.getElementById('chat-icon');
        if (chatIcon) {
            // Force proper stacking and visibility
            chatIcon.style.setProperty('z-index', '1000', 'important');
            chatIcon.style.setProperty('pointer-events', 'auto', 'important');
            chatIcon.style.setProperty('position', 'fixed', 'important');
        }
        
        generatePositions();
        
        const image = document.createElement('img');
        image.loading = 'eager'; // Critical asset
        image.addEventListener('load', function () {
            // Create objects in chunks to prevent UI blocking
            const chunkSize = 50;
            let currentChunk = 0;
            
            function createChunk() {
                const start = currentChunk * chunkSize;
                const end = Math.min(start + chunkSize, particlesTotal);
                
                for (let i = start; i < end; i++) {
                    const clonedImage = image.cloneNode();
                    // Section 508 compliance: Mark decorative images
                    clonedImage.alt = '';
                    clonedImage.setAttribute('role', 'presentation');
                    clonedImage.setAttribute('aria-hidden', 'true');
                    
                    const object = new CSS3DSprite(clonedImage);
                    object.position.x = Math.random() * 4000 - 2000;
                    object.position.y = Math.random() * 4000 - 2000;
                    object.position.z = Math.random() * 4000 - 2000;
                    object.userData.target = { x: 0, y: 0, z: 0 };
                    // Store initial random offset for natural variation
                    object.userData.randomOffset = Math.random() * Math.PI * 2;
                    scene.add(object);
                    objects.push(object);
                }
                
                currentChunk++;
                if (currentChunk * chunkSize < particlesTotal) {
                    requestAnimationFrame(createChunk);
                } else {
                    setScene(currentScene);
                    transition();
                }
            }

            createChunk();
        });
        
        image.src = 'https://www.geuse.io/media/sprite.png';
        
        // Create a dedicated container for the renderer - FULL VIEWPORT COVERAGE WITH INTERACTION
        const rendererContainer = document.createElement('div');
        rendererContainer.id = 'threejs-renderer-container';
        rendererContainer.className = 'threejs-renderer';
        
        // CRITICAL FIX: Position renderer for absolute full viewport coverage including safe areas
        rendererContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 1 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            pointer-events: auto !important;
            overflow: hidden !important;
            background: transparent !important;
            user-select: none !important;
            touch-action: pan-x pan-y !important;
        `;
        
        // ENHANCED: Add safe area extension for devices that support it
        if (CSS.supports('top: env(safe-area-inset-top)')) {
            rendererContainer.style.setProperty('top', 'calc(-1 * env(safe-area-inset-top, 0px))', 'important');
            rendererContainer.style.setProperty('left', 'calc(-1 * env(safe-area-inset-left, 0px))', 'important');
            rendererContainer.style.setProperty('width', 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))', 'important');
            rendererContainer.style.setProperty('height', 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))', 'important');
        }
        
        // ENHANCED: Support for modern dynamic viewport units
        if (CSS.supports('width: 100dvw')) {
            // Use dynamic viewport units for better mobile coverage
            rendererContainer.style.setProperty('width', '100dvw', 'important');
            rendererContainer.style.setProperty('height', '100dvh', 'important');
            
            // Apply safe area extension on top of dynamic viewport units
            if (CSS.supports('top: env(safe-area-inset-top)')) {
                rendererContainer.style.setProperty('width', 'calc(100dvw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))', 'important');
                rendererContainer.style.setProperty('height', 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))', 'important');
            }
        }
        
        // Performance optimizations for full viewport rendering
        rendererContainer.style.willChange = 'transform';
        rendererContainer.style.transform = 'translateZ(0)';
        rendererContainer.style.backfaceVisibility = 'hidden';
        
        // Insert at the very beginning of body to ensure it's behind all content
        if (document.body.firstChild) {
            document.body.insertBefore(rendererContainer, document.body.firstChild);
        } else {
            document.body.appendChild(rendererContainer);
        }
        
        
        // CRITICAL: Defensive positioning check for absolute full viewport coverage
        setTimeout(() => {
            const container = document.getElementById('threejs-renderer-container');
            if (container) {
                // Ensure full viewport coverage is maintained
                container.style.setProperty('position', 'fixed', 'important');
                container.style.setProperty('top', '0', 'important');
                container.style.setProperty('left', '0', 'important');
                container.style.setProperty('right', '0', 'important');
                container.style.setProperty('bottom', '0', 'important');
                container.style.setProperty('width', '100vw', 'important');
                container.style.setProperty('height', '100vh', 'important');
                container.style.setProperty('z-index', '1', 'important');
                container.style.setProperty('pointer-events', 'auto', 'important');
                container.style.setProperty('touch-action', 'pan-x pan-y', 'important');
                
                // Apply safe area extension if supported
                if (CSS.supports('top: env(safe-area-inset-top)')) {
                    container.style.setProperty('top', 'calc(-1 * env(safe-area-inset-top, 0px))', 'important');
                    container.style.setProperty('left', 'calc(-1 * env(safe-area-inset-left, 0px))', 'important');
                    container.style.setProperty('width', 'calc(100vw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))', 'important');
                    container.style.setProperty('height', 'calc(100vh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))', 'important');
                }
                
                // Use dynamic viewport units if available
                if (CSS.supports('width: 100dvw')) {
                    container.style.setProperty('width', '100dvw', 'important');
                    container.style.setProperty('height', '100dvh', 'important');
                    
                    if (CSS.supports('top: env(safe-area-inset-top)')) {
                        container.style.setProperty('width', 'calc(100dvw + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))', 'important');
                        container.style.setProperty('height', 'calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))', 'important');
                    }
                }
            }
        }, 100);
        
        renderer = new CSS3DRenderer();
        renderer.setSize(viewportWidth, viewportHeight);
        
        // Configure renderer canvas for full viewport coverage with interaction
        const canvas = renderer.domElement;
        canvas.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            outline: none !important;
            background: transparent !important;
            pointer-events: auto !important;
            user-select: none !important;
            touch-action: pan-x pan-y !important;
        `;
        
        // Ensure canvas covers the full container
        canvas.setAttribute('data-engine', 'three.js');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.setAttribute('role', 'presentation');
        
        rendererContainer.appendChild(canvas);
        
        // Enhanced touch event handlers to prevent unwanted page scrolling
        let isInteracting = false;
        let touchCount = 0;
        
        const handleTouchStart = (e) => {
            if (e.target === canvas || e.target === rendererContainer) {
                isInteracting = true;
                touchCount = e.touches.length;
                
                // Allow single touch for rotation, multi-touch for zoom/pan
                if (touchCount >= 1) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };
        
        const handleTouchMove = (e) => {
            if (isInteracting && (e.target === canvas || e.target === rendererContainer)) {
                // Always prevent scrolling during 3D interaction
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        const handleTouchEnd = (e) => {
            if (e.target === canvas || e.target === rendererContainer) {
                touchCount = e.touches.length;
                if (touchCount === 0) {
                    isInteracting = false;
                }
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        const handleMouseInteraction = (e) => {
            if (e.target === canvas || e.target === rendererContainer) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        const handleWheel = (e) => {
            if (e.target === canvas || e.target === rendererContainer) {
                // Prevent page zoom, allow 3D scene zoom
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        // Add enhanced touch event listeners
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        
        // Add mouse event listeners for desktop consistency
        canvas.addEventListener('mousedown', handleMouseInteraction);
        canvas.addEventListener('mousemove', (e) => {
            // Only prevent mouse move if actively dragging
            if (e.buttons > 0) {
                handleMouseInteraction(e);
            }
        });
        canvas.addEventListener('mouseup', handleMouseInteraction);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        
        // Prevent context menu on long press (mobile) or right click
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Ensure UI elements stay above the interactive canvas
        const existingChatIcon = document.getElementById('chat-icon');
        if (existingChatIcon) {
            existingChatIcon.style.setProperty('z-index', '1002', 'important');
            existingChatIcon.style.setProperty('pointer-events', 'auto', 'important');
        }
        
        // Configure TrackballControls with proper touch support
        controls = new TrackballControls(camera, renderer.domElement);
        controls.minDistance = 500;
        controls.maxDistance = 6000;
        
        // Enhanced touch and interaction settings - optimized for mobile
        controls.rotateSpeed = 1.5;  // Increased for better mobile responsiveness
        controls.zoomSpeed = 1.8;    // Increased for better pinch-to-zoom feel
        controls.panSpeed = 1.0;     // Balanced for touch panning
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = false; // Allow momentum for better mobile feel
        controls.dynamicDampingFactor = 0.15; // Smoother damping for touch
        
        // Enable all interaction types
        controls.enabled = true;
        
        // Touch-specific optimizations
        controls.keys = [ 65, 83, 68 ]; // A, S, D for keyboard interaction
        
        // Mobile-specific touch handling
        controls.touchMode = 'rotate'; // Default touch mode
        
        // Ensure canvas can receive focus for keyboard controls
        canvas.tabIndex = 0;
        canvas.setAttribute('role', 'application');
        canvas.setAttribute('aria-label', '3D particle scene - use mouse or touch to navigate, pinch to zoom');
        
        // Add focus indicators for accessibility
        canvas.addEventListener('focus', () => {
            canvas.style.outline = '2px solid rgba(91, 182, 248, 0.5)';
            canvas.style.outlineOffset = '2px';
        });
        
        canvas.addEventListener('blur', () => {
            canvas.style.outline = 'none';
        });
        
        // OPTIMIZED: Enhanced resize handling for full viewport coverage
        let resizeTimeout;
        const optimizedResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                onWindowResize();
                // Force renderer reposition after resize with iOS safe area support
                const container = document.getElementById('threejs-renderer-container');
                if (container) {
                    container.style.setProperty('top', 'var(--threejs-top, 0)', 'important');
                    container.style.setProperty('left', 'var(--threejs-left, 0)', 'important');
                    container.style.setProperty('width', 'var(--threejs-width, 100vw)', 'important');
                    container.style.setProperty('height', 'var(--threejs-height, 100vh)', 'important');
                    if (CSS.supports('width: 100dvw')) {
                        container.style.setProperty('width', 'var(--full-viewport-width, 100dvw)', 'important');
                        container.style.setProperty('height', 'var(--full-viewport-height, 100dvh)', 'important');
                    }
                }
            }, 100);
        };
        
        window.addEventListener('resize', optimizedResize);
        window.addEventListener('orientationchange', () => {
            // Handle orientation changes with delay for viewport stabilization
            setTimeout(optimizedResize, 300);
        });
        
        // iOS-specific viewport handling for safe area changes
        if (window.navigator.userAgent.includes('iPhone') || window.navigator.userAgent.includes('iPad')) {
            // Handle iOS viewport changes and safe area updates
            const handleIOSViewportChange = () => {
                // Force CSS custom property recalculation
                document.documentElement.style.setProperty('--force-recalc', Math.random().toString());
                
                // Update renderer after iOS viewport stabilization
                setTimeout(() => {
                    optimizedResize();
                    // Force safe area recalculation
                    const container = document.getElementById('threejs-renderer-container');
                    if (container) {
                        container.style.setProperty('top', 'var(--threejs-top, 0)', 'important');
                        container.style.setProperty('left', 'var(--threejs-left, 0)', 'important');
                        container.style.setProperty('width', 'var(--full-viewport-width, 100dvw)', 'important');
                        container.style.setProperty('height', 'var(--full-viewport-height, 100dvh)', 'important');
                    }
                }, 500);
            };
            
            // Visual Viewport API for iOS keyboard and UI changes
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', handleIOSViewportChange);
                window.visualViewport.addEventListener('scroll', handleIOSViewportChange);
            }
            
            // iOS-specific events
            window.addEventListener('pageshow', handleIOSViewportChange);
            window.addEventListener('pagehide', handleIOSViewportChange);
        }

        // Start animation loop
        animate();
    } catch (error) {
        console.error('Error initializing Three.js:', error);
    }
}

function onWindowResize() {
    // CRITICAL: Calculate extended viewport dimensions for resize handling
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    
    // Extend dimensions to cover safe areas if supported
    if (CSS.supports('top: env(safe-area-inset-top)')) {
        // Get safe area insets - these will be 0 if not supported
        const safeAreaTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top')) || 0;
        const safeAreaBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')) || 0;
        const safeAreaLeft = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left')) || 0;
        const safeAreaRight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right')) || 0;
        
        viewportWidth += safeAreaLeft + safeAreaRight;
        viewportHeight += safeAreaTop + safeAreaBottom;
    }
    
    // Update dynamic viewport units for mobile browsers
    document.documentElement.style.setProperty('--vh', `${viewportHeight * 0.01}px`);
    document.documentElement.style.setProperty('--vw', `${viewportWidth * 0.01}px`);
    
    // Update renderer container dimensions for full viewport coverage with iOS safe area support
    const rendererContainer = document.getElementById('threejs-renderer-container');
    if (rendererContainer) {
        // Ensure full viewport coverage on resize with safe area extension
        rendererContainer.style.setProperty('top', 'var(--threejs-top, 0)', 'important');
        rendererContainer.style.setProperty('left', 'var(--threejs-left, 0)', 'important');
        rendererContainer.style.setProperty('width', 'var(--threejs-width, 100vw)', 'important');
        rendererContainer.style.setProperty('height', 'var(--threejs-height, 100vh)', 'important');
        
        // Use dynamic viewport units with safe area extension if supported
        if (CSS.supports('width: 100dvw')) {
            rendererContainer.style.setProperty('width', 'var(--full-viewport-width, 100dvw)', 'important');
            rendererContainer.style.setProperty('height', 'var(--full-viewport-height, 100dvh)', 'important');
        }
    }
    
    camera.aspect = viewportWidth / viewportHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(viewportWidth, viewportHeight);
}

function transition() {
    isTransitioning = true;

    // Pick a new scene
    let nextIdx = sceneNames.indexOf(currentScene);
    while (nextIdx === sceneNames.indexOf(currentScene)) {
        nextIdx = Math.floor(Math.random() * sceneNames.length);
    }
    const nextScene = sceneNames[nextIdx];
    setScene(nextScene);

    const duration = 4000;
    let tweensCompleted = 0;

    // Create smooth, sequential transitions with better timing
    for (let i = 0; i < particlesTotal; i++) {
        const object = objects[i];

        // Add small sequential delay for more organic flow
        const delay = (i / particlesTotal) * 500; // 500ms spread across all particles
        const individualDuration = duration + (Math.random() * 2000); // Varying duration for natural flow

        new TWEEN.Tween(object.position)
            .to({
                x: object.userData.target.x,
                y: object.userData.target.y,
                z: object.userData.target.z,
            }, individualDuration)
            .delay(delay)
            .easing(TWEEN.Easing.Exponential.InOut)
            .onComplete(() => {
                tweensCompleted++;
                if (tweensCompleted === particlesTotal) {
                    // Add small buffer before ending transition to ensure all animations settle
                    setTimeout(() => {
                        isTransitioning = false;
                    }, 200);
                }
            })
            .start();
    }

    // Schedule next transition with consistent timing
    new TWEEN.Tween({})
        .to({}, duration * 6)
        .onComplete(() => {
            transition();
        })
        .start();
}

function animate() {
    requestAnimationFrame(animate);

    // Update animation time
    animationTime = performance.now() * 0.001;

    // Update TWEEN animations
    TWEEN.update();

    // Update camera controls
    if (controls) {
        controls.update();
    }

    // Simple, clean animation loop - based on Three.js CSS3D sprite reference pattern
    // Apply smooth scaling animation to all objects without complex optimizations
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        if (object && object.scale && object.position) {
            // Reference implementation: position and time based scaling for organic movement
            // This creates the classic "breathing" effect seen in Three.js CSS3D examples
            const positionFactor = (object.position.x + object.position.z) * 0.001;

            // Adjust animation speed based on current theme - slower in dark mode for calmer effect
            const currentTheme = getCurrentTheme();
            const themeSpeedMultiplier = currentTheme === 'dark' ? 0.6 : 1.0; // 40% slower in dark mode
            const timeFactor = animationTime * 2.0 * themeSpeedMultiplier;
            const baseAnimation = Math.sin(positionFactor + timeFactor) * 0.3 + 1.0;

            // Add subtle random variation for natural feel
            const randomOffset = object.userData.randomOffset || 0;
            const variation = Math.sin(animationTime * 1.5 * themeSpeedMultiplier + randomOffset) * 0.1;

            const finalScale = baseAnimation + variation;
            object.scale.setScalar(finalScale);
        }
    }

    // Render the scene
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Simple performance monitoring (development only)
if (window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1')) {
    let frameCount = 0;
    let lastTime = performance.now();

    setInterval(() => {
        const currentTime = performance.now();
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        console.log(`3D Performance: ${fps}fps | Objects: ${objects.length} | Scene: ${currentScene}`);
        frameCount = 0;
        lastTime = currentTime;
    }, 1000);

    // Count frames
    const originalAnimate = animate;
    animate = function() {
        originalAnimate();
        frameCount++;
    };
}

// Initialize the scene
init(); 