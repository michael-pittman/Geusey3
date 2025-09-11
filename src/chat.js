import { config } from '../config.js';

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
        this.init();
    }

    init() {
        // Create chat container
        this.container = document.createElement('div');
        this.container.className = 'chat-container';
        this.container.style.zIndex = '1001'; // Ensure chat appears above toggle
        
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
                <button class="chip" type="button">Build a landing page</button>
                <button class="chip" type="button">Automate a workflow</button>
                <button class="chip" type="button">Set up analytics</button>
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

        // Theme toggle inside header
        const THEME_KEY = 'theme';
        const THEME_COLORS = { light: '#edcfcf', dark: '#141416' };
        const setMetaTheme = (theme) => {
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', THEME_COLORS[theme] || THEME_COLORS.light);
        };
        const applyTheme = (theme, persist = true) => {
            document.documentElement.setAttribute('data-theme', theme);
            if (persist) {
                try { localStorage.setItem(THEME_KEY, theme); } catch (_) {}
            }
            setMetaTheme(theme);
        };
        const getCurrentTheme = () => {
            const attr = document.documentElement.getAttribute('data-theme');
            if (attr === 'light' || attr === 'dark') return attr;
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            return prefersDark ? 'dark' : 'light';
        };
        const themeBtn = this.container.querySelector('.theme-toggle');
        const setIcon = (theme) => {
            themeBtn.innerHTML = theme === 'dark'
                ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f5f5f8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
                : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
            themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        };
        const currentTheme = getCurrentTheme();
        setIcon(currentTheme);
        setMetaTheme(currentTheme);
        themeBtn.addEventListener('click', () => {
            this.triggerHaptic();
            const now = getCurrentTheme();
            const next = now === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            setIcon(next);
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
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'loadPreviousSession',
                    sessionId: this.sessionId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response has content before trying to parse JSON
            const responseText = await response.text();
            if (!responseText.trim()) {
                console.warn('Empty response from server for loadPreviousSession');
                return;
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                console.error('Response text:', responseText);
                return;
            }

            if (data.data) {
                this.messages = data.data.map(msg => ({
                    text: msg.kwargs.content,
                    sender: msg.id.includes('HumanMessage') ? 'user' : 'bot'
                }));
                this.renderMessages();
            }
        } catch (error) {
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
                const input = this.container.querySelector('.chat-input');
                if (input) input.value = text;
                this.sendMessage();
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

    async sendMessage() {
        const input = this.container.querySelector('.chat-input');
        const message = input.value.trim();
        if (!message || this.isLoading) return;

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';
        this.setLoading(true);

        try {
            const response = await fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: 'sendMessage',
                    sessionId: this.sessionId,
                    chatInput: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response has content before trying to parse JSON
            const responseText = await response.text();
            if (!responseText.trim()) {
                this.addMessage('I received your message but the server returned an empty response. Please try again.', 'bot');
                return;
            }

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON response:', parseError);
                console.error('Response text:', responseText);
                this.addMessage('I received your message but got an invalid response from the server. Please try again.', 'bot');
                return;
            }

            const botResponse = data.output || data.text || '';
            
            if (botResponse) {
                this.addMessage(botResponse, 'bot');
            } else {
                this.addMessage('I received your message but didn\'t get a response. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            if (error.name === 'TypeError' && error.message.includes('CORS')) {
                this.addMessage('Connection error: Unable to reach the server. Please check your internet connection.', 'bot');
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                this.addMessage('Network error: Unable to connect to the server. Please check your internet connection.', 'bot');
            } else {
                this.addMessage('Sorry, there was an error sending your message. Please try again.', 'bot');
            }
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(text, sender) {
        this.messages.push({ text, sender });
        this.renderMessages();
        if (sender === 'user') {
            this.hideSuggestions();
        }
    }

    renderMessages() {
        const messagesContainer = this.container.querySelector('.chat-messages');
        messagesContainer.innerHTML = this.messages.map((msg, index) => `
            <div class="message ${msg.sender}" 
                 role="article" 
                 aria-label="${msg.sender === 'user' ? 'Your message' : 'Assistant response'}"
                 tabindex="0">
                ${msg.text}
            </div>
        `).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

export default Chat; 