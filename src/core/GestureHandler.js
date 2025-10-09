/**
 * GestureHandler - Touch gesture recognition and handling
 *
 * Recognizes and handles:
 * - Tap (single quick touch)
 * - Long-tap (press and hold)
 * - Swipe (left, right, up, down)
 * - Hit testing to determine gesture target (canvas vs chat)
 * - Haptic feedback integration
 */

export class GestureHandler {
    constructor(options = {}) {
        this.options = {
            tapThreshold: 10, // Max movement in pixels for tap
            tapTimeout: 300, // Max duration in ms for tap
            longTapThreshold: 500, // Min duration in ms for long-tap
            swipeThreshold: 50, // Min distance in pixels for swipe
            swipeTimeout: 500, // Max duration in ms for swipe
            horizontalSwipeTolerance: 0.4, // Allow diagonal bias when identifying horizontal swipes
            hapticEnabled: true,
            ...options
        };

        this.state = {
            touching: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0,
            startTime: 0,
            target: null,
            longTapTimer: null,
            longTapTriggered: false
        };

        this.listeners = new Map();
        this.hasTouch = 'ontouchstart' in window;
        this.hasHaptics = 'vibrate' in navigator;
    }

    /**
     * Initialize gesture handlers on specified element
     */
    init(element) {
        if (!element) {
            throw new Error('GestureHandler requires an element to attach to');
        }

        this.element = element;

        if (this.hasTouch) {
            this.setupTouchHandlers();
        }

        // Also support mouse events for desktop testing
        this.setupMouseHandlers();
    }

    /**
     * Setup touch event handlers
     */
    setupTouchHandlers() {
        const touchStartHandler = (e) => this.handleTouchStart(e);
        const touchMoveHandler = (e) => this.handleTouchMove(e);
        const touchEndHandler = (e) => this.handleTouchEnd(e);
        const touchCancelHandler = (e) => this.handleTouchCancel(e);

        this.element.addEventListener('touchstart', touchStartHandler, { passive: false });
        this.element.addEventListener('touchmove', touchMoveHandler, { passive: false });
        this.element.addEventListener('touchend', touchEndHandler, { passive: false });
        this.element.addEventListener('touchcancel', touchCancelHandler, { passive: false });

        this.listeners.set('touch', [
            { event: 'touchstart', handler: touchStartHandler },
            { event: 'touchmove', handler: touchMoveHandler },
            { event: 'touchend', handler: touchEndHandler },
            { event: 'touchcancel', handler: touchCancelHandler }
        ]);
    }

    /**
     * Setup mouse event handlers (for desktop compatibility)
     */
    setupMouseHandlers() {
        const mouseDownHandler = (e) => this.handleMouseDown(e);
        const mouseMoveHandler = (e) => this.handleMouseMove(e);
        const mouseUpHandler = (e) => this.handleMouseUp(e);

        this.element.addEventListener('mousedown', mouseDownHandler);
        this.element.addEventListener('mousemove', mouseMoveHandler);
        this.element.addEventListener('mouseup', mouseUpHandler);

        this.listeners.set('mouse', [
            { event: 'mousedown', handler: mouseDownHandler },
            { event: 'mousemove', handler: mouseMoveHandler },
            { event: 'mouseup', handler: mouseUpHandler }
        ]);
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (e.touches.length !== 1) return; // Only handle single touch

        const touch = e.touches[0];
        this.state.touching = true;
        this.state.startX = touch.clientX;
        this.state.startY = touch.clientY;
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;
        this.state.startTime = Date.now();
        this.state.target = this.getTargetType(e.target);
        this.state.longTapTriggered = false;

        // Start long-tap timer
        this.state.longTapTimer = setTimeout(() => {
            this.handleLongTap(e);
        }, this.options.longTapThreshold);

        this.emit('gesturestart', {
            x: this.state.startX,
            y: this.state.startY,
            target: this.state.target
        });
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (!this.state.touching) return;

        const touch = e.touches[0];
        this.state.currentX = touch.clientX;
        this.state.currentY = touch.clientY;

        const distance = this.getDistance();

        // Cancel long-tap if moved too much
        if (distance > this.options.tapThreshold && this.state.longTapTimer) {
            clearTimeout(this.state.longTapTimer);
            this.state.longTapTimer = null;
        }

        this.emit('gesturemove', {
            x: this.state.currentX,
            y: this.state.currentY,
            deltaX: this.state.currentX - this.state.startX,
            deltaY: this.state.currentY - this.state.startY,
            distance,
            target: this.state.target
        });
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(e) {
        if (!this.state.touching) return;

        // Clear long-tap timer
        if (this.state.longTapTimer) {
            clearTimeout(this.state.longTapTimer);
            this.state.longTapTimer = null;
        }

        const duration = Date.now() - this.state.startTime;
        const distance = this.getDistance();
        const deltaX = this.state.currentX - this.state.startX;
        const deltaY = this.state.currentY - this.state.startY;

        // Determine gesture type
        if (this.state.longTapTriggered) {
            // Long-tap already handled
        } else if (distance < this.options.tapThreshold && duration < this.options.tapTimeout) {
            this.handleTap(e);
        } else if (distance > this.options.swipeThreshold && duration < this.options.swipeTimeout) {
            this.handleSwipe(deltaX, deltaY, e);
        }

        this.emit('gestureend', {
            x: this.state.currentX,
            y: this.state.currentY,
            deltaX,
            deltaY,
            distance,
            duration,
            target: this.state.target
        });

        this.resetState();
    }

    /**
     * Handle touch cancel
     */
    handleTouchCancel(e) {
        if (this.state.longTapTimer) {
            clearTimeout(this.state.longTapTimer);
            this.state.longTapTimer = null;
        }
        this.resetState();
    }

    /**
     * Handle mouse down (desktop compatibility)
     */
    handleMouseDown(e) {
        this.state.touching = true;
        this.state.startX = e.clientX;
        this.state.startY = e.clientY;
        this.state.currentX = e.clientX;
        this.state.currentY = e.clientY;
        this.state.startTime = Date.now();
        this.state.target = this.getTargetType(e.target);
        this.state.longTapTriggered = false;

        this.state.longTapTimer = setTimeout(() => {
            this.handleLongTap(e);
        }, this.options.longTapThreshold);
    }

    /**
     * Handle mouse move (desktop compatibility)
     */
    handleMouseMove(e) {
        if (!this.state.touching) return;

        this.state.currentX = e.clientX;
        this.state.currentY = e.clientY;

        const distance = this.getDistance();
        if (distance > this.options.tapThreshold && this.state.longTapTimer) {
            clearTimeout(this.state.longTapTimer);
            this.state.longTapTimer = null;
        }
    }

    /**
     * Handle mouse up (desktop compatibility)
     */
    handleMouseUp(e) {
        if (!this.state.touching) return;

        if (this.state.longTapTimer) {
            clearTimeout(this.state.longTapTimer);
            this.state.longTapTimer = null;
        }

        const duration = Date.now() - this.state.startTime;
        const distance = this.getDistance();
        const deltaX = this.state.currentX - this.state.startX;
        const deltaY = this.state.currentY - this.state.startY;

        if (this.state.longTapTriggered) {
            // Already handled
        } else if (distance < this.options.tapThreshold && duration < this.options.tapTimeout) {
            this.handleTap(e);
        } else if (distance > this.options.swipeThreshold && duration < this.options.swipeTimeout) {
            this.handleSwipe(deltaX, deltaY, e);
        }

        this.resetState();
    }

    /**
     * Handle tap gesture
     */
    handleTap(e) {
        this.triggerHaptic('light');
        this.emit('tap', {
            x: this.state.currentX,
            y: this.state.currentY,
            target: this.state.target,
            element: e.target
        });
    }

    /**
     * Handle long-tap gesture
     */
    handleLongTap(e) {
        this.state.longTapTriggered = true;
        this.triggerHaptic('medium');
        this.emit('longtap', {
            x: this.state.currentX,
            y: this.state.currentY,
            target: this.state.target,
            element: e.target
        });
    }

    /**
     * Handle swipe gesture
     */
    handleSwipe(deltaX, deltaY, e) {
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const tolerance = this.options.horizontalSwipeTolerance ?? 1;
        const isHorizontal = absX >= absY * tolerance;
        const slope = absX === 0 ? Infinity : absY / absX;
        const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
        const normalizedAngle = (angle + 360) % 360;

        let direction;
        if (isHorizontal) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        this.triggerHaptic('light');
        this.emit('swipe', {
            direction,
            deltaX,
            deltaY,
            distance: this.getDistance(),
            angle: normalizedAngle,
            slope,
            target: this.state.target,
            element: e.target
        });

        // Emit direction-specific events
        this.emit(`swipe${direction}`, {
            deltaX,
            deltaY,
            distance: this.getDistance(),
            angle: normalizedAngle,
            slope,
            target: this.state.target,
            element: e.target
        });
    }

    /**
     * Determine target type via hit testing
     */
    getTargetType(element) {
        // Walk up the DOM tree to find target type
        let current = element;
        while (current && current !== document.body) {
            // Check for chat container
            if (current.classList.contains('chat-container') ||
                current.classList.contains('chat-messages') ||
                current.classList.contains('chat-suggestions') ||
                current.classList.contains('chat-input-container')) {
                return 'chat';
            }

            // Check for Three.js renderer
            if (current.id === 'threejs-renderer-container' ||
                current.classList.contains('threejs-renderer') ||
                current.getAttribute('data-engine') === 'three.js') {
                return 'canvas';
            }

            current = current.parentElement;
        }

        return 'unknown';
    }

    /**
     * Calculate distance from start point
     */
    getDistance() {
        const dx = this.state.currentX - this.state.startX;
        const dy = this.state.currentY - this.state.startY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Trigger haptic feedback
     */
    triggerHaptic(intensity = 'light') {
        if (!this.options.hapticEnabled || !this.hasHaptics) return;

        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30
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
    emit(eventName, data) {
        const event = new CustomEvent(`gesture:${eventName}`, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Listen to gesture events
     */
    on(eventName, callback) {
        const handler = (e) => callback(e.detail);
        window.addEventListener(`gesture:${eventName}`, handler);
        return () => window.removeEventListener(`gesture:${eventName}`, handler);
    }

    /**
     * Reset gesture state
     */
    resetState() {
        this.state.touching = false;
        this.state.startX = 0;
        this.state.startY = 0;
        this.state.currentX = 0;
        this.state.currentY = 0;
        this.state.startTime = 0;
        this.state.target = null;
        this.state.longTapTriggered = false;
        if (this.state.longTapTimer) {
            clearTimeout(this.state.longTapTimer);
            this.state.longTapTimer = null;
        }
    }

    /**
     * Cleanup all event listeners
     */
    destroy() {
        this.listeners.forEach((list) => {
            list.forEach(({ event, handler }) => {
                this.element.removeEventListener(event, handler);
            });
        });
        this.listeners.clear();
        this.resetState();
    }

    /**
     * Get current gesture state
     */
    getState() {
        return { ...this.state };
    }
}

export default GestureHandler;
