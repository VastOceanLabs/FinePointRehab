/**
 * Achievement Notification System
 * File: achievement-notification.js
 *
 * Visual notification system for when achievements are unlocked.
 * Works with the existing achievements.js system.
 */

import { ACHIEVEMENTS, checkAndUnlockAchievements } from './achievements.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const NOTIFICATION_CONFIG = {
  duration: 4000,          // 4 seconds display time
  maxConcurrent: 3,        // Maximum notifications shown at once
  animationDuration: 300,  // Animation duration in ms
  spacing: 10,             // Spacing between notifications
  position: 'top-right'    // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
};

// Track active notifications and container
let activeNotifications = [];
let notificationContainer = null;

// Reusable AudioContext
let _audioCtx = null;
function getAudioCtx() {
  if (typeof window === 'undefined') return null;
  try {
    if (!_audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      _audioCtx = new Ctx();
    }
    return _audioCtx;
  } catch {
    return null;
  }
}

// ============================================================================
// CORE NOTIFICATION SYSTEM
// ============================================================================

/**
 * Initialize the notification system (creates container, injects styles)
 */
function initializeNotificationSystem() {
  if (typeof document === 'undefined') return;
  if (notificationContainer) return;

  notificationContainer = document.createElement('div');
  notificationContainer.id = 'achievement-notification-container';
  notificationContainer.className = 'achievement-notification-container';

  addNotificationStyles();
  document.body.appendChild(notificationContainer);
}

/**
 * Show a single achievement notification
 * @param {string} achievementId
 * @returns {HTMLElement|null}
 */
export function showAchievementNotification(achievementId) {
  initializeNotificationSystem();
  if (!notificationContainer) return null;

  const achievement = ACHIEVEMENTS?.[achievementId];
  if (!achievement) {
    console.warn(`Achievement not found: ${achievementId}`);
    return null;
  }

  // Respect max concurrent by removing the oldest immediately
  if (activeNotifications.length >= NOTIFICATION_CONFIG.maxConcurrent) {
    // Immediately mark as being removed to avoid duplicate interactions
    removeNotification(activeNotifications[0]);
  }

  const notification = createNotificationElement(achievement, achievementId);

  // Add to DOM & tracking before positioning so we can measure
  notificationContainer.appendChild(notification);
  activeNotifications.push(notification);

  // Position and animate in
  positionNotification(notification);

  // rAF ensures styles are applied before adding the .show class for transitions
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => notification.classList.add('show'));
  } else {
    setTimeout(() => notification.classList.add('show'), 10);
  }

  // Auto-remove after duration
  setTimeout(() => {
    removeNotification(notification);
  }, NOTIFICATION_CONFIG.duration);

  // Sound (best-effort)
  playAchievementSound();

  return notification;
}

/**
 * Show multiple achievement notifications (staggered)
 * @param {string[]} achievementIds
 */
export function showMultipleAchievementNotifications(achievementIds) {
  achievementIds.forEach((id, index) => {
    setTimeout(() => showAchievementNotification(id), index * 200);
  });
}

/**
 * Create notification element
 * @param {Object} achievement
 * @param {string} achievementId
 * @returns {HTMLElement}
 */
function createNotificationElement(achievement, achievementId) {
  const notification = document.createElement('div');
  notification.className = 'achievement-notification';

  // Icon based on ID (fallback to default)
  const icon = getAchievementIcon(achievementId);

  notification.innerHTML = `
    <div class="achievement-notification-content">
      <div class="achievement-icon" role="img" aria-label="Achievement icon">
        ${icon}
      </div>
      <div class="achievement-text">
        <h3 class="achievement-title">Achievement Unlocked!</h3>
        <p class="achievement-name">${escapeHTML(achievement.name)}</p>
        <small class="achievement-description">${escapeHTML(achievement.description)}</small>
      </div>
      <button class="achievement-close" aria-label="Close notification" type="button">
        ×
      </button>
    </div>
    <div class="achievement-progress-bar">
      <div class="achievement-progress-fill"></div>
    </div>
  `;

  // Close button
  const closeButton = notification.querySelector('.achievement-close');
  closeButton?.addEventListener('click', (e) => {
    e.stopPropagation();
    removeNotification(notification);
  });

  // Click-to-dismiss (excluding clicking the close button)
  notification.addEventListener('click', (e) => {
    if (e.target !== closeButton) removeNotification(notification);
  });

  return notification;
}

/**
 * Simple HTML escape for injected text content
 * @param {string} s
 * @returns {string}
 */
function escapeHTML(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[&<>"']/g, (ch) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]
  ));
}

/**
 * Pick an icon based on achievement ID
 * @param {string} achievementId
 * @returns {string}
 */
function getAchievementIcon(achievementId) {
  const icons = {
    firstSteps: '🚀',
    consistent: '🔥',
    dedicated: '💪',
    personalBest: '⭐',
    explorer: '🗺️',
    default: '🏆'
  };
  return icons[achievementId] || icons.default;
}

/**
 * Position a notification based on current config and stack
 * @param {HTMLElement} notification
 */
function positionNotification(notification) {
  // Add left-class for left-side slide direction
  const isLeft = NOTIFICATION_CONFIG.position.endsWith('left');
  notification.classList.toggle('left', isLeft);

  // Measure dynamic height for accurate stacking
  const getHeight = (el) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.round(r.height)) || 80;
  };

  const index = activeNotifications.indexOf(notification);
  const h = getHeight(notification);
  const offset = index * (h + NOTIFICATION_CONFIG.spacing);

  // Reset all edge styles before applying the chosen ones
  ['top', 'bottom', 'left', 'right'].forEach((prop) => (notification.style[prop] = ''));

  switch (NOTIFICATION_CONFIG.position) {
    case 'top-right':
      notification.style.top = `${20 + offset}px`;
      notification.style.right = '20px';
      break;
    case 'top-left':
      notification.style.top = `${20 + offset}px`;
      notification.style.left = '20px';
      break;
    case 'bottom-right':
      notification.style.bottom = `${20 + offset}px`;
      notification.style.right = '20px';
      break;
    case 'bottom-left':
      notification.style.bottom = `${20 + offset}px`;
      notification.style.left = '20px';
      break;
    default:
      notification.style.top = `${20 + offset}px`;
      notification.style.right = '20px';
  }
}

/**
 * Remove a notification with animation
 * @param {HTMLElement} notification
 */
function removeNotification(notification) {
  if (!notification || !notification.parentNode) return;

  // Remove from tracking first to prevent re-position race
  const idx = activeNotifications.indexOf(notification);
  if (idx > -1) activeNotifications.splice(idx, 1);

  notification.classList.add('hide');

  setTimeout(() => {
    if (notification.parentNode) notification.parentNode.removeChild(notification);
    repositionNotifications();
  }, NOTIFICATION_CONFIG.animationDuration);
}

/**
 * Reposition remaining notifications after one is removed
 */
function repositionNotifications() {
  const getHeight = (el) => {
    const r = el.getBoundingClientRect();
    return Math.max(0, Math.round(r.height)) || 80;
  };

  activeNotifications.forEach((notification, index) => {
    const h = getHeight(notification);
    const offset = index * (h + NOTIFICATION_CONFIG.spacing);

    if (['top-right', 'top-left'].includes(NOTIFICATION_CONFIG.position)) {
      notification.style.top = `${20 + offset}px`;
      notification.style.bottom = '';
    } else {
      notification.style.bottom = `${20 + offset}px`;
      notification.style.top = '';
    }
  });
}

/**
 * Play a short "chime" using the Web Audio API (best-effort)
 */
function playAchievementSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const start = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Triad-ish arpeggio
    osc.type = 'sine';
    osc.frequency.setValueAtTime(659.25, start);        // E5
    osc.frequency.setValueAtTime(783.99, start + 0.10); // G5
    osc.frequency.setValueAtTime(987.77, start + 0.20); // B5

    gain.gain.setValueAtTime(0.08, start);
    gain.gain.exponentialRampToValueAtTime(0.01, start + 0.5);

    osc.start(start);
    osc.stop(start + 0.5);
  } catch (err) {
    // Silently ignore on restricted autoplay contexts
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('Achievement sound not available:', err);
    }
  }
}

// ============================================================================
// STYLES
// ============================================================================

/**
 * Inject CSS styles once
 */
function addNotificationStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('achievement-notification-styles')) return;

  const style = document.createElement('style');
  style.id = 'achievement-notification-styles';
  style.textContent = `
    .achievement-notification-container {
      position: fixed;
      inset: 0; /* container is just a logical parent; children are fixed */
      pointer-events: none;
      z-index: 10000;
    }

    .achievement-notification {
      position: fixed;
      min-width: 300px;
      max-width: 400px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(10px);
      opacity: 0;
      transform: translateX(100%);
      transition:
        opacity ${NOTIFICATION_CONFIG.animationDuration}ms cubic-bezier(0.68,-0.55,0.265,1.55),
        transform ${NOTIFICATION_CONFIG.animationDuration}ms cubic-bezier(0.68,-0.55,0.265,1.55);
      pointer-events: auto;
      cursor: pointer;
      overflow: hidden;
    }

    /* Left-side slide direction */
    .achievement-notification.left {
      transform: translateX(-100%);
    }
    .achievement-notification.show {
      opacity: 1;
      transform: translateX(0);
    }
    .achievement-notification.left.hide {
      opacity: 0;
      transform: translateX(-100%);
    }
    .achievement-notification:not(.left).hide {
      opacity: 0;
      transform: translateX(100%);
    }

    .achievement-notification-content {
      display: flex;
      align-items: center;
      padding: 16px;
      position: relative;
    }

    .achievement-icon {
      font-size: 2rem;
      margin-right: 12px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      animation: achievementPulse 2s ease-in-out infinite;
    }

    @keyframes achievementPulse {
      0%, 100% { transform: scale(1); }
      50%      { transform: scale(1.1); }
    }

    .achievement-text { flex: 1; color: #fff; }
    .achievement-title {
      margin: 0 0 4px 0;
      font-size: 0.9rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.9;
    }
    .achievement-name {
      margin: 0 0 4px 0;
      font-size: 1.1rem;
      font-weight: 700;
      line-height: 1.2;
    }
    .achievement-description {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.8;
      line-height: 1.3;
    }

    .achievement-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    }
    .achievement-close:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .achievement-progress-bar {
      height: 3px;
      background: rgba(255, 255, 255, 0.2);
      position: relative;
      overflow: hidden;
    }
    .achievement-progress-fill {
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      width: 100%;
      transform: translateX(-100%);
      animation: achievementProgress ${NOTIFICATION_CONFIG.duration}ms linear forwards;
    }
    @keyframes achievementProgress {
      from { transform: translateX(-100%); }
      to   { transform: translateX(0); }
    }

    /* Mobile */
    @media (max-width: 480px) {
      .achievement-notification {
        min-width: 280px;
        max-width: calc(100vw - 40px);
        left: 20px !important;
        right: 20px !important;
        width: auto;
      }
      .achievement-notification-content { padding: 12px; }
      .achievement-icon { width: 40px; height: 40px; font-size: 1.5rem; margin-right: 10px; }
      .achievement-title { font-size: 0.8rem; }
      .achievement-name { font-size: 1rem; }
      .achievement-description { font-size: 0.8rem; }
    }

    /* High contrast mode */
    @media (prefers-contrast: high) {
      .achievement-notification {
        background: #1a1a1a;
        border: 2px solid #ffffff;
      }
      .achievement-icon {
        background: #ffffff;
        color: #000000;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .achievement-notification {
        transition: opacity 0.2s ease;
      }
      .achievement-icon {
        animation: none;
      }
      .achievement-progress-fill {
        animation: none;
        transform: translateX(0);
      }
    }
  `;

  document.head.appendChild(style);
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Clear all active notifications
 */
export function clearAllNotifications() {
  // create a copy because removeNotification mutates the array
  [...activeNotifications].forEach((n) => removeNotification(n));
}

/**
 * Update notification position and reflow
 * @param {'top-right'|'top-left'|'bottom-right'|'bottom-left'} position
 */
export function setNotificationPosition(position) {
  NOTIFICATION_CONFIG.position = position;
  repositionNotifications();
}

/**
 * Check for newly unlocked achievements and show notifications
 * @returns {string[]} IDs of newly unlocked achievements
 */
export function checkAndShowAchievementNotifications() {
  const newlyUnlocked = checkAndUnlockAchievements();
  if (Array.isArray(newlyUnlocked) && newlyUnlocked.length > 0) {
    showMultipleAchievementNotifications(newlyUnlocked);
  }
  return newlyUnlocked;
}

// Consolidated API
export const achievementNotifications = {
  show: showAchievementNotification,
  showMultiple: showMultipleAchievementNotifications,
  clear: clearAllNotifications,
  setPosition: setNotificationPosition,
  checkAndShow: checkAndShowAchievementNotifications
};

// Auto-initialize in browsers
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNotificationSystem);
  } else {
    initializeNotificationSystem();
  }
}
