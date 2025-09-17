/**
 * Dynamic Type Manager for iOS Accessibility
 * Handles iOS Dynamic Type scaling and accessibility font preferences
 */

class DynamicTypeManager {
    constructor() {
        this.isIOS = this.detectIOS();
        this.currentScale = 1.0;
        this.observers = new Set();
        this.init();
    }

    detectIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    init() {
        if (!this.isIOS) return;

        // Monitor for Dynamic Type changes via CSS custom properties
        this.setupDynamicTypeDetection();

        // Listen for accessibility preference changes
        this.setupAccessibilityListeners();

        // Initial scaling setup
        this.updateFontScaling();
    }

    setupDynamicTypeDetection() {
        // Create a test element to detect Dynamic Type changes
        this.testElement = document.createElement('div');
        this.testElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            font-size: 1rem;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        document.body.appendChild(this.testElement);

        // Use ResizeObserver to detect font size changes
        if (window.ResizeObserver) {
            this.resizeObserver = new ResizeObserver(entries => {
                this.handleDynamicTypeChange();
            });
            this.resizeObserver.observe(this.testElement);
        }

        // Fallback: polling method for older browsers
        this.pollForChanges();
    }

    setupAccessibilityListeners() {
        // Listen for various accessibility-related media queries
        const accessibilityQueries = [
            '(prefers-reduced-motion: reduce)',
            '(prefers-contrast: high)',
            '(prefers-color-scheme: dark)'
        ];

        accessibilityQueries.forEach(query => {
            if (window.matchMedia) {
                const mediaQuery = window.matchMedia(query);
                mediaQuery.addEventListener('change', () => {
                    this.updateAccessibilitySupport();
                });
            }
        });
    }

    pollForChanges() {
        let lastSize = parseFloat(getComputedStyle(this.testElement).fontSize);

        setInterval(() => {
            const currentSize = parseFloat(getComputedStyle(this.testElement).fontSize);
            if (Math.abs(currentSize - lastSize) > 0.1) {
                lastSize = currentSize;
                this.handleDynamicTypeChange();
            }
        }, 1000);
    }

    handleDynamicTypeChange() {
        const newScale = this.calculateFontScale();
        if (Math.abs(newScale - this.currentScale) > 0.05) {
            this.currentScale = newScale;
            this.updateFontScaling();
            this.notifyObservers('dynamicTypeChanged', { scale: newScale });
        }
    }

    calculateFontScale() {
        if (!this.testElement) return 1.0;

        const computedSize = parseFloat(getComputedStyle(this.testElement).fontSize);
        const baseSize = 16; // Standard base font size
        return computedSize / baseSize;
    }

    updateFontScaling() {
        const scale = this.currentScale;

        // Update CSS custom properties for font scaling
        document.documentElement.style.setProperty('--dynamic-type-scale', scale);

        // Ensure minimum sizes are maintained for accessibility
        this.updateMinimumSizes(scale);

        // Update chat interface specifically
        this.updateChatInterfaceFonts(scale);
    }

    updateMinimumSizes(scale) {
        // Ensure input elements never go below 16px for iOS zoom prevention
        const chatInput = document.querySelector('.chat-input');
        if (chatInput) {
            const minimumSize = Math.max(16, 16 * scale);
            chatInput.style.fontSize = `${minimumSize}px`;
        }

        // Update touch targets to maintain 44x44px minimum
        const touchTargets = document.querySelectorAll('.chat-send, .header-dot, .theme-toggle, .chip');
        touchTargets.forEach(target => {
            const minimumSize = Math.max(44, 44 * scale);
            target.style.minWidth = `${minimumSize}px`;
            target.style.minHeight = `${minimumSize}px`;
        });
    }

    updateChatInterfaceFonts(scale) {
        // Update message font sizes while maintaining readability
        const messages = document.querySelectorAll('.message');
        messages.forEach(message => {
            const baseSize = 16; // 1rem equivalent
            const scaledSize = Math.max(14, baseSize * scale); // Never below 14px
            message.style.fontSize = `${scaledSize}px`;
        });

        // Update header font size
        const headerTitle = document.querySelector('.chat-header-title');
        if (headerTitle) {
            const baseSize = 21.6; // 1.35rem equivalent
            const scaledSize = Math.max(18, baseSize * scale);
            headerTitle.style.fontSize = `${scaledSize}px`;
        }

        // Update suggestion chips
        const chips = document.querySelectorAll('.chip');
        chips.forEach(chip => {
            const baseSize = 14.4; // 0.9rem equivalent
            const scaledSize = Math.max(12, baseSize * scale);
            chip.style.fontSize = `${scaledSize}px`;
        });
    }

    updateAccessibilitySupport() {
        // Enhanced contrast for high contrast mode
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            document.documentElement.setAttribute('data-high-contrast', 'true');

            // Increase font weights for better visibility
            const textElements = document.querySelectorAll('.message, .chat-input, .chip');
            textElements.forEach(element => {
                const currentWeight = getComputedStyle(element).fontWeight;
                const numericWeight = parseInt(currentWeight, 10) || 400;
                const enhancedWeight = Math.min(700, numericWeight + 100);
                element.style.fontWeight = enhancedWeight;
            });
        } else {
            document.documentElement.removeAttribute('data-high-contrast');
        }

        // Reduce motion adjustments
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            // Ensure font changes are immediate, not animated
            const styleSheet = document.createElement('style');
            styleSheet.textContent = `
                * {
                    transition: none !important;
                    animation: none !important;
                }
            `;
            document.head.appendChild(styleSheet);
        }
    }

    // Observer pattern for components that need to react to font changes
    addObserver(callback) {
        this.observers.add(callback);
    }

    removeObserver(callback) {
        this.observers.delete(callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.warn('DynamicTypeManager observer error:', error);
            }
        });
    }

    // Public API methods
    getCurrentScale() {
        return this.currentScale;
    }

    isLargeTextEnabled() {
        return this.currentScale > 1.2;
    }

    isExtraLargeTextEnabled() {
        return this.currentScale > 1.5;
    }

    // Manual scaling for testing
    setScale(scale) {
        if (scale >= 0.5 && scale <= 3.0) {
            this.currentScale = scale;
            this.updateFontScaling();
            this.notifyObservers('manualScaleChanged', { scale });
        }
    }

    // Cleanup
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (this.testElement && this.testElement.parentNode) {
            this.testElement.parentNode.removeChild(this.testElement);
        }

        this.observers.clear();
    }
}

// Enhanced CSS for Dynamic Type support
const dynamicTypeCSS = `
/* Dynamic Type Scale CSS Variables */
:root {
    --dynamic-type-scale: 1;
    --min-touch-target: 44px;
    --base-font-size: 16px;
}

/* Responsive font sizes with Dynamic Type scaling */
.chat-input {
    font-size: max(var(--base-font-size), calc(var(--base-font-size) * var(--dynamic-type-scale)));
}

.message {
    font-size: max(14px, calc(16px * var(--dynamic-type-scale)));
    line-height: calc(1.5 * var(--dynamic-type-scale));
}

.chat-header-title {
    font-size: max(18px, calc(21.6px * var(--dynamic-type-scale)));
}

.chip {
    font-size: max(12px, calc(14.4px * var(--dynamic-type-scale)));
    padding: calc(8px * var(--dynamic-type-scale)) calc(12px * var(--dynamic-type-scale));
}

/* Maintain touch target minimums */
.chat-send,
.header-dot,
.theme-toggle,
.chip {
    min-width: max(var(--min-touch-target), calc(var(--min-touch-target) * var(--dynamic-type-scale)));
    min-height: max(var(--min-touch-target), calc(var(--min-touch-target) * var(--dynamic-type-scale)));
}

/* High contrast mode enhancements */
[data-high-contrast="true"] {
    --glass-opacity-base: 0.4;
    --glass-border-opacity: 0.8;
}

[data-high-contrast="true"] .message,
[data-high-contrast="true"] .chat-input {
    font-weight: 600;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
}

/* Large text mode adjustments */
@media (min-resolution: 2dppx) {
    .message,
    .chat-input {
        -webkit-font-smoothing: subpixel-antialiased;
    }
}
`;

// Auto-inject CSS if not already present
if (!document.querySelector('#dynamic-type-styles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'dynamic-type-styles';
    styleElement.textContent = dynamicTypeCSS;
    document.head.appendChild(styleElement);
}

export default DynamicTypeManager;