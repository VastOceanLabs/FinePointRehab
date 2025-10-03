/**
 * FinePointRehab Session Enhancement System
 * Task 16: Mobile-aware celebrations, achievements, and progress feedback
 * 
 * Features:
 * - Pre-session personal best display
 * - iOS-compliant audio celebrations
 * - Reduced-motion aware animations
 * - Achievement notifications with debounced queue
 * - Progress milestone recognition
 * - Therapeutic language and encouragement
 * - SSR/non-DOM safety throughout
 */

import { storage, toast, audio } from './utils.js';

// SSR/DOM safety check — move this ABOVE any use of isBrowser
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

// Dynamic import to prevent module loading failures
let EXERCISES = null;
if (isBrowser) {
  import('./exercises.js')
    .then(m => { EXERCISES = m?.EXERCISES ?? null; })
    .catch(() => { EXERCISES = null; });
}

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CELEBRATION_SOUNDS = {
  sessionComplete: '/audio/session-complete.mp3',
  personalBest: '/audio/personal-best.mp3', 
  achievement: '/audio/achievement.mp3',
  milestone: '/audio/milestone.mp3'
};

const CONFETTI_CONFIG = {
  particleCount: 50,
  spread: 70,
  origin: { y: 0.6 },
  colors: ['#48cae4', '#2563eb', '#10b981', '#f59e0b'],
  duration: 4500 // Ensure duration > max fall time (4s)
};

const MILESTONES = [
  { sessions: 5, message: "You're building great habits!" },
  { sessions: 10, message: "Wonderful consistency!" },
  { sessions: 25, message: "You're making real progress!" },
  { sessions: 50, message: "Amazing dedication!" },
  { sessions: 100, message: "Incredible milestone reached!" }
];

// ============================================================================
// PERSONAL BEST TRACKING
// ============================================================================

class PersonalBestTracker {
  constructor() {
    this.storagePrefix = 'FPR_v1_exercise:';
  }

  /**
   * Get personal best score for an exercise/difficulty
   * @param {string} exerciseId - Exercise identifier
   * @param {string} difficulty - Difficulty level
   * @returns {number} Best score or 0 if none
   */
  getBest(exerciseId, difficulty = 'default') {
    const key = `${this.storagePrefix}${exerciseId}:${difficulty}:best`;
    return storage.get(key, 0);
  }

  /**
   * Update personal best if score is higher
   * @param {string} exerciseId - Exercise identifier  
   * @param {string} difficulty - Difficulty level
   * @param {number} score - New score
   * @returns {boolean} True if new personal best
   */
  updateBest(exerciseId, difficulty = 'default', score) {
    const currentBest = this.getBest(exerciseId, difficulty);
    if (score > currentBest) {
      const key = `${this.storagePrefix}${exerciseId}:${difficulty}:best`;
      storage.set(key, score);
      return true;
    }
    return false;
  }

  /**
   * Get session count for an exercise/difficulty
   * @param {string} exerciseId - Exercise identifier
   * @param {string} difficulty - Difficulty level  
   * @returns {number} Session count
   */
  getSessionCount(exerciseId, difficulty = 'default') {
    const key = `${this.storagePrefix}${exerciseId}:${difficulty}:sessions`;
    return storage.get(key, 0);
  }

  /**
   * Increment session count
   * @param {string} exerciseId - Exercise identifier
   * @param {string} difficulty - Difficulty level
   */
  incrementSessions(exerciseId, difficulty = 'default') {
    const key = `${this.storagePrefix}${exerciseId}:${difficulty}:sessions`;
    const current = this.getSessionCount(exerciseId, difficulty);
    storage.set(key, current + 1);
  }

  /**
   * Create pre-session display element
   * @param {string} exerciseId - Exercise identifier
   * @param {string} difficulty - Difficulty level
   * @returns {HTMLElement} Display element
   */
  createPreSessionDisplay(exerciseId, difficulty = 'default') {
    const best = this.getBest(exerciseId, difficulty);
    const sessions = this.getSessionCount(exerciseId, difficulty);
    
    const container = document.createElement('div');
    container.className = 'pre-session-display';
    container.innerHTML = `
      <div class="personal-stats">
        <div class="stat-item">
          <span class="stat-label">Personal Best</span>
          <span class="stat-value">${best || 'None yet'}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Sessions Completed</span>
          <span class="stat-value">${sessions}</span>
        </div>
      </div>
    `;
    
    return container;
  }
}

// ============================================================================
// CELEBRATION ANIMATIONS
// ============================================================================

class CelebrationManager {
  constructor() {
    this.audioInitialized = false;
    this.respectsReducedMotion = this.checkReducedMotion();
    this.confettiOverride = isBrowser ? storage.get('confettiOverride', false) : false;
    
    // Initialize audio files lazily
    this.initAudio();
    
    // Listen for reduced motion preference changes (modern API)
    if (isBrowser && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      // Use modern addEventListener instead of deprecated addListener
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', () => {
          this.respectsReducedMotion = this.checkReducedMotion();
        });
      } else if (mediaQuery.addListener) {
        // Fallback for older browsers
        mediaQuery.addListener(() => {
          this.respectsReducedMotion = this.checkReducedMotion();
        });
      }
    }
  }

  /**
   * Check if user prefers reduced motion
   * @returns {boolean} True if reduced motion preferred
   */
  checkReducedMotion() {
    if (!isBrowser || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches && !this.confettiOverride;
  }

  /**
   * Initialize audio files on first user gesture
   */
  initAudio() {
    if (!isBrowser) return;
    
    const initOnGesture = () => {
      if (this.audioInitialized) return;
      
      // Create audio elements for all celebration sounds
      Object.entries(CELEBRATION_SOUNDS).forEach(([id, path]) => {
        // Remove extension since audio.create handles it
        const pathWithoutExt = path.replace(/\.(mp3|m4a|ogg)$/, '');
        // Guard audio creation
        if (audio && typeof audio.create === 'function') {
          audio.create(id, pathWithoutExt);
        }
      });
      
      // iOS audio priming for better compatibility
      if (audio && typeof audio.setMuted === 'function') {
        const wasMuted = typeof audio.muted === 'boolean' ? audio.muted : true;
        audio.setMuted(true);
        Object.keys(CELEBRATION_SOUNDS).forEach(id => { try { audio.play(id); } catch {} });
        setTimeout(() => audio.setMuted(wasMuted), 0);
      }
      
      this.audioInitialized = true;
    };

    // Use modern event listeners with passive option for performance
    document.addEventListener('pointerdown', initOnGesture, { once: true, passive: true });
    document.addEventListener('touchstart', initOnGesture, { once: true, passive: true });
    document.addEventListener('click', initOnGesture, { once: true });
  }

  /**
   * Create confetti animation
   * @param {Object} config - Animation configuration
   */
  createConfetti(config = CONFETTI_CONFIG) {
    if (!isBrowser) return;
    
    if (this.respectsReducedMotion) {
      // Alternative visual feedback for reduced motion
      this.showStaticCelebration();
      return;
    }

    // Create confetti particles
    const container = document.createElement('div');
    container.className = 'confetti-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 9999;
    `;

    let maxFallDuration = 0;

    for (let i = 0; i < config.particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      const size = Math.random() * 8 + 4; // 4-12px
      const startX = Math.random() * window.innerWidth;
      const fallDuration = Math.random() * 2 + 2; // 2-4 seconds
      const horizontalDrift = (Math.random() - 0.5) * config.spread;
      
      maxFallDuration = Math.max(maxFallDuration, fallDuration);
      
      particle.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        top: -10px;
        left: ${startX}px;
        --dx: ${horizontalDrift}px;
        animation: confetti-fall ${fallDuration}s ease-out forwards;
      `;
      
      container.appendChild(particle);
    }

    document.body.appendChild(container);

    // Clean up after animation completes (ensure duration > max fall time)
    const cleanupTime = Math.max(config.duration, maxFallDuration * 1000);
    setTimeout(() => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }, cleanupTime);
  }

  /**
   * Show static celebration for reduced motion users
   */
  showStaticCelebration() {
    if (!isBrowser) return;
    
    const celebration = document.createElement('div');
    celebration.className = 'static-celebration';
    celebration.textContent = '🎉'; // use textContent, not innerHTML
    celebration.setAttribute('role', 'status');
    celebration.setAttribute('aria-live', 'polite');
    celebration.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 4rem;
      z-index: 9999;
      animation: fade-in-out 2s ease-in-out;
    `;
    
    document.body.appendChild(celebration);
    
    setTimeout(() => {
      if (celebration.parentNode) {
        celebration.parentNode.removeChild(celebration);
      }
    }, 2000);
  }

  /**
   * Toggle confetti animations override
   */
  toggleConfettiOverride() {
    if (!isBrowser) return false;
    
    this.confettiOverride = !this.confettiOverride;
    storage.set('confettiOverride', this.confettiOverride);
    this.respectsReducedMotion = this.checkReducedMotion();
    return this.confettiOverride;
  }

  /**
   * Play celebration with audio and visual effects
   * @param {string} type - Type of celebration
   * @param {Object} options - Additional options
   */
  celebrate(type, options = {}) {
    if (!isBrowser) return;
    
    // Play audio (with enhanced error handling for audio API differences)
    if (this.audioInitialized && audio) {
      if (typeof audio.play === 'function') {
        audio.play(type);
      } else if (typeof audio.playSound === 'function') {
        audio.playSound(type);
      }
    }

    // Show visual effects based on type
    switch (type) {
      case 'sessionComplete':
        this.createConfetti();
        break;
      case 'personalBest':
        this.createConfetti({ 
          ...CONFETTI_CONFIG, 
          colors: ['#10b981', '#34d399'],
          particleCount: 75 
        });
        break;
      case 'achievement':
        this.createConfetti({ 
          ...CONFETTI_CONFIG, 
          colors: ['#f59e0b', '#fbbf24'],
          particleCount: 60 
        });
        break;
      case 'milestone':
        this.createConfetti({ 
          ...CONFETTI_CONFIG, 
          colors: ['#8b5cf6', '#a78bfa'],
          particleCount: 40 
        });
        break;
      default:
        // Fallback celebration for unknown types
        this.createConfetti();
        break;
    }
  }
}

// ============================================================================
// PROGRESS MILESTONE RECOGNITION
// ============================================================================

class MilestoneTracker {
  constructor() {
    if (!isBrowser) {
      this.achievedMilestones = [];
      return;
    }
    
    // Ensure storage returns proper array of numbers
    const stored = storage.get('FPR_v1_milestones', []);
    this.achievedMilestones = Array.isArray(stored) ? stored.map(Number).filter(n => !isNaN(n)) : [];
  }

  /**
   * Check for new milestones based on total sessions
   * @param {number} totalSessions - Total session count
   * @returns {Array} New milestones achieved
   */
  checkMilestones(totalSessions) {
    const newMilestones = [];
    
    for (const milestone of MILESTONES) {
      if (totalSessions >= milestone.sessions && 
          !this.achievedMilestones.includes(milestone.sessions)) {
        
        newMilestones.push(milestone);
        this.achievedMilestones.push(milestone.sessions);
      }
    }
    
    if (newMilestones.length > 0) {
      storage.set('FPR_v1_milestones', this.achievedMilestones);
    }
    
    return newMilestones;
  }

  /**
   * Get all achieved milestones
   * @returns {Array} Achieved milestone session counts
   */
  getAchievedMilestones() {
    return [...this.achievedMilestones];
  }
}

// ============================================================================
// SESSION ENHANCEMENT SYSTEM
// ============================================================================

class SessionEnhancementSystem {
  constructor() {
    this.personalBest = new PersonalBestTracker();
    this.celebration = new CelebrationManager();
    this.milestones = new MilestoneTracker();
    this.notificationQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Initialize session enhancement for an exercise page
   * @param {string} exerciseId - Exercise identifier
   * @param {string} difficulty - Current difficulty level
   */
  initializeExercise(exerciseId, difficulty = 'default') {
    if (!isBrowser) return;
    
    this.currentExercise = { id: exerciseId, difficulty };
    
    // Add pre-session display
    this.addPreSessionDisplay();
    
    // Add controls for celebration preferences
    this.addCelebrationControls();
  }

  /**
   * Add pre-session personal best display to settings panel
   */
  addPreSessionDisplay() {
    if (!isBrowser) return;
    
    const { id, difficulty } = this.currentExercise;
    
    // Target the settings panel specifically
    const settingsPanel = document.getElementById('settings-panel') ||
                         document.querySelector('.settings-panel');
    
    if (!settingsPanel) return;
    
    // Remove any existing pre-session display to prevent duplicates
    const existingDisplay = settingsPanel.querySelector('.pre-session-display');
    if (existingDisplay) {
      existingDisplay.remove();
    }
    
    // Create new display
    const display = this.personalBest.createPreSessionDisplay(id, difficulty);
    
    // Insert at the top of the settings panel
    settingsPanel.insertBefore(display, settingsPanel.firstChild);
  }

  /**
   * Add celebration control toggles
   */
  addCelebrationControls() {
    if (!isBrowser) return;
    
    const settingsPanel = document.getElementById('settings-panel') ||
                         document.querySelector('.settings-panel');
    
    if (!settingsPanel) return;

    // Remove old controls if present to prevent duplicates
    settingsPanel.querySelector('.celebration-controls')?.remove();
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'celebration-controls';
    
    // Handle different audio API patterns
    const audioMuted = audio && (audio.muted !== undefined ? audio.muted : 
                                audio.isMuted !== undefined ? audio.isMuted() : false);
    
    controlsContainer.innerHTML = `
      <div class="control-group">
        <label class="control-label">
          <input type="checkbox" id="audio-mute-toggle" ${audioMuted ? 'checked' : ''}>
          <span>Mute audio celebrations</span>
        </label>
        <label class="control-label">
          <input type="checkbox" id="confetti-override-toggle" ${this.celebration.confettiOverride ? 'checked' : ''}>
          <span>Enable animations (overrides reduced motion)</span>
        </label>
      </div>
    `;

    // Add event listeners
    const audioToggle = controlsContainer.querySelector('#audio-mute-toggle');
    const confettiToggle = controlsContainer.querySelector('#confetti-override-toggle');

    audioToggle.addEventListener('change', () => {
      if (audio) {
        if (typeof audio.setMuted === 'function') {
          audio.setMuted(audioToggle.checked);
        } else if (typeof audio.toggleMute === 'function') {
          audio.toggleMute();
        }
      }
    });

    confettiToggle.addEventListener('change', () => {
      this.celebration.toggleConfettiOverride();
    });

    settingsPanel.appendChild(controlsContainer);
  }

  /**
   * Handle session completion with comprehensive feedback
   * @param {Object} sessionData - Session results
   */
  handleSessionComplete(sessionData) {
    const { id, difficulty } = this.currentExercise;
    const { score, accuracy } = sessionData;

    // Update session count
    this.personalBest.incrementSessions(id, difficulty);
    
    // Check for personal best
    const isPersonalBest = this.personalBest.updateBest(id, difficulty, score);
    
    // Check for milestones
    const totalSessions = this.getTotalSessions();
    const newMilestones = this.milestones.checkMilestones(totalSessions);

    // Queue notifications
    this.queueSessionCompleteNotification(isPersonalBest);
    
    if (isPersonalBest) {
      this.queuePersonalBestNotification(score);
    }
    
    newMilestones.forEach(milestone => {
      this.queueMilestoneNotification(milestone);
    });

    // Add encouraging message to completion screen
    this.addEncouragementMessage(isPersonalBest, newMilestones.length > 0);

    // Start processing notification queue
    this.processNotificationQueue();
  }

  /**
   * Get total sessions across all exercises
   * @returns {number} Total session count
   */
  getTotalSessions() {
    if (!isBrowser || !EXERCISES) {
      // Fallback: count just the current exercise/difficulty
      const { id, difficulty } = this.currentExercise || {};
      return this.personalBest.getSessionCount(id || 'unknown', difficulty || 'default');
    }
    
    let total = 0;
    for (const [key, ex] of Object.entries(EXERCISES)) {
      const eid = ex?.id || key;
      const diffs = ex?.difficulties || ['default'];
      diffs.forEach(d => total += this.personalBest.getSessionCount(eid, d));
    }
    return total;
  }

  /**
   * Queue session completion notification
   * @param {boolean} isPersonalBest - Whether this was a personal best
   */
  queueSessionCompleteNotification(isPersonalBest) {
    const message = isPersonalBest ? 
      "Great work—new personal best!" : 
      "Great work—another step forward";
    
    this.notificationQueue.push({
      type: 'sessionComplete',
      message,
      celebrationType: isPersonalBest ? 'personalBest' : 'sessionComplete'
    });
  }

  /**
   * Queue personal best notification
   * @param {number} score - New best score
   */
  queuePersonalBestNotification(score) {
    this.notificationQueue.push({
      type: 'personalBest',
      message: `New personal best: ${score}!`,
      celebrationType: 'personalBest',
      debounceKey: `personalBest:${score}` // Better deduplication
    });
  }

  /**
   * Queue milestone notification
   * @param {Object} milestone - Milestone data
   */
  queueMilestoneNotification(milestone) {
    this.notificationQueue.push({
      type: 'milestone',
      message: `${milestone.sessions} sessions completed! ${milestone.message}`,
      celebrationType: 'milestone',
      debounceKey: `milestone:${milestone.sessions}` // Better deduplication
    });
  }

  /**
   * Process notification queue with proper draining to prevent dropped notifications
   */
  async processNotificationQueue() {
    if (!isBrowser || this.isProcessingQueue) return;

    this.isProcessingQueue = true;

    // Use draining loop to prevent dropping notifications added during processing
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      
      // Show toast notification with improved debouncing (guard against missing toast)
      toast?.show?.(notification.message, {
        type: notification.type === 'personalBest' ? 'success' : 'info',
        duration: 4000,
        debounceKey: notification.debounceKey || `${notification.type}:${notification.message}`
      });

      // Trigger celebration
      this.celebration.celebrate(notification.celebrationType);

      // Wait between notifications
      await this.delay(1500);
    }

    this.isProcessingQueue = false;
  }

  /**
   * Add encouragement message to completion screen
   * @param {boolean} isPersonalBest - Whether this was a personal best
   * @param {boolean} hasMilestone - Whether milestone was reached
   */
  addEncouragementMessage(isPersonalBest, hasMilestone) {
    if (!isBrowser) return;
    
    const card = document.getElementById('completion-card') || 
                document.querySelector('#completion-message .panel');
    
    if (!card) return;

    const encouragementDiv = document.createElement('div');
    encouragementDiv.className = 'encouragement-message';
    encouragementDiv.setAttribute('role', 'status');
    encouragementDiv.setAttribute('aria-live', 'polite');
    
    let message = "Great work—another step forward";
    if (isPersonalBest && hasMilestone) {
      message = "Excellent! New personal best and milestone reached!";
    } else if (isPersonalBest) {
      message = "Wonderful! You've set a new personal best!";
    } else if (hasMilestone) {
      message = "Amazing! You've reached an important milestone!";
    }

    encouragementDiv.innerHTML = `<p class="encouragement-text">${message}</p>`;
    
    // Insert into the card, not the overlay
    card.insertBefore(encouragementDiv, card.firstChild);
  }

  /**
   * Utility method for async delays
   * @param {number} ms - Milliseconds to delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current exercise statistics for display
   * @returns {Object} Exercise statistics
   */
  getCurrentStats() {
    const { id, difficulty } = this.currentExercise;
    return {
      personalBest: this.personalBest.getBest(id, difficulty),
      sessions: this.personalBest.getSessionCount(id, difficulty),
      totalSessions: this.getTotalSessions(),
      achievedMilestones: this.milestones.getAchievedMilestones()
    };
  }
}

// ============================================================================
// CSS STYLES FOR ENHANCEMENT COMPONENTS
// ============================================================================

function injectStyles() {
  if (!isBrowser || document.getElementById('session-enhancement-styles')) return;

  const styles = document.createElement('style');
  styles.id = 'session-enhancement-styles';
  styles.textContent = `
    .pre-session-display {
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1rem;
      grid-column: 1 / -1;
      color: #fff;
    }

    .personal-stats {
      display: flex;
      gap: 2rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .stat-item {
      text-align: center;
    }

    .stat-label {
      display: block;
      font-size: 0.875rem;
      color: rgba(255,255,255,.75);
      margin-bottom: 0.25rem;
    }

    .stat-value {
      display: block;
      font-size: 1.5rem;
      font-weight: bold;
      color: var(--brand-aqua, #48cae4);
    }

    .celebration-controls {
      margin-top: 1rem;
      padding: 1rem;
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.12);
      border-radius: 8px;
      color: #fff;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .control-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .control-label input[type="checkbox"] {
      margin: 0;
    }

    .encouragement-message {
      text-align: center;
      padding: 1rem;
      margin-bottom: 1rem;
      background: linear-gradient(135deg, var(--brand-aqua, #48cae4), var(--brand-blue, #2563eb));
      color: white;
      border-radius: 8px;
    }

    .encouragement-text {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .static-celebration {
      pointer-events: none;
    }

    @keyframes confetti-fall {
      to {
        transform: translate(var(--dx, 0), 100vh) rotate(360deg);
        opacity: 0;
      }
    }

    @keyframes fade-in-out {
      0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    /* Respect reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .confetti-particle {
        animation: none !important;
      }
      
      .static-celebration {
        animation: none !important;
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
    }

    @media (max-width: 640px) {
      .personal-stats {
        gap: 1rem;
      }
      
      .stat-value {
        font-size: 1.25rem;
      }
      
      .control-group {
        gap: 0.5rem;
      }
    }
  `;

  document.head.appendChild(styles);
}

// ============================================================================
// INITIALIZATION & EXPORT
// ============================================================================

// Inject styles when module loads (with DOM safety)
if (isBrowser) {
  injectStyles();
}

// Create global instance
export const sessionEnhancement = new SessionEnhancementSystem();

// Export individual components for testing/advanced usage
export {
  PersonalBestTracker,
  CelebrationManager,
  MilestoneTracker,
  SessionEnhancementSystem
};