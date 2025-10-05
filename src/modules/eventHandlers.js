/**
 * Event Handlers Module - Canvas-specific mouse, keyboard, and interaction handlers
 *
 * Handles:
 * - Mouse wheel events (zoom for canvas, horizontal scroll for chat suggestions)
 * - Keyboard shortcuts (Space to cycle scenes when chat is hidden)
 * - Touch interaction optimization (prevent unwanted scrolling)
 * - Focus management and accessibility
 */

export class CanvasEventHandlers {
    constructor(canvas, options = {}) {
        if (!canvas) {
            throw new Error('CanvasEventHandlers requires a canvas element');
        }

        this.canvas = canvas;
        this.options = {
            preventScroll: true,
            enableKeyboard: true,
            enableWheel: true,
            wheelZoomSpeed: 1.0,
            ...options
        };

        this.listeners = new Map();
        this.state = {
            isInteracting: false,
            touchCount: 0,
            isChatVisible: false
        };
    }

    /**
     * Initialize all canvas event handlers
     */
    init() {
        this.setupTouchHandlers();
        this.setupMouseHandlers();
        this.setupWheelHandler();
        this.setupKeyboardHandlers();
        this.setupContextMenu();
    }

    /**
     * Setup touch event handlers to prevent unwanted page scrolling
     */
    setupTouchHandlers() {
        const handleTouchStart = (e) => {
            if (e.target === this.canvas || this.canvas.contains(e.target)) {
                this.state.isInteracting = true;
                this.state.touchCount = e.touches.length;

                // Allow single touch for rotation, multi-touch for zoom/pan
                if (this.state.touchCount >= 1 && this.options.preventScroll) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        const handleTouchMove = (e) => {
            if (this.state.isInteracting && (e.target === this.canvas || this.canvas.contains(e.target))) {
                // Always prevent scrolling during 3D interaction
                if (this.options.preventScroll) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        const handleTouchEnd = (e) => {
            if (e.target === this.canvas || this.canvas.contains(e.target)) {
                this.state.touchCount = e.touches.length;
                if (this.state.touchCount === 0) {
                    this.state.isInteracting = false;
                }
                if (this.options.preventScroll) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        this.canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        this.canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        this.listeners.set('touch', [
            { event: 'touchstart', handler: handleTouchStart },
            { event: 'touchmove', handler: handleTouchMove },
            { event: 'touchend', handler: handleTouchEnd },
            { event: 'touchcancel', handler: handleTouchEnd }
        ]);
    }

    /**
     * Setup mouse event handlers for desktop consistency
     */
    setupMouseHandlers() {
        const handleMouseInteraction = (e) => {
            if (e.target === this.canvas || this.canvas.contains(e.target)) {
                if (this.options.preventScroll) {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
        };

        const handleMouseMove = (e) => {
            // Only prevent mouse move if actively dragging
            if (e.buttons > 0) {
                handleMouseInteraction(e);
            }
        };

        this.canvas.addEventListener('mousedown', handleMouseInteraction);
        this.canvas.addEventListener('mousemove', handleMouseMove);
        this.canvas.addEventListener('mouseup', handleMouseInteraction);

        this.listeners.set('mouse', [
            { event: 'mousedown', handler: handleMouseInteraction },
            { event: 'mousemove', handler: handleMouseMove },
            { event: 'mouseup', handler: handleMouseInteraction }
        ]);
    }

    /**
     * Setup mouse wheel handler
     * - Over canvas: zoom scene
     * - Over chat suggestions: horizontal scroll
     */
    setupWheelHandler() {
        if (!this.options.enableWheel) return;

        const handleWheel = (e) => {
            const target = e.target;

            // Check if wheel is over chat suggestions
            const suggestions = target.closest('.chat-suggestions');
            if (suggestions && !suggestions.hidden) {
                // Allow horizontal scrolling for suggestions
                // Convert vertical wheel to horizontal scroll
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    suggestions.scrollLeft += e.deltaY;
                    e.preventDefault();
                }
                return;
            }

            // Canvas zoom - prevent page zoom
            if (target === this.canvas || this.canvas.contains(target)) {
                e.preventDefault();
                e.stopPropagation();

                // Emit custom event for zoom handling
                this.emit('canvaswheel', {
                    delta: e.deltaY * this.options.wheelZoomSpeed,
                    x: e.clientX,
                    y: e.clientY
                });
            }
        };

        this.canvas.addEventListener('wheel', handleWheel, { passive: false });

        // Also listen on document for suggestions scrolling
        document.addEventListener('wheel', handleWheel, { passive: false });

        this.listeners.set('wheel', [
            { event: 'wheel', handler: handleWheel }
        ]);
    }

    /**
     * Setup keyboard event handlers
     * - Space: cycle scenes (when chat is hidden)
     * - Other shortcuts as needed
     */
    setupKeyboardHandlers() {
        if (!this.options.enableKeyboard) return;

        const handleKeyDown = (e) => {
            // Only handle keyboard when canvas is focused or chat is not visible
            if (document.activeElement === this.canvas || !this.state.isChatVisible) {
                if (e.key === ' ' || e.code === 'Space') {
                    // Space to cycle scenes (only when chat is hidden)
                    if (!this.state.isChatVisible) {
                        e.preventDefault();
                        this.emit('cyclescenes');
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        this.listeners.set('keyboard', [
            { event: 'keydown', handler: handleKeyDown }
        ]);
    }

    /**
     * Prevent context menu on long press (mobile) or right click
     */
    setupContextMenu() {
        const preventContextMenu = (e) => {
            if (e.target === this.canvas || this.canvas.contains(e.target)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        this.canvas.addEventListener('contextmenu', preventContextMenu);

        this.listeners.set('contextmenu', [
            { event: 'contextmenu', handler: preventContextMenu }
        ]);
    }

    /**
     * Update chat visibility state
     */
    setChatVisible(isVisible) {
        this.state.isChatVisible = isVisible;
    }

    /**
     * Emit custom event
     */
    emit(eventName, data = {}) {
        const event = new CustomEvent(`canvasevents:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Listen to custom events
     */
    on(eventName, callback) {
        const handler = (e) => callback(e.detail);
        window.addEventListener(`canvasevents:${eventName}`, handler);
        return () => window.removeEventListener(`canvasevents:${eventName}`, handler);
    }

    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Cleanup all event listeners
     */
    destroy() {
        this.listeners.forEach((list, key) => {
            const target = key === 'keyboard' ? window : this.canvas;
            list.forEach(({ event, handler }) => {
                if (key === 'wheel' && event === 'wheel') {
                    // Remove from both canvas and document
                    this.canvas.removeEventListener(event, handler);
                    document.removeEventListener(event, handler);
                } else {
                    target.removeEventListener(event, handler);
                }
            });
        });
        this.listeners.clear();
    }
}

/**
 * Setup interaction handlers for scene cycling and gestures
 */
export class InteractionHandlers {
    constructor(options = {}) {
        this.options = {
            sceneCyclingEnabled: true,
            swipeEnabled: true,
            longTapEnabled: true,
            ...options
        };

        this.sceneNames = ['plane', 'cube', 'sphere', 'random', 'spiral', 'fibonacci'];
        this.currentSceneIndex = 0;
        this.callbacks = {
            onSceneChange: null,
            onSwipeLeft: null,
            onSwipeRight: null,
            onLongTap: null
        };
    }

    /**
     * Initialize interaction handlers with gesture and canvas event handlers
     */
    init(gestureHandler, canvasEventHandler) {
        this.gestureHandler = gestureHandler;
        this.canvasEventHandler = canvasEventHandler;

        this.setupSceneCycling();
        this.setupSwipeGestures();
        this.setupLongTap();
        this.setupKeyboardCycling();
    }

    /**
     * Setup tap-on-canvas scene cycling
     */
    setupSceneCycling() {
        if (!this.options.sceneCyclingEnabled || !this.gestureHandler) return;

        this.gestureHandler.on('tap', (data) => {
            // Only cycle scenes if tapping on canvas
            if (data.target === 'canvas') {
                this.cycleScene();
            }
        });
    }

    /**
     * Setup swipe gestures
     * - Swipe left over chat: hide dialog
     * - Swipe right over chat: show suggestions
     * - Swipe over canvas: no action (canvas gestures handled by controls)
     */
    setupSwipeGestures() {
        if (!this.options.swipeEnabled || !this.gestureHandler) return;

        this.gestureHandler.on('swipeleft', (data) => {
            if (data.target === 'chat') {
                this.emit('swipeleft');
                if (this.callbacks.onSwipeLeft) {
                    this.callbacks.onSwipeLeft();
                }
            }
        });

        this.gestureHandler.on('swiperight', (data) => {
            if (data.target === 'chat') {
                this.emit('swiperight');
                if (this.callbacks.onSwipeRight) {
                    this.callbacks.onSwipeRight();
                }
            }
        });
    }

    /**
     * Setup long-tap gesture recognition
     */
    setupLongTap() {
        if (!this.options.longTapEnabled || !this.gestureHandler) return;

        this.gestureHandler.on('longtap', (data) => {
            this.emit('longtap', data);
            if (this.callbacks.onLongTap) {
                this.callbacks.onLongTap(data);
            }
        });
    }

    /**
     * Setup keyboard scene cycling (Space key)
     */
    setupKeyboardCycling() {
        if (!this.canvasEventHandler) return;

        this.canvasEventHandler.on('cyclescenes', () => {
            this.cycleScene();
        });
    }

    /**
     * Cycle to next scene
     */
    cycleScene() {
        this.currentSceneIndex = (this.currentSceneIndex + 1) % this.sceneNames.length;
        const nextScene = this.sceneNames[this.currentSceneIndex];

        this.emit('scenechange', { scene: nextScene, index: this.currentSceneIndex });

        if (this.callbacks.onSceneChange) {
            this.callbacks.onSceneChange(nextScene);
        }
    }

    /**
     * Set current scene by name
     */
    setScene(sceneName) {
        const index = this.sceneNames.indexOf(sceneName);
        if (index !== -1) {
            this.currentSceneIndex = index;
        }
    }

    /**
     * Register callback for scene changes
     */
    onSceneChange(callback) {
        this.callbacks.onSceneChange = callback;
    }

    /**
     * Register callback for swipe left
     */
    onSwipeLeft(callback) {
        this.callbacks.onSwipeLeft = callback;
    }

    /**
     * Register callback for swipe right
     */
    onSwipeRight(callback) {
        this.callbacks.onSwipeRight = callback;
    }

    /**
     * Register callback for long-tap
     */
    onLongTap(callback) {
        this.callbacks.onLongTap = callback;
    }

    /**
     * Emit custom event
     */
    emit(eventName, data = {}) {
        const event = new CustomEvent(`interaction:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Get current scene
     */
    getCurrentScene() {
        return this.sceneNames[this.currentSceneIndex];
    }
}

export default {
    CanvasEventHandlers,
    InteractionHandlers
};
