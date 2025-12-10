/**
 * FinePointRehab Gamification System
 * Task 15: Gamification Integration
 * 
 * Features:
 * - Simple points system (session completion = points)
 * - Level progression with meaningful thresholds
 * - Visual progress indicators
 * - Motivational messaging using "Guided Path" language
 * - Data visualization preparation
 */

// Storage version and namespace
const STORAGE_VERSION = 1;
const PREFIX = `FPR_v${STORAGE_VERSION}_`;

// Gamification constants using "Guided Path" therapeutic language
const GAMIFICATION_CONFIG = {
  // Points system
  baseSessionPoints: 50,
  personalBestBonus: 25,
  streakBonus: 10,
  
  // Level progression with meaningful therapeutic thresholds
  levelThresholds: [
    { level: 1, points: 0, title: "Taking First Steps", message: "Welcome to your healing journey" },
    { level: 2, points: 200, title: "Building Momentum", message: "You're establishing a positive routine" },
    { level: 3, points: 500, title: "Finding Your Rhythm", message: "Consistency is becoming natural" },
    { level: 4, points: 1000, title: "Gaining Confidence", message: "Your skills are noticeably improving" },
    { level: 5, points: 1750, title: "Steady Progress", message: "You're making meaningful advances" },
    { level: 6, points: 2750, title: "Developing Mastery", message: "Your dedication is showing results" },
    { level: 7, points: 4000, title: "Sustained Growth", message: "You've built strong therapeutic habits" },
    { level: 8, points: 5500, title: "Advanced Practice", message: "Your commitment is inspiring" },
    { level: 9, points: 7500, title: "Expert Navigator", message: "You've mastered your guided path" },
    { level: 10, points: 10000, title: "Recovery Champion", message: "You're an example of perseverance" }
  ],
  
  // Motivational messages for session completion
  completionMessages: [
    "Great work—another step forward",
    "You're building something wonderful",
    "Each session brings new progress",
    "Your dedication is paying off",
    "Another milestone on your path",
    "You're growing stronger every day",
    "Beautiful progress on your journey",
    "Your effort is making a difference",
    "Keep walking your guided path",
    "You're exactly where you need to be"
  ]
};

/**
 * Core Gamification Class
 */
class GamificationSystem {
  constructor() {
    this.loadProgress();
    
    // Only setup event listeners in browser environment
    if (typeof document !== 'undefined') {
      this.setupEventListeners();
    }
    
    this._listenersSetup = false; // Flag to prevent duplicate listeners
  }

  /**
   * Load user progress from localStorage
   */
  loadProgress() {
    try {
      // Check if localStorage is available
      if (!this.isStorageAvailable()) {
        console.warn('localStorage not available, using memory-only mode');
        this.resetProgress();
        return;
      }

      this.totalPoints = parseInt(localStorage.getItem(`${PREFIX}totalPoints`) || '0', 10);
      this.sessionsCompleted = parseInt(localStorage.getItem(`${PREFIX}sessionsCompleted`) || '0', 10);
      
      // Always compute level from points to avoid drift
      this.currentLevel = this.calculateLevel(this.totalPoints);
      this.lastLevelUpPoints = this.getLevelThreshold(this.currentLevel);
      
      // Guard against max level
      if (this.currentLevel >= GAMIFICATION_CONFIG.levelThresholds.length) {
        this.nextLevelUpPoints = this.lastLevelUpPoints;
      } else {
        this.nextLevelUpPoints = this.getLevelThreshold(this.currentLevel + 1);
      }
    } catch (error) {
      console.error('Error loading gamification progress:', error);
      this.resetProgress();
    }
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Reset all progress (for testing or user choice)
   */
  resetProgress() {
    this.totalPoints = 0;
    this.currentLevel = 1;
    this.sessionsCompleted = 0;
    this.lastLevelUpPoints = 0;
    this.nextLevelUpPoints = this.getLevelThreshold(2); // Safe fallback to level 2
    this.saveProgress();
  }

  /**
   * Save progress to localStorage
   */
  saveProgress() {
    try {
      if (!this.isStorageAvailable()) {
        console.warn('localStorage not available, progress not saved');
        return;
      }
      
      localStorage.setItem(`${PREFIX}totalPoints`, this.totalPoints.toString());
      localStorage.setItem(`${PREFIX}sessionsCompleted`, this.sessionsCompleted.toString());
      // Note: currentLevel is computed from points, not stored separately to avoid drift
    } catch (error) {
      console.error('Error saving gamification progress:', error);
    }
  }

  /**
   * Calculate level based on total points
   */
  calculateLevel(points) {
    const thresholds = GAMIFICATION_CONFIG.levelThresholds;
    for (let i = thresholds.length - 1; i >= 0; i--) {
      if (points >= thresholds[i].points) {
        return thresholds[i].level;
      }
    }
    return 1;
  }

  /**
   * Get points threshold for a specific level
   */
  getLevelThreshold(level) {
    const threshold = GAMIFICATION_CONFIG.levelThresholds.find(t => t.level === level);
    return threshold ? threshold.points : GAMIFICATION_CONFIG.levelThresholds[GAMIFICATION_CONFIG.levelThresholds.length - 1].points;
  }

  /**
   * Get level information including title and message
   */
  getLevelInfo(level) {
    return GAMIFICATION_CONFIG.levelThresholds.find(t => t.level === level) || GAMIFICATION_CONFIG.levelThresholds[0];
  }

  /**
   * Award points for session completion
   */
  awardSessionPoints(exerciseId, score, isPersonalBest = false, currentStreak = 0) {
    const oldLevel = this.currentLevel;
    
    // Calculate points earned
    let pointsEarned = GAMIFICATION_CONFIG.baseSessionPoints;
    
    // Personal best bonus
    if (isPersonalBest) {
      pointsEarned += GAMIFICATION_CONFIG.personalBestBonus;
    }
    
    // Streak bonus (max 5 days)
    if (currentStreak > 1) {
      const streakBonus = Math.min(currentStreak - 1, 5) * GAMIFICATION_CONFIG.streakBonus;
      pointsEarned += streakBonus;
    }
    
    // Future enhancement: could add performance-based bonus using exerciseId and score
    // e.g., bonus points for high accuracy or specific exercise achievements
    
    // Update totals
    this.totalPoints += pointsEarned;
    this.sessionsCompleted += 1;
    this.currentLevel = this.calculateLevel(this.totalPoints);
    
    // Update level thresholds with max level guard
    this.lastLevelUpPoints = this.getLevelThreshold(this.currentLevel);
    if (this.currentLevel >= GAMIFICATION_CONFIG.levelThresholds.length) {
      this.nextLevelUpPoints = this.lastLevelUpPoints;
    } else {
      this.nextLevelUpPoints = this.getLevelThreshold(this.currentLevel + 1);
    }
    
    // Check for level up
    const leveledUp = this.currentLevel > oldLevel;
    
    // Save progress
    this.saveProgress();
    
    // Return results for UI display
    return {
      pointsEarned,
      totalPoints: this.totalPoints,
      currentLevel: this.currentLevel,
      leveledUp,
      newLevelInfo: leveledUp ? this.getLevelInfo(this.currentLevel) : null,
      motivationalMessage: this.getRandomCompletionMessage()
    };
  }

  /**
   * Get a random motivational completion message
   */
  getRandomCompletionMessage() {
    const messages = GAMIFICATION_CONFIG.completionMessages;
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Calculate progress percentage towards next level
   */
  getProgressToNextLevel() {
    if (this.currentLevel >= GAMIFICATION_CONFIG.levelThresholds.length) {
      return 100; // Max level reached
    }
    
    const currentLevelPoints = this.lastLevelUpPoints;
    const nextLevelPoints = this.nextLevelUpPoints;
    const progressPoints = this.totalPoints - currentLevelPoints;
    const totalNeeded = nextLevelPoints - currentLevelPoints;
    
    if (totalNeeded <= 0) return 100; // Safety guard
    
    return Math.min(100, Math.max(0, Math.round((progressPoints / totalNeeded) * 100)));
  }

  /**
   * Get current stats for dashboard display
   */
  getCurrentStats() {
    const currentLevelInfo = this.getLevelInfo(this.currentLevel);
    const progressPercent = this.getProgressToNextLevel();
    const isMaxLevel = this.currentLevel >= GAMIFICATION_CONFIG.levelThresholds.length;
    
    return {
      totalPoints: this.totalPoints,
      currentLevel: this.currentLevel,
      levelTitle: currentLevelInfo.title,
      levelMessage: currentLevelInfo.message,
      sessionsCompleted: this.sessionsCompleted,
      progressToNextLevel: progressPercent,
      pointsToNextLevel: isMaxLevel ? 0 : this.nextLevelUpPoints - this.totalPoints,
      isMaxLevel
    };
  }

  /**
   * Create and display visual progress indicators
   */
  renderProgressIndicators(containerSelector) {
    // Guard against non-browser environments
    if (typeof document === 'undefined') return;
    
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const stats = this.getCurrentStats();
    const progressPercent = Math.round(stats.progressToNextLevel);
    
    container.innerHTML = `
      <div class="gamification-progress">
        <div class="level-display">
          <div class="level-number">Level ${stats.currentLevel}</div>
          <div class="level-title">${stats.levelTitle}</div>
          <div class="level-message">${stats.levelMessage}</div>
        </div>
        
        <div class="progress-section">
          <div class="progress-bar" 
               role="progressbar" 
               aria-valuemin="0" 
               aria-valuemax="100" 
               aria-valuenow="${progressPercent}"
               aria-label="Progress to next level">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
          <div class="progress-text">
            ${stats.isMaxLevel ? 
              'Maximum level achieved!' : 
              `${stats.pointsToNextLevel} points to next level`
            }
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-number">${stats.totalPoints.toLocaleString()}</div>
            <div class="stat-label">Total Points</div>
          </div>
          <div class="stat">
            <div class="stat-number">${stats.sessionsCompleted}</div>
            <div class="stat-label">Sessions Completed</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Display session completion celebration
   */
  celebrateSessionCompletion(result, containerSelector) {
    // Guard against non-browser environments
    if (typeof document === 'undefined') return;
    
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let celebrationHTML = `
      <div class="session-celebration">
        <div class="celebration-header">
          <h3>Session Complete!</h3>
          <p class="motivational-message">${result.motivationalMessage}</p>
        </div>
        
        <div class="points-earned">
          <div class="points-display">+${result.pointsEarned} points</div>
          <div class="total-points">Total: ${result.totalPoints.toLocaleString()} points</div>
        </div>
    `;

    // Add level up celebration if applicable
    if (result.leveledUp) {
      celebrationHTML += `
        <div class="level-up-celebration">
          <div class="level-up-banner">🎉 Level Up! 🎉</div>
          <div class="new-level">Level ${result.currentLevel}: ${result.newLevelInfo.title}</div>
          <div class="level-message">${result.newLevelInfo.message}</div>
        </div>
      `;
    }

    celebrationHTML += `
      </div>
    `;

    container.innerHTML = celebrationHTML;

    // Add CSS classes for animations (if using CSS animations)
    container.classList.add('celebration-visible');
  }

  /**
   * Setup event listeners for data export preparation
   */
  setupEventListeners() {
    // Prevent duplicate listeners
    if (this._listenersSetup || typeof document === 'undefined') return;
    
    // Bind method to preserve 'this' context
    this._onSessionCompleted = (event) => {
      const { exerciseId, score, isPersonalBest, currentStreak } = event.detail;
      const result = this.awardSessionPoints(exerciseId, score, isPersonalBest, currentStreak);
      
      // Dispatch level up event if applicable
      if (result.leveledUp) {
        document.dispatchEvent(new CustomEvent('levelUp', {
          detail: {
            newLevel: result.currentLevel,
            levelInfo: result.newLevelInfo
          }
        }));
      }
      
      // Dispatch points awarded event for other modules
      document.dispatchEvent(new CustomEvent('pointsAwarded', {
        detail: result
      }));
    };
    
    // Listen for custom events from other modules
    document.addEventListener('sessionCompleted', this._onSessionCompleted);
    
    this._listenersSetup = true;
  }

  /**
   * Export gamification data for backup/sync
   */
  exportData() {
    return {
      version: STORAGE_VERSION,
      totalPoints: this.totalPoints,
      currentLevel: this.currentLevel,
      sessionsCompleted: this.sessionsCompleted,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import gamification data from backup
   */
  importData(data) {
    try {
      if (data.version !== STORAGE_VERSION) {
        console.warn('Gamification data version mismatch');
        return false;
      }
      
      this.totalPoints = data.totalPoints || 0;
      this.currentLevel = data.currentLevel || this.calculateLevel(this.totalPoints);
      this.sessionsCompleted = data.sessionsCompleted || 0;
      
      this.saveProgress();
      return true;
    } catch (error) {
      console.error('Error importing gamification data:', error);
      return false;
    }
  }
}

/**
 * Initialize gamification system
 */
let gamificationSystem = null;

function initGamification() {
  if (!gamificationSystem) {
    gamificationSystem = new GamificationSystem();
  }
  return gamificationSystem;
}

/**
 * Get gamification instance (lazy initialization)
 */
function getGamification() {
  return gamificationSystem || initGamification();
}

/**
 * CSS for basic styling (to be included in components.css)
 */
const GAMIFICATION_CSS = `
/* Gamification Progress Indicators */
.gamification-progress {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 20px;
  margin: 16px 0;
  border: 1px solid var(--border);
}

.level-display {
  text-align: center;
  margin-bottom: 20px;
}

.level-number {
  font-size: 2rem;
  font-weight: bold;
  color: var(--brand-blue);
  margin-bottom: 4px;
}

.level-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.level-message {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-style: italic;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-bar {
  height: 12px;
  background: var(--border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--brand-aqua), var(--brand-blue));
  transition: width 0.5s ease;
  /* Note: No border-radius to prevent squaring at low percentages */
}

.progress-text {
  text-align: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat {
  text-align: center;
  padding: 12px;
  background: var(--bg-primary);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.stat-number {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--brand-blue);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Session Celebration */
.session-celebration {
  background: var(--bg-secondary);
  border: 2px solid var(--success);
  border-radius: 12px;
  padding: 24px;
  margin: 20px 0;
  text-align: center;
}

.celebration-header h3 {
  color: var(--success);
  margin-bottom: 8px;
}

.motivational-message {
  font-style: italic;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.points-earned {
  margin-bottom: 16px;
}

.points-display {
  font-size: 2rem;
  font-weight: bold;
  color: var(--brand-blue);
  margin-bottom: 4px;
}

.total-points {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.level-up-celebration {
  background: linear-gradient(135deg, var(--brand-aqua), var(--brand-blue));
  color: white;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.level-up-banner {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 8px;
}

.new-level {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.level-message {
  font-size: 0.9rem;
  opacity: 0.9;
}

/* Animation for celebrations */
.celebration-visible {
  animation: celebrationSlideIn 0.5s ease-out;
}

@keyframes celebrationSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile responsive adjustments */
@media (max-width: 768px) {
  .level-number {
    font-size: 1.75rem;
  }
  
  .level-title {
    font-size: 1.1rem;
  }
  
  .stats-grid {
    gap: 12px;
  }
  
  .stat {
    padding: 10px;
  }
  
  .stat-number {
    font-size: 1.25rem;
  }
  
  .points-display {
    font-size: 1.75rem;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .progress-fill {
    transition: none;
  }
  
  .celebration-visible {
    animation: none;
  }
}
`;

// Export for use in other modules
export {
  GamificationSystem,
  initGamification,
  getGamification,
  GAMIFICATION_CONFIG,
  GAMIFICATION_CSS
};

// Auto-initialize if not using modules
if (typeof module === 'undefined' && typeof window !== 'undefined') {
  window.Gamification = {
    init: initGamification,
    get: getGamification,
    config: GAMIFICATION_CONFIG,
    css: GAMIFICATION_CSS
  };
}