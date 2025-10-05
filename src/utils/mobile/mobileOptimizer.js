/**
 * MobileOptimizer - Mobile-specific performance optimizations and capability management
 *
 * Handles:
 * - FPS monitoring and automatic filter reduction when performance drops
 * - Viewport unit management (dvh, svh, safe areas)
 * - Keyboard appearance detection and padding adjustment
 * - Haptic feedback integration
 * - Capability detection (unified with EventHandler)
 * - CSS custom property management for mobile
 */

export class MobileOptimizer {
    constructor(options = {}) {
        this.options = {
            targetFPS: 60,
            fpsThreshold: 45, // Drop filters if FPS falls below this
            fpsCheckInterval: 1000, // Check FPS every second
            enableHaptics: true,
            enableFPSMonitoring: true,
            autoReduceFilters: true,
            ...options
        };

        this.state = {
            fps: 60,
            averageFPS: 60,
            isLowPerformance: false,
            filtersReduced: false,
            keyboardVisible: false,
            keyboardHeight: 0,
            safeAreaInsets: {
                top: 0,
                right: 0,
                bottom: 0,
                left: 0
            }
        };

        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsHistory = [];
        this.maxFPSHistory = 10; // Keep last 10 FPS readings

        this.capabilities = null; // Will be set from EventHandler
    }

    /**
     * Initialize mobile optimizer
     */
    init(eventHandler = null) {
        if (eventHandler) {
            this.capabilities = eventHandler.getCapabilities();
        }

        this.setupSafeAreas();
        this.setupViewportUnits();
        this.setupKeyboardDetection(eventHandler);

        if (this.options.enableFPSMonitoring && this.capabilities?.isMobile) {
            this.startFPSMonitoring();
        }
    }

    /**
     * Setup safe area CSS custom properties
     */
    setupSafeAreas() {
        const root = document.documentElement;

        // Get safe area inset values
        if (CSS.supports('top: env(safe-area-inset-top)')) {
            const computedStyle = getComputedStyle(root);

            this.state.safeAreaInsets = {
                top: parseInt(computedStyle.getPropertyValue('--safe-area-inset-top')) || 0,
                right: parseInt(computedStyle.getPropertyValue('--safe-area-inset-right')) || 0,
                bottom: parseInt(computedStyle.getPropertyValue('--safe-area-inset-bottom')) || 0,
                left: parseInt(computedStyle.getPropertyValue('--safe-area-inset-left')) || 0
            };

            // Set CSS custom properties for safe areas
            root.style.setProperty('--safe-area-top', `${this.state.safeAreaInsets.top}px`);
            root.style.setProperty('--safe-area-right', `${this.state.safeAreaInsets.right}px`);
            root.style.setProperty('--safe-area-bottom', `${this.state.safeAreaInsets.bottom}px`);
            root.style.setProperty('--safe-area-left', `${this.state.safeAreaInsets.left}px`);
        }
    }

    /**
     * Setup viewport unit CSS custom properties
     */
    setupViewportUnits() {
        const root = document.documentElement;

        // Standard viewport units
        root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
        root.style.setProperty('--vw', `${window.innerWidth * 0.01}px`);

        // Dynamic viewport units (if supported)
        if (CSS.supports('height: 1dvh')) {
            root.style.setProperty('--dvh', '1dvh');
            root.style.setProperty('--dvw', '1dvw');
        } else {
            root.style.setProperty('--dvh', `${window.innerHeight * 0.01}px`);
            root.style.setProperty('--dvw', `${window.innerWidth * 0.01}px`);
        }

        // Small viewport units (if supported)
        if (CSS.supports('height: 1svh')) {
            root.style.setProperty('--svh', '1svh');
            root.style.setProperty('--svw', '1svw');
        } else {
            root.style.setProperty('--svh', `${window.innerHeight * 0.01}px`);
            root.style.setProperty('--svw', `${window.innerWidth * 0.01}px`);
        }

        // Large viewport units (if supported)
        if (CSS.supports('height: 1lvh')) {
            root.style.setProperty('--lvh', '1lvh');
            root.style.setProperty('--lvw', '1lvw');
        } else {
            root.style.setProperty('--lvh', `${window.innerHeight * 0.01}px`);
            root.style.setProperty('--lvw', `${window.innerWidth * 0.01}px`);
        }

        // Three.js renderer full viewport coverage
        const safeAreaTop = this.state.safeAreaInsets.top;
        const safeAreaBottom = this.state.safeAreaInsets.bottom;
        const safeAreaLeft = this.state.safeAreaInsets.left;
        const safeAreaRight = this.state.safeAreaInsets.right;

        root.style.setProperty('--threejs-top', `calc(-1 * ${safeAreaTop}px)`);
        root.style.setProperty('--threejs-left', `calc(-1 * ${safeAreaLeft}px)`);
        root.style.setProperty('--threejs-width', `calc(100vw + ${safeAreaLeft + safeAreaRight}px)`);
        root.style.setProperty('--threejs-height', `calc(100vh + ${safeAreaTop + safeAreaBottom}px)`);

        if (CSS.supports('width: 100dvw')) {
            root.style.setProperty('--full-viewport-width', `calc(100dvw + ${safeAreaLeft + safeAreaRight}px)`);
            root.style.setProperty('--full-viewport-height', `calc(100dvh + ${safeAreaTop + safeAreaBottom}px)`);
        }
    }

    /**
     * Setup keyboard detection and padding adjustment
     */
    setupKeyboardDetection(eventHandler) {
        if (!eventHandler) return;

        // Listen for keyboard show/hide events from EventHandler
        eventHandler.listen('keyboardshow', (data) => {
            this.state.keyboardVisible = true;
            this.state.keyboardHeight = data.height;

            // Set CSS custom property for keyboard padding
            document.documentElement.style.setProperty('--keyboard-padding', `${data.height}px`);

            this.emit('keyboardshow', data);
        });

        eventHandler.listen('keyboardhide', () => {
            this.state.keyboardVisible = false;
            this.state.keyboardHeight = 0;

            // Reset keyboard padding
            document.documentElement.style.setProperty('--keyboard-padding', '0px');

            this.emit('keyboardhide');
        });

        // Update viewport units on resize
        eventHandler.listen('resize', () => {
            this.setupViewportUnits();
        });
    }

    /**
     * Start FPS monitoring
     */
    startFPSMonitoring() {
        this.fpsInterval = setInterval(() => {
            const currentTime = performance.now();
            const deltaTime = currentTime - this.lastTime;

            if (deltaTime > 0) {
                this.state.fps = Math.round((this.frameCount * 1000) / deltaTime);
                this.fpsHistory.push(this.state.fps);

                // Keep only recent history
                if (this.fpsHistory.length > this.maxFPSHistory) {
                    this.fpsHistory.shift();
                }

                // Calculate average FPS
                this.state.averageFPS = Math.round(
                    this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
                );

                // Check if performance is low
                const wasLowPerformance = this.state.isLowPerformance;
                this.state.isLowPerformance = this.state.averageFPS < this.options.fpsThreshold;

                // Auto-reduce filters if performance drops
                if (this.options.autoReduceFilters && this.state.isLowPerformance && !wasLowPerformance) {
                    this.reduceFilters();
                }

                // Restore filters if performance improves
                if (this.options.autoReduceFilters && !this.state.isLowPerformance && wasLowPerformance) {
                    this.restoreFilters();
                }

                this.emit('fpsupdate', {
                    fps: this.state.fps,
                    averageFPS: this.state.averageFPS,
                    isLowPerformance: this.state.isLowPerformance
                });
            }

            this.frameCount = 0;
            this.lastTime = currentTime;
        }, this.options.fpsCheckInterval);
    }

    /**
     * Count frame (call in animation loop)
     */
    countFrame() {
        this.frameCount++;
    }

    /**
     * Reduce CSS filters for better performance
     */
    reduceFilters() {
        if (this.state.filtersReduced) return;

        const root = document.documentElement;

        // Reduce backdrop blur
        root.style.setProperty('--glass-base-blur', '16px'); // Reduced from 32px

        // Reduce saturation and effects
        root.style.setProperty('--glass-base-saturation', '125%'); // Reduced from 175%
        root.style.setProperty('--glass-base-brightness', '105%'); // Reduced from 108%

        // Disable shadows
        root.style.setProperty('--shadow-base-blur', '8px'); // Reduced from 16px

        this.state.filtersReduced = true;
        this.emit('filtersreduced');
    }

    /**
     * Restore full CSS filters
     */
    restoreFilters() {
        if (!this.state.filtersReduced) return;

        const root = document.documentElement;

        // Restore original values
        root.style.setProperty('--glass-base-blur', '32px');
        root.style.setProperty('--glass-base-saturation', '175%');
        root.style.setProperty('--glass-base-brightness', '108%');
        root.style.setProperty('--shadow-base-blur', '16px');

        this.state.filtersReduced = false;
        this.emit('filtersrestored');
    }

    /**
     * Trigger haptic feedback
     */
    haptic(intensity = 'light') {
        if (!this.options.enableHaptics || !navigator.vibrate) return;

        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [10, 50, 10],
            error: [10, 50, 10, 50, 10]
        };

        try {
            navigator.vibrate(patterns[intensity] || patterns.light);
        } catch (e) {
            // Silent fail
        }
    }

    /**
     * Emit custom event
     */
    emit(eventName, data = {}) {
        const event = new CustomEvent(`mobileoptimizer:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Listen to custom events
     */
    on(eventName, callback) {
        const handler = (e) => callback(e.detail);
        window.addEventListener(`mobileoptimizer:${eventName}`, handler);
        return () => window.removeEventListener(`mobileoptimizer:${eventName}`, handler);
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Get FPS metrics
     */
    getFPSMetrics() {
        return {
            fps: this.state.fps,
            averageFPS: this.state.averageFPS,
            isLowPerformance: this.state.isLowPerformance,
            history: [...this.fpsHistory]
        };
    }

    /**
     * Stop FPS monitoring
     */
    stopFPSMonitoring() {
        if (this.fpsInterval) {
            clearInterval(this.fpsInterval);
            this.fpsInterval = null;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopFPSMonitoring();
    }
}

export default MobileOptimizer;
