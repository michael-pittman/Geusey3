/**
 * CameraManager - Manages camera state, controls, and chat-aware positioning
 *
 * Handles:
 * - TrackballControls setup and configuration
 * - Chat-aware camera positioning (zoom out when chat is active)
 * - Smooth camera transitions with TWEEN.js
 * - Camera state persistence
 * - Accessibility (keyboard controls, focus management)
 */

import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

export class CameraManager {
    constructor(camera, renderer) {
        if (!camera || !renderer) {
            throw new Error('CameraManager requires camera and renderer instances');
        }

        this.camera = camera;
        this.renderer = renderer;
        this.controls = null;

        // Store original camera settings for chat state management
        this.originalPosition = {
            x: camera.position.x,
            y: camera.position.y,
            z: camera.position.z
        };

        this.originalDistance = {
            min: 500,
            max: 6000
        };

        this.state = {
            isChatActive: false,
            isTransitioning: false
        };
    }

    /**
     * Initialize TrackballControls with optimized settings
     */
    init() {
        this.controls = new TrackballControls(this.camera, this.renderer.domElement);

        // Configure control settings
        this.controls.minDistance = this.originalDistance.min;
        this.controls.maxDistance = this.originalDistance.max;

        // Enhanced touch and interaction settings - optimized for mobile
        this.controls.rotateSpeed = 1.5;  // Increased for better mobile responsiveness
        this.controls.zoomSpeed = 1.8;    // Increased for better pinch-to-zoom feel
        this.controls.panSpeed = 1.0;     // Balanced for touch panning
        this.controls.noZoom = false;
        this.controls.noPan = false;
        this.controls.staticMoving = false; // Allow momentum for better mobile feel
        this.controls.dynamicDampingFactor = 0.15; // Smoother damping for touch

        // Enable all interaction types
        this.controls.enabled = true;

        // Keyboard controls
        this.controls.keys = [ 65, 83, 68 ]; // A, S, D for keyboard interaction

        // Touch-specific optimizations
        this.controls.touchMode = 'rotate'; // Default touch mode

        this.setupAccessibility();
    }

    /**
     * Setup accessibility features for camera controls
     */
    setupAccessibility() {
        const canvas = this.renderer.domElement;

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
    }

    /**
     * Adjust camera distance based on chat visibility
     */
    adjustForChat(isChatActive) {
        if (!this.camera || !this.controls) return;

        // Prevent multiple simultaneous transitions
        if (this.state.isTransitioning) return;

        this.state.isChatActive = isChatActive;
        this.state.isTransitioning = true;

        if (isChatActive) {
            // Move camera further away when chat is active
            const newPosition = {
                x: this.originalPosition.x * 1.5,
                y: this.originalPosition.y * 1.2,
                z: this.originalPosition.z * 1.8
            };

            // Smoothly animate camera to new position
            new TWEEN.Tween(this.camera.position)
                .to(newPosition, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    this.state.isTransitioning = false;
                })
                .start();

            // Adjust controls to allow closer/further zoom
            this.controls.minDistance = this.originalDistance.min * 0.8;
            this.controls.maxDistance = this.originalDistance.max * 1.5;
        } else {
            // Return camera to original position when chat is closed
            new TWEEN.Tween(this.camera.position)
                .to(this.originalPosition, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onComplete(() => {
                    this.state.isTransitioning = false;
                })
                .start();

            // Restore original control settings
            this.controls.minDistance = this.originalDistance.min;
            this.controls.maxDistance = this.originalDistance.max;
        }
    }

    /**
     * Update controls (call in animation loop)
     */
    update() {
        if (this.controls) {
            this.controls.update();
        }
    }

    /**
     * Set camera position
     */
    setPosition(x, y, z) {
        if (!this.camera) return;
        this.camera.position.set(x, y, z);
        this.originalPosition = { x, y, z };
    }

    /**
     * Set distance limits
     */
    setDistanceLimits(min, max) {
        this.originalDistance = { min, max };
        if (this.controls) {
            this.controls.minDistance = min;
            this.controls.maxDistance = max;
        }
    }

    /**
     * Get current camera position
     */
    getPosition() {
        if (!this.camera) return { x: 0, y: 0, z: 0 };
        return {
            x: this.camera.position.x,
            y: this.camera.position.y,
            z: this.camera.position.z
        };
    }

    /**
     * Get camera state
     */
    getState() {
        return {
            ...this.state,
            position: this.getPosition(),
            originalPosition: { ...this.originalPosition },
            distanceLimits: { ...this.originalDistance }
        };
    }

    /**
     * Enable/disable controls
     */
    setEnabled(enabled) {
        if (this.controls) {
            this.controls.enabled = enabled;
        }
    }

    /**
     * Reset camera to original position
     */
    reset() {
        if (!this.camera) return;

        new TWEEN.Tween(this.camera.position)
            .to(this.originalPosition, 1000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        if (this.controls) {
            this.controls.minDistance = this.originalDistance.min;
            this.controls.maxDistance = this.originalDistance.max;
        }

        this.state.isChatActive = false;
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.controls) {
            this.controls.dispose();
            this.controls = null;
        }
    }
}

export default CameraManager;
