/**
 * FinePoint Rehab - Enhanced Core Utilities (FIXED FOR TESTS)
 * ==========================================
 * 
 * Critical utilities for gamification system:
 * - Environment-safe storage system with FPR_v1_ prefix
 * - Toast notifications with debouncing
 * - Robust number parsing
 * - Test-compatible localStorage handling
 */

// ============================================================================
// STORAGE SYSTEM (CRITICAL FOR GAMIFICATION) - FIXED
// ============================================================================

// Resolve a usable localStorage for browser *and* Jest environments
// Handles SecurityError in locked-down browsers (Safari private mode, etc.)
function getLS() {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) return window.localStorage;
    if (typeof global !== 'undefined' && global.localStorage) return global.localStorage;
  } catch {
    // SecurityError in private mode or blocked storage - fall through
  }
  return null;
}

const PREFIX = 'FPR_v1_';

// Test environment detection for quiet logging
const isTest = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

export const storage = {
  /**
   * Check if localStorage is available (SSR/privacy-safe)
   * @returns {boolean} True if storage is available
   */
  isAvailable: () => {
    try {
      const ls = getLS();
      if (!ls) return false;
      const test = '__fpr_test__';
      ls.setItem(test, '1');
      ls.removeItem(test);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if a key exists in storage
   * @param {string} key - Storage key
   * @returns {boolean} True if key exists
   */
  has: (key) => {
    try {
      if (!storage.isAvailable()) return false;
      const ls = getLS();
      return ls.getItem(PREFIX + key) !== null;
    } catch {
      return false;
    }
  },

  /**
   * Get value from localStorage with FPR prefix (FIXED: handles JSON parsing)
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist
   * @returns {*} Parsed value or default
   */
  get: (key, defaultValue = null) => {
    try {
      if (!storage.isAvailable()) return defaultValue;
      const ls = getLS();
      const item = ls.getItem(PREFIX + key);
      
      if (item === null) return defaultValue;
      
      // Try to parse as JSON first, fallback to raw string, then to default
      try {
        return JSON.parse(item);
      } catch {
        // If JSON.parse fails, check if it looks like malformed JSON
        // If it starts with common JSON patterns but fails parsing, return default
        if (item.includes('{') || item.includes('[') || item.includes('"')) {
          return defaultValue;
        }
        // Otherwise return the raw string (for non-JSON values)
        return item;
      }
    } catch (error) {
      if (!isTest) {
        console.warn(`Storage get error for key "${key}":`, error);
      }
      return defaultValue;
    }
  },

  /**
   * Get raw string value from localStorage with FPR prefix
   * @param {string} key - Storage key
   * @returns {string|null} Raw string value or null
   */
  getRaw: (key) => {
    try {
      if (!storage.isAvailable()) return null;
      const ls = getLS();
      return ls.getItem(PREFIX + key);
    } catch (error) {
      if (!isTest) {
        console.warn(`Storage getRaw error for key "${key}":`, error);
      }
      return null;
    }
  },

  /**
   * Get parsed JSON value from localStorage with FPR prefix
   * @param {string} key - Storage key
   * @param {*} defaultValue - Default value if key doesn't exist or parsing fails
   * @returns {*} Parsed value or default
   */
  getJSON: (key, defaultValue = null) => {
    try {
      const raw = storage.getRaw(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch (error) {
      if (!isTest) {
        console.warn(`Storage JSON parse error for key "${key}":`, error);
      }
      return defaultValue;
    }
  },

  /**
   * Get integer value from localStorage with robust parsing
   * @param {string} key - Storage key
   * @param {number} fallback - Fallback value if parsing fails
   * @returns {number} Parsed integer or fallback
   */
  getInt: (key, fallback = 0) => {
    const value = storage.get(key, null);
    if (value === null) return fallback;
    
    const num = Number(value);
    return Number.isFinite(num) ? Math.floor(num) : fallback;
  },

  /**
   * Set value in localStorage with FPR prefix (FIXED: always JSON.stringify)
   * @param {string} key - Storage key
   * @param {*} value - Value to store
   */
  set: (key, value) => {
    try {
      if (!storage.isAvailable()) return;
      const ls = getLS();
      // Always JSON.stringify for consistency with tests
      ls.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      if (!isTest) {
        console.warn(`Storage set error for key "${key}":`, error);
      }
    }
  },

  /**
   * Set raw string value in localStorage with FPR prefix
   * @param {string} key - Storage key
   * @param {string} value - Value to store as raw string
   */
  setRaw: (key, value) => {
    try {
      if (!storage.isAvailable()) return;
      const ls = getLS();
      ls.setItem(PREFIX + key, String(value));
    } catch (error) {
      if (!isTest) {
        console.warn(`Storage setRaw error for key "${key}":`, error);
      }
    }
  },

  /**
   * Set JSON value in localStorage with FPR prefix
   * @param {string} key - Storage key
   * @param {*} value - Value to store as JSON
   */
  setJSON: (key, value) => {
    try {
      if (!storage.isAvailable()) return;
      const ls = getLS();
      ls.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      if (!isTest) {
        console.warn(`Storage JSON set error for key "${key}":`, error);
      }
    }
  },

  /**
   * Remove value from localStorage with FPR prefix
   * @param {string} key - Storage key
   */
  remove: (key) => {
    try {
      if (!storage.isAvailable()) return;
      const ls = getLS();
      ls.removeItem(PREFIX + key);
    } catch (error) {
      if (!isTest) {
        console.error(`Storage remove error for key "${key}":`, error);
      }
    }
  },

  /**
   * Clear ALL FPR_v1_ keys (only our app data)
   * This preserves other localStorage data from other apps/sites
   */
  clearAll: () => {
    try {
      if (!storage.isAvailable()) return;
      const ls = getLS();
      
      // Collect all FPR keys to delete (safe iteration)
      const keysToDelete = [];
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && key.startsWith(PREFIX)) {
          keysToDelete.push(key);
        }
      }
      
      // Remove all collected keys
      keysToDelete.forEach(key => ls.removeItem(key));
      
      // Only log in non-test environments to avoid cluttering Jest output
      if (!isTest) {
        console.log(`All FPR progress data cleared (${keysToDelete.length} keys removed)`);
      }
    } catch (error) {
      if (!isTest) {
        console.error('Storage clearAll error:', error);
      }
    }
  }
};

/**
 * Global function for clearing all FPR data (FIXED FOR JEST)
 * This function handles both real browser localStorage and Jest mocks
 */
export function clearAllFPRData() {
  try {
    const ls = getLS();
    if (!ls) return;
    
    const keysToDelete = [];
    
    // Method 1: Safe iteration for both browser and Jest mock
    // Collect keys first, then delete (avoids concurrent modification)
    try {
      for (let i = 0; i < ls.length; i++) {
        const key = ls.key(i);
        if (key && key.startsWith(PREFIX)) {
          keysToDelete.push(key);
        }
      }
    } catch (iterationError) {
      // If iteration fails, try Object.keys approach
      try {
        const allKeys = Object.keys(ls);
        allKeys.forEach(key => {
          if (key.startsWith(PREFIX)) {
            keysToDelete.push(key);
          }
        });
      } catch (objKeysError) {
        // Last resort: hardcoded known keys
        const knownKeys = [
          'FPR_v1_points', 'FPR_v1_level', 'FPR_v1_streak', 
          'FPR_v1_lastActiveDate', 'FPR_v1_achievements', 
          'FPR_v1_tried', 'FPR_v1_preferences', 'FPR_v1_totalSessions'
        ];
        knownKeys.forEach(key => {
          if (ls.getItem(key) !== null) {
            keysToDelete.push(key);
          }
        });
      }
    }
    
    // Remove all collected keys
    keysToDelete.forEach(key => {
      ls.removeItem(key);
    });
    
    // Only log in non-test environments
    if (!isTest) {
      console.log(`All FPR progress data cleared (${keysToDelete.length} keys removed)`);
    }
  } catch (error) {
    if (!isTest) {
      console.error('Storage clearAll error:', error);
    }
  }
}

// ============================================================================
// TOAST NOTIFICATION SYSTEM (WITH DEBOUNCING)
// ============================================================================

// Track active toasts to prevent spam
const activeToasts = new Map();
let toastContainer = null;
const TOAST_ANIM_MS = 300; // keep in sync with your CSS transition

export const toast = {
  /**
   * Show toast notification with debouncing for achievement unlocks
   * @param {string} message - Toast message
   * @param {Object} options - Toast options
   */
  show: (message, options = {}) => {
    const {
      type = 'info',
      duration = 4000,
      debounceMs = 1000,
      persistent = false
    } = options;

    // Create debounce key from message and type
    const debounceKey = `${type}_${message}`;
    
    // Check if we're debouncing this exact message
    if (activeToasts.has(debounceKey)) {
      const lastShown = activeToasts.get(debounceKey);
      if (Date.now() - lastShown < debounceMs) {
        if (!isTest) console.log(`Toast debounced: ${message}`);
        return; // Skip showing duplicate within debounce period
      }
    }

    // Update debounce tracking
    activeToasts.set(debounceKey, Date.now());

    // Ensure container exists
    if (!toastContainer) {
      createToastContainer();
    }

    // Create toast element
    const toastElement = createToastElement(message, type, debounceKey);
    toastContainer.appendChild(toastElement);

    // Show with animation
    requestAnimationFrame(() => {
      toastElement.classList.add('toast-show');
    });

    // Auto-hide unless persistent
    if (!persistent) {
      setTimeout(() => {
        hideToast(toastElement, debounceKey);
      }, duration);
    }

    // Clean up debounce tracking after longer delay
    setTimeout(() => {
      activeToasts.delete(debounceKey);
    }, debounceMs * 2);

    return toastElement;
  }
};

/**
 * Create toast container with enhanced accessibility
 */
function createToastContainer() {
  // Prevent duplicate containers and event listeners
  if (toastContainer) return;
  
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  toastContainer.setAttribute('aria-live', 'polite');
  toastContainer.setAttribute('aria-atomic', 'true');
  toastContainer.setAttribute('aria-label', 'Notifications');
  toastContainer.setAttribute('data-fpr-toast-container', 'true');
  document.body.appendChild(toastContainer);

  // Allow Esc to dismiss the most recent toast (single listener)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lastToast = toastContainer.querySelector('.toast:last-of-type');
      if (lastToast) {
        hideToast(lastToast, null); // No debounce key for manual dismissal
      }
    }
  });
}

/**
 * Create individual toast element (XSS-safe, no name shadowing)
 * @param {string} message - Toast message  
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {string} debounceKey - Key for debounce cleanup
 * @returns {HTMLElement} Toast element
 */
function createToastElement(message, type, debounceKey) {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  
  // Set accessibility attributes
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = getToastIcon(type);
  
  // Create icon element (XSS-safe)
  const iconEl = document.createElement('div');
  iconEl.className = 'toast-icon';
  iconEl.textContent = icon;

  // Create content container
  const contentEl = document.createElement('div');
  contentEl.className = 'toast-content';

  // Create message element (XSS-safe)
  const msgEl = document.createElement('div');
  msgEl.className = 'toast-message';
  msgEl.textContent = message; // Safe from XSS

  // Create close button (XSS-safe)
  const closeBtn = document.createElement('button');
  closeBtn.className = 'toast-close';
  closeBtn.setAttribute('aria-label', 'Close notification');
  closeBtn.textContent = '×';

  // Assemble elements
  contentEl.appendChild(msgEl);
  el.append(iconEl, contentEl, closeBtn);

  // Add close button functionality
  closeBtn.addEventListener('click', () => hideToast(el, debounceKey));

  return el;
}

/**
 * Get appropriate icon for toast type
 * @param {string} type - Toast type
 * @returns {string} Icon character
 */
function getToastIcon(type) {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  return icons[type] || icons.info;
}

/**
 * Hide toast with animation and proper debounce cleanup
 * @param {HTMLElement} toastElement - Toast to hide
 * @param {string|null} debounceKey - Key for debounce cleanup (optional)
 */
function hideToast(toastElement, debounceKey = null) {
  if (!toastElement || !toastElement.parentNode) return;
  
  toastElement.classList.remove('toast-show');
  
  // Remove from DOM after animation completes and clean up debounce
  setTimeout(() => {
    if (toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }
    // Clean up debounce tracking when toast is actually removed
    if (debounceKey) {
      activeToasts.delete(debounceKey);
    }
  }, TOAST_ANIM_MS);
}

// ============================================================================
// EXISTING UTILITIES (PRESERVED FROM ORIGINAL UTILS.JS)
// ============================================================================

// Starfield background effect (robust & performant)
export const starfield = {
  init: () => {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;

    // Respect reduced motion preference
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return; // Guard against getContext returning null

    const stars = [];
    const numStars = 100;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.max(1, Math.floor(clientWidth * dpr));
      canvas.height = Math.max(1, Math.floor(clientHeight * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // Initialize stars using client dimensions
    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1
      });
    }

    (function animate() {
      // Stop animating if canvas is removed from DOM
      if (!canvas.isConnected) return;
      
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      for (const star of stars) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
        
        star.y += star.speed;
        if (star.y > canvas.clientHeight) {
          star.y = 0;
          star.x = Math.random() * canvas.clientWidth;
        }
      }
      
      requestAnimationFrame(animate);
    })();
  }
};

// Theme management
export const theme = {
  toggle: () => {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    storage.set('darkTheme', isDark ? 'true' : 'false');
  },
  
  init: () => {
    const isDark = storage.get('darkTheme') === 'true';
    if (isDark) {
      document.body.classList.add('dark-theme');
    }
  }
};

// Viewport utilities (SSR-safe with matchMedia guards)
const mm = (query) => (typeof window !== 'undefined' && typeof window.matchMedia === 'function')
  ? window.matchMedia(query).matches
  : false;

export const viewport = {
  isMobile: () => mm('(max-width: 768px)'),
  isTablet: () => mm('(min-width: 769px) and (max-width: 1024px)'),
  isDesktop: () => mm('(min-width: 1025px)')
};

// Audio utilities (with registry and mute functionality)
const __audioEls = new Map();
export const audio = {
  muted: false,
  create: (id, srcBase) => {
    if (__audioEls.has(id)) return __audioEls.get(id);
    const el = document.createElement('audio');
    el.id = id; el.preload = 'auto';
    el.src = `${srcBase}.mp3`; el.style.display = 'none';
    el.muted = audio.muted;
    document.body.appendChild(el);
    __audioEls.set(id, el);
    return el;
  },
  play: (id) => {
    const el = __audioEls.get(id) || document.getElementById(id);
    if (!el) return;
    el.muted = audio.muted;
    el.currentTime = 0;
    el.play().catch(()=>{});
  },
  setMuted: (v) => { audio.muted = !!v; __audioEls.forEach(el => el.muted = audio.muted); },
  toggleMute: () => audio.setMuted(!audio.muted),
  setVolume: (id, v) => {
    const el = __audioEls.get(id) || document.getElementById(id);
    if (el) el.volume = Math.max(0, Math.min(1, v));
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize all utilities (safe for multiple calls)
 * Call this from your main application
 */
export function initUtils() {
  // Prevent duplicate initialization
  if (typeof document !== 'undefined' && document.body.hasAttribute('data-fpr-utils-initialized')) {
    return;
  }
  
  // Initialize theme from storage
  theme.init();
  
  // Initialize starfield if canvas exists
  if (typeof document !== 'undefined' && document.getElementById('starfield')) {
    starfield.init();
  }
  
  // Mark as initialized
  if (typeof document !== 'undefined') {
    document.body.setAttribute('data-fpr-utils-initialized', 'true');
    if (!isTest) console.log('Enhanced utilities initialized');
  }
}

// Auto-initialize when DOM is ready (skip in test environments to avoid DOM pollution)
if (typeof document !== 'undefined' && !isTest) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUtils);
  } else {
    initUtils();
  }
}