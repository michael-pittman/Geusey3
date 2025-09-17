import { config } from '../config.js';
import { setupThemeToggle } from './utils/themeManager.js';
import { makeApiCall, getErrorMessage, API_ERROR_TYPES } from './utils/apiUtils.js';

const WEBHOOK_URL = config.webhookUrl;

class Chat {
    constructor() {
        this.container = null;
        this.messages = [];
        this.isVisible = false;
        this.sessionId = this.generateSessionId();
        this.isLoading = false;
        this.chatIcon = document.querySelector('img[src*="glitch.gif"], img[src*="fire.gif"]');
        this.onVisibilityChange = null; // Callback for visibility changes
        // Performance tracking
        this.renderingMetrics = {
            totalRenders: 0,
            incrementalRenders: 0,
            averageRenderTime: 0,
            lastRenderTime: 0
        };
        // DOM tracking for incremental rendering
        this.renderedMessageCount = 0;
        this.messagesContainer = null;
        this.init();
    }

    init() {
        // Create chat container
        this.container = document.createElement('div');
        this.container.className = 'chat-container';
        // z-index is now handled in CSS for proper stacking context
        
        // Section 508 compliance: ARIA landmarks and roles
        this.container.setAttribute('role', 'dialog');
        this.container.setAttribute('aria-label', 'Chat interface for service requests');
        this.container.setAttribute('aria-modal', 'true');
        this.container.innerHTML = `
            <div class="chat-header">
                <button class="header-dot" 
                        title="Close Chat" 
                        aria-label="Close Chat" 
                        tabindex="0"
                        type="button"></button>
                <a href="mailto:info@geuse.io?subject=Service Inquiry&body=Here is what I would like for you to build..."
                   aria-label="Send email to Geuse for service inquiry">
                  <span class="chat-header-title" data-text="geuse">geuse</span>
                </a>
                <button class="theme-toggle" 
                        title="Toggle appearance"
                        aria-label="Toggle dark mode"
                        tabindex="0"
                        type="button"></button>
            </div>
            <div class="chat-messages" role="log" aria-live="polite" aria-label="Chat conversation"></div>
            <div class="chat-suggestions" role="toolbar" aria-label="Suggestions" hidden>
                <button class="chip" type="button">Build an AI chatbot</button>
                <button class="chip" type="button">Create a SaaS MVP</button>
                <button class="chip" type="button">Build a mobile app</button>
                <button class="chip" type="button">Set up a web3 dApp</button>
                <button class="chip" type="button">Create an API integration</button>
                <button class="chip" type="button">Build a data dashboard</button>
            </div>
            <div class="chat-input-container">
                <input type="text" class="chat-input" placeholder="Request a service..." autocomplete="off" aria-label="Request a service" tabindex="0" aria-describedby="chat-help">
                <div id="chat-help" class="visually-hidden">Type your message and press Enter or click Send to submit</div>
                <button class="chat-send" aria-label="Send message" tabindex="0">
                  <span class="chat-send-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5bb6f8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
                  </span>
                  <span class="chat-send-loader" style="display:none">
                    <span class="dot">.</span><span class="dot">.</span><span class="dot">.</span>
                  </span>
                </button>
            </div>
        `;

        document.body.appendChild(this.container);

        // Cache messages container reference for performance
        this.messagesContainer = this.container.querySelector('.chat-messages');

        // Add event listeners
        this.container.querySelector('.header-dot').addEventListener('click', () => {
            this.triggerHaptic();
            this.toggle();
            // Update chat icon image
            if (this.chatIcon) {
                this.chatIcon.src = this.isVisible ? 
                    'https://www.geuse.io/media/fire.gif' : 
                    'https://www.geuse.io/media/glitch.gif';
            }
        });

        // Focus trap within chat dialog
        this.setupFocusTrap();

        // Suggestions behavior
        this.setupSuggestions();

        // Theme toggle inside header - integrates with global theme system
        const themeBtn = this.container.querySelector('.theme-toggle');
        const themeManager = setupThemeToggle(themeBtn);

        themeBtn.addEventListener('click', () => {
            this.triggerHaptic();
            themeManager.toggle();
        });

        const chatInput = this.container.querySelector('.chat-input');
        const sendButton = this.container.querySelector('.chat-send');
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.triggerHaptic();
                this.sendMessage();
            }
        });
        sendButton.addEventListener('click', () => {
            this.triggerHaptic();
            this.sendMessage();
        });

        // Enhanced keyboard visibility handling for mobile
        if ('virtualKeyboard' in navigator) {
            navigator.virtualKeyboard.overlaysContent = true;
            
            window.addEventListener('resize', () => {
                if (this.isVisible) {
                    // Adjust chat container position when keyboard appears/disappears
                    const viewportHeight = window.innerHeight;
                    const chatContainer = this.container;
                    const chatHeight = chatContainer.offsetHeight;
                    
                    if (chatHeight > viewportHeight * 0.8) {
                        chatContainer.style.height = `${viewportHeight * 0.8}px`;
                    }
                    
                    // Ensure messages container scrolls to bottom when keyboard appears
                    requestAnimationFrame(() => {
                        const messagesContainer = this.container.querySelector('.chat-messages');
                        if (messagesContainer) {
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                        }
                    });
                }
            });
        }

        // Handle escape key to close chat
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.toggle();
            }
        });

        // Load previous session if available
        this.loadPreviousSession();
    }

    generateSessionId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async loadPreviousSession() {
        try {
            const data = await makeApiCall(
                WEBHOOK_URL,
                {
                    action: 'loadPreviousSession',
                    sessionId: this.sessionId
                },
                'loading previous session'
            );

            if (data.data) {
                this.messages = data.data.map(msg => ({
                    text: msg.kwargs.content,
                    sender: msg.id.includes('HumanMessage') ? 'user' : 'bot'
                }));
                this.renderAllMessages(); // Full render for session loading
            }
        } catch (error) {
            // Handle empty response as expected behavior for new sessions
            if (error.type === API_ERROR_TYPES.EMPTY_RESPONSE) {
                console.warn('Empty response from server for loadPreviousSession - likely a new session');
                return;
            }

            // Handle parse errors gracefully for session loading
            if (error.type === API_ERROR_TYPES.PARSE) {
                console.error('Parse error loading previous session:', error);
                return;
            }

            console.error('Failed to load previous session:', error);
            // Don't show error to user for loading previous session
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        
        if (this.isVisible) {
            // Show container first
            this.container.style.display = 'flex';
            // Force a reflow
            this.container.offsetHeight;
            // Then add visible class for animation
            this.container.classList.add('visible');
            // First-open greeting and show suggestions if no messages
            const suggestions = this.container.querySelector('.chat-suggestions');
            if (suggestions && this.messages.length === 0) {
                suggestions.hidden = false;
                this.container.classList.add('has-suggestions');
                this.addMessage("Hi! Tell me what you'd like to build.", 'bot');
            }
            
            // Focus input after animation completes - FIXED TIMING
            requestAnimationFrame(() => {
                setTimeout(() => {
                    const input = this.container.querySelector('.chat-input');
                    if (input && this.isVisible) {
                        input.focus();
                        // Force keyboard to appear on mobile devices
                        input.click();
                    }
                }, 100); // Small delay to ensure animation has started
            });
            
            // Update container text when chat is visible
            const container = document.getElementById('container');
            if (container) {
                const metaDescription = document.querySelector('meta[name="description"]');
                if (metaDescription) {
                    container.textContent = metaDescription.getAttribute('content');
                }
            }
        } else {
            // Remove visible class first for animation
            this.container.classList.remove('visible');
            // HARMONIZED - Wait for CSS transition to complete (0.6s = 600ms)
            setTimeout(() => {
                if (!this.isVisible) { // Check if still closed
                    this.container.style.display = 'none';
                }
            }, 600); // Matches CSS --duration-slow (0.6s)
            
            // Reset container text when chat is hidden
            const container = document.getElementById('container');
            if (container) {
                container.textContent = '- G E U S E -';
            }
        }
        
        // Call visibility change callback
        if (this.onVisibilityChange) {
            this.onVisibilityChange(this.isVisible);
        }
        
        return this.isVisible;
    }

    setupFocusTrap() {
        const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const container = this.container;
        container.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusables = Array.from(container.querySelectorAll(focusableSelectors))
                .filter(el => !el.hasAttribute('disabled') && el.tabIndex !== -1);
            if (focusables.length === 0) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    setupSuggestions() {
        const bar = this.container.querySelector('.chat-suggestions');
        if (!bar) return;
        bar.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof HTMLElement)) return;
            if (target.classList.contains('chip')) {
                this.triggerHaptic();
                const text = target.textContent || '';
                // Pass the suggestion text directly to sendMessage instead of relying on input field
                this.sendMessage(text);
                this.hideSuggestions();
            }
        });
    }

    hideSuggestions() {
        const bar = this.container.querySelector('.chat-suggestions');
        if (!bar || bar.hidden) return;
        
        // Add hiding class for slide-down animation
        bar.classList.add('hiding');
        
        // After animation completes, hide the element
        setTimeout(() => {
            bar.hidden = true;
            bar.classList.remove('hiding');
            this.container.classList.remove('has-suggestions');
        }, 300); // Match CSS transition duration
    }

    triggerHaptic() {
        try {
            if (navigator && typeof navigator.vibrate === 'function') {
                navigator.vibrate(12);
            }
        } catch (_) {}
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        const sendButton = this.container.querySelector('.chat-send');
        const input = this.container.querySelector('.chat-input');
        const icon = sendButton.querySelector('.chat-send-icon');
        const loader = sendButton.querySelector('.chat-send-loader');
        if (sendButton) {
            sendButton.disabled = isLoading;
            if (isLoading) {
                icon.style.display = 'none';
                loader.style.display = 'inline-block';
            } else {
                icon.style.display = 'inline-block';
                loader.style.display = 'none';
            }
        }
        if (input) {
            input.disabled = isLoading;
        }
    }

    async sendMessage(suggestionText = null) {
        const input = this.container.querySelector('.chat-input');
        // Use suggestion text if provided, otherwise get from input field
        const message = suggestionText ? suggestionText.trim() : input.value.trim();
        if (!message || this.isLoading) return;

        // Add user message
        this.addMessage(message, 'user');
        // Only clear input if we're using input field (not suggestion)
        if (!suggestionText) {
            input.value = '';
        }
        this.setLoading(true);

        try {
            const data = await makeApiCall(
                WEBHOOK_URL,
                {
                    action: 'sendMessage',
                    sessionId: this.sessionId,
                    chatInput: message
                },
                'sending message'
            );

            const botResponse = data.output || data.text || '';

            if (botResponse) {
                this.addMessage(botResponse, 'bot');
            } else {
                this.addMessage('🤷‍♀️ Brain went blank! Try again? 🧠💭', 'bot');
            }
        } catch (error) {
            // Use centralized error message generation for all error types
            const errorMessage = getErrorMessage(error, 'sending message');
            this.addMessage(errorMessage, 'bot');
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(text, sender) {
        // Performance monitoring start
        const startTime = performance.now();

        // Preserve scroll position and focus state
        const wasScrolledToBottom = this.isScrolledToBottom();
        const activeElement = document.activeElement;

        this.messages.push({ text, sender });

        // Use incremental rendering for single message addition
        this.renderNewMessages();

        if (sender === 'user') {
            this.hideSuggestions();
        }

        // Restore focus if it was on a chat element
        if (activeElement && this.container.contains(activeElement)) {
            activeElement.focus();
        }

        // Maintain scroll position or scroll to bottom if user was at bottom
        if (wasScrolledToBottom) {
            this.scrollToBottom();
        }

        // Performance monitoring end
        const endTime = performance.now();
        this.updateRenderingMetrics(endTime - startTime, true);
    }

    /**
     * Efficiently renders only new messages since last render
     */
    renderNewMessages() {
        if (!this.messagesContainer) return;

        const newMessagesCount = this.messages.length - this.renderedMessageCount;
        if (newMessagesCount <= 0) return;

        // Create document fragment for efficient batch DOM operations
        const fragment = document.createDocumentFragment();

        // Only create DOM elements for new messages
        for (let i = this.renderedMessageCount; i < this.messages.length; i++) {
            const msg = this.messages[i];
            const messageElement = this.createMessageElement(msg, i);
            fragment.appendChild(messageElement);
        }

        // Single DOM append operation
        this.messagesContainer.appendChild(fragment);
        this.renderedMessageCount = this.messages.length;
    }

    /**
     * Creates a single message DOM element with proper accessibility attributes
     */
    createMessageElement(message, index) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender}`;
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('aria-label',
            message.sender === 'user' ? 'Your message' : 'Assistant response'
        );
        messageDiv.setAttribute('tabindex', '0');
        messageDiv.setAttribute('data-message-index', index);

        // Safely set text content to prevent XSS
        messageDiv.textContent = message.text;

        return messageDiv;
    }

    /**
     * Full render for initial load or complete refresh scenarios
     */
    renderAllMessages() {
        if (!this.messagesContainer) return;

        // Performance monitoring start
        const startTime = performance.now();

        // Preserve scroll position and focus state
        const wasScrolledToBottom = this.isScrolledToBottom();
        const activeElement = document.activeElement;

        // Clear existing messages
        this.messagesContainer.innerHTML = '';
        this.renderedMessageCount = 0;

        if (this.messages.length === 0) {
            const endTime = performance.now();
            this.updateRenderingMetrics(endTime - startTime, false);
            return;
        }

        // Use document fragment for efficient batch rendering
        const fragment = document.createDocumentFragment();

        for (let i = 0; i < this.messages.length; i++) {
            const messageElement = this.createMessageElement(this.messages[i], i);
            fragment.appendChild(messageElement);
        }

        // Single DOM append operation
        this.messagesContainer.appendChild(fragment);
        this.renderedMessageCount = this.messages.length;

        // Restore focus if it was on a chat element
        if (activeElement && this.container.contains(activeElement)) {
            activeElement.focus();
        }

        // Maintain scroll position or scroll to bottom if user was at bottom
        if (wasScrolledToBottom || this.messages.length === 1) {
            this.scrollToBottom();
        }

        // Performance monitoring end
        const endTime = performance.now();
        this.updateRenderingMetrics(endTime - startTime, false);
    }

    /**
     * Utility functions for scroll and performance management
     */
    isScrolledToBottom() {
        if (!this.messagesContainer) return true;
        const threshold = 5; // 5px threshold for "close to bottom"
        return (
            this.messagesContainer.scrollHeight -
            this.messagesContainer.scrollTop -
            this.messagesContainer.clientHeight
        ) <= threshold;
    }

    scrollToBottom() {
        if (!this.messagesContainer) return;
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
    }

    updateRenderingMetrics(renderTime, isIncremental) {
        this.renderingMetrics.totalRenders++;
        if (isIncremental) {
            this.renderingMetrics.incrementalRenders++;
        }

        // Calculate rolling average render time
        const currentAvg = this.renderingMetrics.averageRenderTime;
        const totalRenders = this.renderingMetrics.totalRenders;
        this.renderingMetrics.averageRenderTime =
            (currentAvg * (totalRenders - 1) + renderTime) / totalRenders;

        this.renderingMetrics.lastRenderTime = renderTime;

        // Log performance improvements in development
        if (console && typeof console.debug === 'function') {
            console.debug(`Chat render: ${renderTime.toFixed(2)}ms (${isIncremental ? 'incremental' : 'full'})`);
        }
    }

    /**
     * Get performance metrics for debugging
     */
    getRenderingMetrics() {
        return { ...this.renderingMetrics };
    }

    /**
     * Handle message updates or deletions (for future extensibility)
     */
    updateMessage(index, newText) {
        if (index < 0 || index >= this.messages.length) return;

        this.messages[index].text = newText;

        // Find and update the specific message element
        const messageElement = this.messagesContainer.querySelector(
            `[data-message-index="${index}"]`
        );

        if (messageElement) {
            messageElement.textContent = newText;
        }
    }

    deleteMessage(index) {
        if (index < 0 || index >= this.messages.length) return;

        // Remove from messages array
        this.messages.splice(index, 1);

        // Full re-render needed to fix indices (could be optimized further if needed)
        this.renderAllMessages();
    }
}

export default Chat; 