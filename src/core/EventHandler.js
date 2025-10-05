/**
 * EventHandler - Centralized window/viewport/keyboard event management
 *
 * Handles:
 * - Window resize and orientation changes
 * - Visual Viewport API integration (keyboard visibility, iOS)
 * - Keyboard shortcuts and accessibility
 * - Capability detection (touch, mobile, platform)
 * - Event cleanup and memory management
 */

export class EventHandler {
    constructor() {
        this.listeners = new Map();
        this.capabilities = this.detectCapabilities();
        this.viewport = {
            width: window.innerWidth,
            height: window.innerHeight,
            scale: window.visualViewport?.scale || 1,
            offsetLeft: window.visualViewport?.offsetLeft || 0,
            offsetTop: window.visualViewport?.offsetTop || 0
        };
        this.keyboard = {
            visible: false,
            height: 0
        };
    }

    /**
     * Detect device and browser capabilities
     */
    detectCapabilities() {
        const ua = navigator.userAgent;
        const isIOS = /iPhone|iPad|iPod/i.test(ua);
        const isAndroid = /Android/i.test(ua);
        const isMobile = isIOS || isAndroid || /Mobile/i.test(ua);
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const hasVisualViewport = 'visualViewport' in window;
        const hasHaptics = 'vibrate' in navigator;
        const supportsPassive = this.testPassiveSupport();

        return {
            isIOS,
            isAndroid,
            isMobile,
            isDesktop: !isMobile,
            hasTouch,
            hasVisualViewport,
            hasHaptics,
            supportsPassive,
            platform: this.getPlatform(),
            browser: this.getBrowser()
        };
    }

    /**
     * Test for passive event listener support
     */
    testPassiveSupport() {
        let supportsPassive = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                get: function() {
                    supportsPassive = true;
                    return true;
                }
            });
            window.addEventListener('testPassive', null, opts);
            window.removeEventListener('testPassive', null, opts);
        } catch (e) {}
        return supportsPassive;
    }

    /**
     * Get platform name
     */
    getPlatform() {
        const ua = navigator.userAgent;
        if (/iPhone/i.test(ua)) return 'iPhone';
        if (/iPad/i.test(ua)) return 'iPad';
        if (/iPod/i.test(ua)) return 'iPod';
        if (/Android/i.test(ua)) return 'Android';
        if (/Mac/i.test(ua)) return 'Mac';
        if (/Win/i.test(ua)) return 'Windows';
        if (/Linux/i.test(ua)) return 'Linux';
        return 'Unknown';
    }

    /**
     * Get browser name
     */
    getBrowser() {
        const ua = navigator.userAgent;
        if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
        if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) return 'Chrome';
        if (/Firefox/i.test(ua)) return 'Firefox';
        if (/Edge/i.test(ua)) return 'Edge';
        if (/DuckDuckGo/i.test(ua)) return 'DuckDuckGo';
        return 'Unknown';
    }

    /**
     * Initialize all event listeners
     */
    init() {
        this.setupWindowEvents();
        this.setupViewportEvents();
        this.setupKeyboardEvents();
        this.updateViewport();
    }

    /**
     * Setup window resize and orientation change handlers
     */
    setupWindowEvents() {
        const resizeHandler = this.debounce(() => {
            this.updateViewport();
            this.emit('resize', this.viewport);
        }, 100);

        const orientationHandler = () => {
            // iOS needs delay for viewport stabilization
            setTimeout(() => {
                this.updateViewport();
                this.emit('orientationchange', this.viewport);
            }, 300);
        };

        this.on('window', 'resize', resizeHandler);
        this.on('window', 'orientationchange', orientationHandler);

        // iOS-specific page visibility events
        if (this.capabilities.isIOS) {
            this.on('window', 'pageshow', () => this.emit('pageshow'));
            this.on('window', 'pagehide', () => this.emit('pagehide'));
        }
    }

    /**
     * Setup Visual Viewport API handlers for keyboard visibility
     */
    setupViewportEvents() {
        if (!this.capabilities.hasVisualViewport) return;

        const viewport = window.visualViewport;

        const viewportHandler = () => {
            const oldHeight = this.viewport.height;
            this.updateViewport();

            // Detect keyboard visibility by viewport height change
            const heightDiff = oldHeight - this.viewport.height;
            if (heightDiff > 150) {
                this.keyboard.visible = true;
                this.keyboard.height = heightDiff;
                this.emit('keyboardshow', { height: heightDiff });
            } else if (heightDiff < -150) {
                this.keyboard.visible = false;
                this.keyboard.height = 0;
                this.emit('keyboardhide');
            }

            this.emit('viewportchange', this.viewport);
        };

        viewport.addEventListener('resize', viewportHandler);
        viewport.addEventListener('scroll', viewportHandler);

        this.listeners.set('visualViewport', [
            { event: 'resize', handler: viewportHandler },
            { event: 'scroll', handler: viewportHandler }
        ]);
    }

    /**
     * Setup keyboard event handlers
     */
    setupKeyboardEvents() {
        const keydownHandler = (e) => {
            this.emit('keydown', e);

            // Handle common shortcuts
            if (e.key === 'Escape') {
                this.emit('escape', e);
            } else if (e.key === ' ') {
                this.emit('space', e);
            } else if (e.key === 'Enter') {
                this.emit('enter', e);
            } else if (e.key === 'Tab') {
                this.emit('tab', e);
            }

            // Cmd/Ctrl combinations
            if (e.metaKey || e.ctrlKey) {
                this.emit('modifier', e);
            }
        };

        this.on('window', 'keydown', keydownHandler);
        this.on('window', 'keyup', (e) => this.emit('keyup', e));
    }

    /**
     * Update viewport dimensions and properties
     */
    updateViewport() {
        this.viewport.width = window.innerWidth;
        this.viewport.height = window.innerHeight;

        if (this.capabilities.hasVisualViewport) {
            const vp = window.visualViewport;
            this.viewport.scale = vp.scale;
            this.viewport.offsetLeft = vp.offsetLeft;
            this.viewport.offsetTop = vp.offsetTop;
            this.viewport.visualWidth = vp.width;
            this.viewport.visualHeight = vp.height;
        }

        // Update CSS custom properties
        document.documentElement.style.setProperty('--vh', `${this.viewport.height * 0.01}px`);
        document.documentElement.style.setProperty('--vw', `${this.viewport.width * 0.01}px`);
    }

    /**
     * Add event listener to window or element
     */
    on(target, event, handler, options = {}) {
        const element = target === 'window' ? window : target;
        const opts = this.capabilities.supportsPassive && options.passive !== false
            ? { ...options, passive: true }
            : options;

        element.addEventListener(event, handler, opts);

        // Store for cleanup
        const key = target === 'window' ? 'window' : 'custom';
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push({ event, handler, element, options: opts });
    }

    /**
     * Remove event listener
     */
    off(target, event, handler) {
        const element = target === 'window' ? window : target;
        element.removeEventListener(event, handler);

        // Remove from storage
        const key = target === 'window' ? 'window' : 'custom';
        const list = this.listeners.get(key);
        if (list) {
            const index = list.findIndex(l => l.event === event && l.handler === handler);
            if (index !== -1) {
                list.splice(index, 1);
            }
        }
    }

    /**
     * Event emitter for custom events
     */
    emit(eventName, data) {
        const event = new CustomEvent(`eventhandler:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Listen to custom events
     */
    listen(eventName, callback) {
        const handler = (e) => callback(e.detail);
        window.addEventListener(`eventhandler:${eventName}`, handler);
        return () => window.removeEventListener(`eventhandler:${eventName}`, handler);
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Cleanup all event listeners
     */
    destroy() {
        this.listeners.forEach((list, key) => {
            list.forEach(({ event, handler, element, options }) => {
                element.removeEventListener(event, handler, options);
            });
        });
        this.listeners.clear();
    }

    /**
     * Get current capabilities
     */
    getCapabilities() {
        return { ...this.capabilities };
    }

    /**
     * Get current viewport state
     */
    getViewport() {
        return { ...this.viewport };
    }

    /**
     * Get keyboard state
     */
    getKeyboard() {
        return { ...this.keyboard };
    }
}

// Export singleton instance
export const eventHandler = new EventHandler();
export default eventHandler;
