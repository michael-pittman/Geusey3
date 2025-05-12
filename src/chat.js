const WEBHOOK_URL = 'https://n8n.geuse.io/webhook/4ad22b68-3837-4fd0-bf9e-aeb3627f6da6/chat';

class Chat {
    constructor() {
        this.container = null;
        this.messages = [];
        this.isVisible = false;
        this.sessionId = this.generateSessionId();
        this.isLoading = false;
        this.chatIcon = document.querySelector('img[src*="glitch.gif"], img[src*="fire.gif"]');
        this.init();
    }

    init() {
        // Create chat container
        this.container = document.createElement('div');
        this.container.className = 'chat-container';
        this.container.style.zIndex = '1001'; // Ensure chat appears above toggle
        this.container.innerHTML = `
            <div class="chat-header">
                <div class="header-dot" title="Close Chat"></div>
                <a href="mailto:info@geuse.io?subject=Service Inquiry&body=Here is what I would like for you to build...">
                  <span class="chat-header-title" data-text="geuse">geuse</span>
                </a>
            </div>
            <div class="chat-messages"></div>
            <div class="chat-input-container">
                <input type="text" class="chat-input" placeholder="Request a service..." autocomplete="off" aria-label="Request a service" tabindex="0">
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
            this.toggle();
            // Update chat icon image
            if (this.chatIcon) {
                this.chatIcon.src = this.isVisible ? 
                    'https://www.geuse.io/static/media/fire.gif' : 
                    'https://s3.us-east-1.amazonaws.com/www.geuse.io/static/media/glitch.gif';
            }
        });

        const chatInput = this.container.querySelector('.chat-input');
        const sendButton = this.container.querySelector('.chat-send');
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });

        // Handle keyboard visibility on mobile
        if ('virtualKeyboard' in navigator) {
            window.addEventListener('resize', () => {
                if (this.isVisible) {
                    // Adjust chat container position when keyboard appears/disappears
                    const viewportHeight = window.innerHeight;
                    const chatContainer = this.container;
                    const chatHeight = chatContainer.offsetHeight;
                    
                    if (chatHeight > viewportHeight * 0.8) {
                        chatContainer.style.height = `${viewportHeight * 0.8}px`;
                    }
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'loadPreviousSession',
                    sessionId: this.sessionId
                })
            });
            const data = await response.json();
            if (data.data) {
                this.messages = data.data.map(msg => ({
                    text: msg.kwargs.content,
                    sender: msg.id.includes('HumanMessage') ? 'user' : 'bot'
                }));
                this.renderMessages();
            }
        } catch (error) {
            console.error('Failed to load previous session:', error);
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
            this.container.querySelector('.chat-input').focus();
            
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
            // Wait for animation to complete before hiding
            setTimeout(() => {
                if (!this.isVisible) { // Check if still closed
                    this.container.style.display = 'none';
                }
            }, 300); // Match this with CSS transition duration
            
            // Reset container text when chat is hidden
            const container = document.getElementById('container');
            if (container) {
                container.textContent = '- G E U S E -';
            }
        }
        
        return this.isVisible;
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'sendMessage',
                    sessionId: this.sessionId,
                    chatInput: message
                })
            });

            const data = await response.json();
            const botResponse = data.output || data.text || '';
            
            if (botResponse) {
                this.addMessage(botResponse, 'bot');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            this.addMessage('Sorry, there was an error sending your message.', 'bot');
        } finally {
            this.setLoading(false);
        }
    }

    addMessage(text, sender) {
        this.messages.push({ text, sender });
        this.renderMessages();
    }

    renderMessages() {
        const messagesContainer = this.container.querySelector('.chat-messages');
        messagesContainer.innerHTML = this.messages.map(msg => `
            <div class="message ${msg.sender}">${msg.text}</div>
        `).join('');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

export default Chat; 