/**
 * Enhanced User Experience Module - Security & Performance Fixed
 * Provides smooth transitions, micro-interactions, loading states, and error handling
 * Part of Task 20: Enhanced User Experience
 */

class EnhancedUX {
    constructor() {
        this.loadingStates = new Set();
        this.errorQueue = [];
        this.transitionDuration = 300;
        this.reducedMotion = this.getReducedMotionPreference();
        this.touchDevice = this.isTouchDevice();
        this.imageObserver = null;
        
        this.init();
    }

    init() {
        this.setupGlobalErrorHandling();
        this.setupIntersectionObserver();
        this.setupTouchFeedback();
        this.setupKeyboardNavigation();
        this.monitorPerformance();
    }

    // ===============================
    // SMOOTH TRANSITIONS & ANIMATIONS
    // ===============================

    /**
     * Create smooth page transitions with proper event handling
     */
    createPageTransition(element, type = 'fadeIn', duration = null) {
        if (this.reducedMotion) {
            element.style.opacity = '1';
            return Promise.resolve();
        }

        const actualDuration = duration || this.transitionDuration;
        
        return new Promise((resolve) => {
            // Use specific transition properties instead of 'all'
            element.style.transition = `opacity ${actualDuration}ms ease-out, transform ${actualDuration}ms ease-out`;
            
            // Event listener for transitionend with safety timeout
            const cleanup = () => {
                element.removeEventListener('transitionend', onTransitionEnd);
                clearTimeout(safetyTimeout);
                resolve();
            };
            
            const onTransitionEnd = cleanup;
            const safetyTimeout = setTimeout(cleanup, actualDuration + 50);
            
            element.addEventListener('transitionend', onTransitionEnd);
            
            switch (type) {
                case 'fadeIn':
                    element.style.opacity = '0';
                    element.style.transform = 'translateY(20px)';
                    // Force reflow before animation
                    element.getBoundingClientRect();
                    requestAnimationFrame(() => {
                        element.style.opacity = '1';
                        element.style.transform = 'translateY(0)';
                    });
                    break;
                    
                case 'slideInLeft':
                    element.style.transform = 'translateX(-100%)';
                    element.getBoundingClientRect();
                    requestAnimationFrame(() => {
                        element.style.transform = 'translateX(0)';
                    });
                    break;
                    
                case 'slideInRight':
                    element.style.transform = 'translateX(100%)';
                    element.getBoundingClientRect();
                    requestAnimationFrame(() => {
                        element.style.transform = 'translateX(0)';
                    });
                    break;
                    
                case 'scaleIn':
                    element.style.transform = 'scale(0.9)';
                    element.style.opacity = '0';
                    element.getBoundingClientRect();
                    requestAnimationFrame(() => {
                        element.style.transform = 'scale(1)';
                        element.style.opacity = '1';
                    });
                    break;
            }
        });
    }

    /**
     * Micro-interactions for buttons and interactive elements
     */
    addMicroInteraction(element, type = 'hover-lift') {
        if (this.reducedMotion) return;

        // Use specific transition properties
        element.style.transition = 'transform 150ms ease-out, box-shadow 150ms ease-out';
        
        switch (type) {
            case 'hover-lift':
                element.addEventListener('mouseenter', () => {
                    if (!this.touchDevice) {
                        element.style.transform = 'translateY(-2px)';
                        element.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                });
                
                element.addEventListener('mouseleave', () => {
                    element.style.transform = 'translateY(0)';
                    element.style.boxShadow = '';
                });
                break;
                
            case 'press-scale':
                element.addEventListener('mousedown', () => {
                    element.style.transform = 'scale(0.98)';
                });
                
                element.addEventListener('mouseup', () => {
                    element.style.transform = 'scale(1)';
                });
                
                element.addEventListener('mouseleave', () => {
                    element.style.transform = 'scale(1)';
                });
                break;
                
            case 'pulse':
                element.addEventListener('click', () => {
                    element.style.animation = 'none';
                    element.getBoundingClientRect(); // Force reflow
                    requestAnimationFrame(() => {
                        element.style.animation = 'pulse 0.3s ease-out';
                    });
                    
                    setTimeout(() => {
                        element.style.animation = 'none';
                    }, 300);
                });
                break;
        }
    }

    // ===============================
    // LOADING STATES & FEEDBACK
    // ===============================

    /**
     * Show loading state for an element - DOM manipulation instead of innerHTML
     */
    showLoading(elementId, message = 'Loading...', type = 'spinner') {
        const element = document.getElementById(elementId);
        if (!element) return;

        this.loadingStates.add(elementId);
        
        // Store original content
        if (!element.dataset.originalContent) {
            element.dataset.originalContent = element.innerHTML;
        }
        
        // Clear and build DOM safely
        element.innerHTML = '';
        element.classList.add('loading-state');
        
        const container = document.createElement('div');
        const messageSpan = document.createElement('span');
        messageSpan.className = 'loading-message';
        messageSpan.textContent = message; // Safe text content
        
        switch (type) {
            case 'spinner':
                container.className = 'loading-spinner';
                const spinner = document.createElement('div');
                spinner.className = 'spinner';
                container.append(spinner, messageSpan);
                break;
                
            case 'dots':
                container.className = 'loading-dots';
                const dotsContainer = document.createElement('div');
                dotsContainer.className = 'dots';
                for (let i = 0; i < 3; i++) {
                    const dot = document.createElement('div');
                    dot.className = 'dot';
                    dotsContainer.appendChild(dot);
                }
                container.append(messageSpan, dotsContainer);
                break;
                
            case 'skeleton':
                container.className = 'skeleton-loader';
                for (let i = 0; i < 3; i++) {
                    const line = document.createElement('div');
                    line.className = i === 2 ? 'skeleton-line short' : 'skeleton-line';
                    container.appendChild(line);
                }
                break;
        }
        
        element.appendChild(container);
        
        // Add ARIA attributes for accessibility
        element.setAttribute('aria-busy', 'true');
    }

    /**
     * Hide loading state and restore content
     */
    hideLoading(elementId, delay = 0) {
        setTimeout(() => {
            const element = document.getElementById(elementId);
            if (!element || !this.loadingStates.has(elementId)) return;

            this.loadingStates.delete(elementId);
            
            // Restore original content
            if (element.dataset.originalContent) {
                element.innerHTML = element.dataset.originalContent;
                delete element.dataset.originalContent;
            }
            
            // Remove loading class and ARIA attributes
            element.classList.remove('loading-state');
            element.removeAttribute('aria-busy');
            
            // Add fade-in animation
            this.createPageTransition(element, 'fadeIn', 200);
        }, delay);
    }

    /**
     * Show progress bar with proper ARIA attributes
     */
    showProgress(elementId, progress = 0, animated = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (!element.querySelector('.progress-bar')) {
            // Build DOM structure safely
            const container = document.createElement('div');
            container.className = 'progress-container';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.setAttribute('role', 'progressbar');
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            
            const progressText = document.createElement('span');
            progressText.className = 'progress-text';
            progressText.textContent = '0%';
            
            progressBar.appendChild(progressFill);
            container.append(progressBar, progressText);
            element.appendChild(container);
        }

        const progressBar = element.querySelector('.progress-bar');
        const progressFill = element.querySelector('.progress-fill');
        const progressText = element.querySelector('.progress-text');
        
        const clampedProgress = Math.max(0, Math.min(100, progress));
        
        if (animated && !this.reducedMotion) {
            progressFill.style.transition = 'width 0.3s ease-out';
        }
        
        progressFill.style.width = `${clampedProgress}%`;
        progressText.textContent = `${Math.round(clampedProgress)}%`;
        
        // Update ARIA attributes on the progress bar
        progressBar.setAttribute('aria-valuenow', clampedProgress.toString());
        progressBar.setAttribute('aria-valuetext', `${Math.round(clampedProgress)} percent`);
    }

    // ===============================
    // ERROR HANDLING & USER FEEDBACK
    // ===============================

    /**
     * Show user-friendly error message - DOM manipulation instead of innerHTML
     */
    showError(message, type = 'warning', duration = 5000, actionButton = null) {
        const errorId = `error-${Date.now()}`;
        
        // Build DOM structure safely
        const errorElement = document.createElement('div');
        errorElement.id = errorId;
        errorElement.className = `error-toast error-${type}`;
        errorElement.setAttribute('role', 'alert');
        errorElement.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
        
        const content = document.createElement('div');
        content.className = 'error-content';
        
        const icon = document.createElement('span');
        icon.className = 'error-icon';
        icon.textContent = this.getErrorIcon(type);
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'error-message';
        messageSpan.textContent = message; // Safe text content
        
        content.append(icon, messageSpan);
        
        // Add action button if provided
        if (actionButton?.text && typeof actionButton.action === 'function') {
            const button = document.createElement('button');
            button.className = 'error-action';
            button.type = 'button';
            button.textContent = actionButton.text;
            button.addEventListener('click', actionButton.action);
            content.appendChild(button);
        }
        
        // Add close button
        const closeButton = document.createElement('button');
        closeButton.className = 'error-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Dismiss');
        closeButton.textContent = '×';
        closeButton.addEventListener('click', () => this.dismissError(errorId));
        content.appendChild(closeButton);
        
        errorElement.appendChild(content);
        document.body.appendChild(errorElement);
        
        // Animate in
        this.createPageTransition(errorElement, 'slideInRight');
        
        // Auto-dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismissError(errorId);
            }, duration);
        }
        
        return errorId;
    }

    /**
     * Dismiss error message
     */
    dismissError(errorId) {
        const errorElement = document.getElementById(errorId);
        if (!errorElement) return;

        if (!this.reducedMotion) {
            errorElement.style.transition = 'transform 300ms ease-out, opacity 300ms ease-out';
            errorElement.style.transform = 'translateX(100%)';
            errorElement.style.opacity = '0';
            
            setTimeout(() => {
                errorElement.remove();
            }, this.transitionDuration);
        } else {
            errorElement.remove();
        }
    }

    /**
     * Handle network errors gracefully - improved detection
     */
    handleNetworkError(error, retryAction = null) {
        let message = 'Network connection issue. Please check your internet connection.';
        
        const offline = !navigator.onLine;
        const isAbort = error?.name === 'AbortError';
        const isTimeout = error?.name === 'TimeoutError' || error?.code === 'NETWORK_TIMEOUT';
        
        if (offline) {
            message = 'You appear to be offline. Some features may not be available.';
        } else if (isTimeout) {
            message = 'Request timed out. Please try again.';
        } else if (isAbort) {
            message = 'Request was cancelled.';
        }
        
        const actionButton = retryAction ? {
            text: 'Retry',
            action: retryAction
        } : null;
        
        return this.showError(message, 'error', 0, actionButton);
    }

    /**
     * Show success message - DOM manipulation instead of innerHTML
     */
    showSuccess(message, duration = 3000) {
        const successElement = document.createElement('div');
        successElement.className = 'success-toast';
        successElement.setAttribute('role', 'status');
        successElement.setAttribute('aria-live', 'polite');
        
        const content = document.createElement('div');
        content.className = 'success-content';
        
        const icon = document.createElement('span');
        icon.className = 'success-icon';
        icon.textContent = '✓';
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'success-message';
        messageSpan.textContent = message; // Safe text content
        
        content.append(icon, messageSpan);
        successElement.appendChild(content);
        
        document.body.appendChild(successElement);
        this.createPageTransition(successElement, 'fadeIn');
        
        setTimeout(() => {
            if (!this.reducedMotion) {
                successElement.style.transition = 'opacity 300ms ease-out';
                successElement.style.opacity = '0';
                setTimeout(() => successElement.remove(), this.transitionDuration);
            } else {
                successElement.remove();
            }
        }, duration);
    }

    // ===============================
    // PERFORMANCE OPTIMIZATION
    // ===============================

    /**
     * Debounce function with proper this binding
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Throttle function to limit call frequency
     */
    throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return (...args) => {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }

    /**
     * Lazy load images when they enter viewport with dynamic observation
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            this.imageObserver.unobserve(img);
                        }
                    }
                });
            });

            this.observeLazyImages();
        }
    }

    /**
     * Observe lazy images - can be called after adding new content
     */
    observeLazyImages() {
        if (!this.imageObserver) return;
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.imageObserver.observe(img);
        });
    }

    /**
     * Monitor performance with error handling
     */
    monitorPerformance() {
        // Monitor memory usage (Chromium only, with error handling)
        try {
            if (window.performance && 'memory' in performance) {
                const checkMemory = () => {
                    try {
                        const memInfo = performance.memory;
                        const memoryUsage = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
                        
                        if (memoryUsage > 0.9) {
                            this.showError(
                                'High memory usage detected. Consider refreshing the page.',
                                'warning',
                                10000,
                                { text: 'Refresh', action: () => location.reload() }
                            );
                        }
                    } catch (e) {
                        console.warn('Memory monitoring failed:', e);
                    }
                };
                
                // Check memory every 30 seconds
                setInterval(checkMemory, 30000);
            }
        } catch (e) {
            console.warn('Performance monitoring setup failed:', e);
        }

        // Monitor FPS (simplified)
        let lastTime = performance.now();
        let frameCount = 0;
        const checkFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;
                
                if (fps < 30 && !this.reducedMotion) {
                    console.warn('Low FPS detected:', fps);
                }
            }
            
            requestAnimationFrame(checkFPS);
        };
        
        requestAnimationFrame(checkFPS);
    }

    // ===============================
    // TOUCH & MOBILE INTERACTIONS
    // ===============================

    /**
     * Setup touch feedback for mobile devices
     */
    setupTouchFeedback() {
        if (!this.touchDevice) return;

        // Add touch feedback to interactive elements
        const interactiveElements = document.querySelectorAll(
            'button, .button, [role="button"], input[type="submit"], input[type="button"]'
        );

        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', (e) => {
                if (!this.reducedMotion) {
                    element.style.transform = 'scale(0.98)';
                    element.style.transition = 'transform 100ms ease-out';
                }
                
                // Add haptic feedback if available
                if ('vibrate' in navigator) {
                    try {
                        navigator.vibrate(10);
                    } catch (e) {
                        // Haptic feedback not available
                    }
                }
            });

            element.addEventListener('touchend', () => {
                if (!this.reducedMotion) {
                    setTimeout(() => {
                        element.style.transform = 'scale(1)';
                    }, 100);
                }
            });
        });
    }

    /**
     * Setup keyboard navigation helpers
     */
    setupKeyboardNavigation() {
        // Show focus indicators when using keyboard
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // Escape key to close modals/overlays
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const activeModal = document.querySelector('.modal.active, .overlay.active');
                if (activeModal) {
                    this.closeModal(activeModal);
                }
            }
        });
    }

    // ===============================
    // UTILITY FUNCTIONS
    // ===============================

    /**
     * Global error handling setup with cascading protection
     */
    setupGlobalErrorHandling() {
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            try {
                this.showError('Something went wrong. Please refresh the page if issues persist.', 'error');
            } catch (err) {
                console.error('Error showing error message:', err);
            }
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            try {
                this.showError('An unexpected error occurred.', 'error');
            } catch (err) {
                console.error('Error showing error message:', err);
            }
        });
    }

    /**
     * Get error icon based on type
     */
    getErrorIcon(type) {
        const icons = {
            error: '⚠️',
            warning: '⚡',
            info: 'ℹ️',
            success: '✓'
        };
        return icons[type] || icons.warning;
    }

    /**
     * Check if user prefers reduced motion
     */
    getReducedMotionPreference() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
               localStorage.getItem('FPR_v1_reducedMotion') === 'true';
    }

    /**
     * Detect touch device
     */
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Close modal helper
     */
    closeModal(modal) {
        modal.classList.remove('active');
        
        if (!this.reducedMotion) {
            modal.style.transition = 'opacity 300ms ease-out';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '';
            }, this.transitionDuration);
        } else {
            modal.style.display = 'none';
        }
    }

    /**
     * Cross-browser compatibility checks with proper error handling
     */
    checkBrowserCompatibility() {
        const incompatibleFeatures = [];
        
        // Test localStorage with try/catch for privacy modes
        try {
            localStorage.setItem('_test', '1');
            localStorage.removeItem('_test');
        } catch (e) {
            incompatibleFeatures.push('Local Storage');
        }
        
        if (!window.fetch) {
            incompatibleFeatures.push('Fetch API');
        }
        
        try {
            if (!window.CSS || !CSS.supports) {
                incompatibleFeatures.push('CSS Feature Detection');
            }
        } catch (e) {
            incompatibleFeatures.push('CSS Feature Detection');
        }
        
        if (!window.IntersectionObserver) {
            incompatibleFeatures.push('Intersection Observer');
        }
        
        if (incompatibleFeatures.length > 0) {
            this.showError(
                `Your browser may not support all features. Consider updating for the best experience.`,
                'warning',
                10000
            );
        }
        
        return incompatibleFeatures;
    }
}

// CSS for enhanced UX components
const uxStyles = `
<style>
/* Loading States */
.loading-state {
    position: relative;
    pointer-events: none;
}

.loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border, #e5e7eb);
    border-top: 2px solid var(--brand-blue, #2563eb);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.loading-dots .dots {
    display: flex;
    gap: 4px;
    margin-top: 8px;
    justify-content: center;
}

.dot {
    width: 8px;
    height: 8px;
    background-color: var(--brand-blue, #2563eb);
    border-radius: 50%;
    animation: dot-pulse 1.4s infinite ease-in-out;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

.skeleton-loader {
    padding: 20px;
}

.skeleton-line {
    height: 12px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    margin-bottom: 8px;
    border-radius: 4px;
}

.skeleton-line.short {
    width: 60%;
}

/* Progress Bar */
.progress-container {
    width: 100%;
    margin: 10px 0;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background-color: var(--bg-secondary, #f8fafc);
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background-color: var(--brand-blue, #2563eb);
    border-radius: 4px;
    transition: width 0.3s ease-out;
}

.progress-text {
    display: block;
    text-align: center;
    margin-top: 5px;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
}

/* Error/Success Toasts */
.error-toast, .success-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
    max-width: 300px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    border-left: 4px solid var(--brand-blue, #2563eb);
}

.error-warning { border-left-color: #f59e0b; }
.error-error { border-left-color: #ef4444; }
.error-info { border-left-color: var(--brand-blue, #2563eb); }

.success-toast {
    border-left-color: #10b981;
}

.error-content, .success-content {
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.error-icon, .success-icon {
    font-size: 18px;
    flex-shrink: 0;
}

.error-message, .success-message {
    flex: 1;
    font-size: 14px;
    line-height: 1.4;
}

.error-action {
    background: var(--brand-blue, #2563eb);
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    margin-left: 8px;
    min-height: 28px;
}

.error-action:hover {
    background: var(--brand-blue, #1d4ed8);
}

.error-close {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    color: #6b7280;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
}

.error-close:hover {
    background-color: #f3f4f6;
}

/* Animations */
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes dot-pulse {
    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
}

@keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* Keyboard Navigation */
.keyboard-navigation *:focus {
    outline: 2px solid var(--brand-blue, #2563eb);
    outline-offset: 2px;
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
    
    .spinner {
        animation: none;
        border-top-color: var(--brand-blue, #2563eb);
    }
}

/* Mobile Touch Feedback */
@media (max-width: 768px) {
    .error-toast, .success-toast {
        right: 10px;
        left: 10px;
        max-width: none;
    }
}
</style>
`;

// Inject styles into document if in browser environment
if (typeof document !== 'undefined' && document.head) {
    document.head.insertAdjacentHTML('beforeend', uxStyles);
}

// Gate instantiation for SSR/build tool compatibility
const enhancedUX = (typeof window !== 'undefined') ? new EnhancedUX() : null;

// Export for module use
export { enhancedUX, EnhancedUX };