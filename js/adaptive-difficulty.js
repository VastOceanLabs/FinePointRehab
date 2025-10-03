/**
 * FinePointRehab Adaptive Difficulty Framework
 * Task 17: Configuration-driven unlock system with transparent UI
 * 
 * Features:
 * - Uses UNLOCK_RULES from exercises.js for easy tuning
 * - Transparent UI showing lock criteria 
 * - Namespaced storage: FPR_v1_unlock:exercise:difficulty
 * - Re-checks unlock status on page load
 * - Safety limits for therapeutic progression
 * - Toast notifications when new difficulties unlock
 */

import { UNLOCK_RULES, DIFFICULTY_LABELS, getExercise, getUnlockRule } from './exercises.js';
import { storage, showToast } from './utils.js';

// Storage namespaces for versioning and collision prevention
const UNLOCK_NS = 'FPR_v1_unlock';
const PERF_NS = 'FPR_v1_perf';

// Helper functions for consistent key generation
const unlockKey = (exerciseId, difficulty) => `${UNLOCK_NS}:${exerciseId}:${difficulty}`;
const perfKey = (exerciseId, difficulty) => `${PERF_NS}:${exerciseId}:${difficulty}`;

/**
 * Adaptive Difficulty Manager
 */
export const adaptiveDifficulty = {
    /**
     * Check if a specific difficulty is unlocked for an exercise
     * @param {string} exerciseId - The exercise identifier
     * @param {string} difficulty - The difficulty level to check
     * @returns {boolean} True if unlocked or no rule exists
     */
    isUnlocked(exerciseId, difficulty) {
        const unlockRule = getUnlockRule(exerciseId, difficulty);
        
        // If no unlock rule exists, difficulty is always available
        if (!unlockRule) {
            return true;
        }
        
        // Check storage for unlock status (handle both boolean and string values)
        const storageKeyValue = unlockKey(exerciseId, difficulty);
        const val = storage.get(storageKeyValue);
        return val === true || val === 'true';
    },

    /**
     * Get user's performance data for an exercise and difficulty
     * @param {string} exerciseId - The exercise identifier
     * @param {string} difficulty - The difficulty level
     * @returns {Object} Performance data { sessions: number, bestScore: number, averageScore: number }
     */
    getPerformanceData(exerciseId, difficulty) {
        const storageKeyValue = perfKey(exerciseId, difficulty);
        const defaultData = { sessions: 0, bestScore: 0, averageScore: 0, scores: [] };
        
        return storage.get(storageKeyValue) || defaultData;
    },

    /**
     * Record session performance and check for new unlocks
     * @param {string} exerciseId - The exercise identifier
     * @param {string} difficulty - The difficulty level completed
     * @param {number} score - The score achieved
     * @returns {Array<Object>} Array of newly unlocked difficulty objects
     */
    recordSession(exerciseId, difficulty, score) {
        // Record performance data
        const storageKeyValue = perfKey(exerciseId, difficulty);
        const perfData = this.getPerformanceData(exerciseId, difficulty);
        
        // Update performance metrics
        perfData.sessions += 1;
        perfData.bestScore = Math.max(perfData.bestScore, score);
        perfData.scores.push(score);
        
        // Keep only last 20 scores to prevent storage bloat
        if (perfData.scores.length > 20) {
            perfData.scores = perfData.scores.slice(-20);
        }
        
        // Calculate average with 1 decimal place for better precision
        perfData.averageScore = Number(
            (perfData.scores.reduce((sum, s) => sum + s, 0) / perfData.scores.length).toFixed(1)
        );
        
        storage.set(storageKeyValue, perfData);
        console.log(`📊 Performance recorded for ${perfKey(exerciseId, difficulty)}:`, perfData);
        
        // Check for new unlocks across all exercises and difficulties
        return this.checkAllUnlocks();
    },

    /**
     * Check all possible unlocks based on current performance
     * @returns {Array<Object>} Array of newly unlocked difficulty objects
     */
    checkAllUnlocks() {
        const newUnlocks = [];
        
        // Check each exercise's unlock rules
        Object.keys(UNLOCK_RULES).forEach(exerciseId => {
            const exerciseRules = UNLOCK_RULES[exerciseId];
            
            Object.keys(exerciseRules).forEach(difficulty => {
                // Skip if already unlocked
                if (this.isUnlocked(exerciseId, difficulty)) {
                    return;
                }
                
                const rule = exerciseRules[difficulty];
                const { base, minSessions = 0, minScore = 0 } = rule || {};
                
                if (!base) {
                    console.warn(`⚠️ Missing base difficulty for unlock rule: ${exerciseId}:${difficulty}`);
                    return;
                }
                
                const basePerf = this.getPerformanceData(exerciseId, base);
                
                // Check if unlock criteria are met
                const meetsSessionReq = basePerf.sessions >= minSessions;
                const meetsScoreReq = basePerf.bestScore >= minScore;
                
                if (meetsSessionReq && meetsScoreReq) {
                    // Unlock the difficulty
                    const storageKeyValue = unlockKey(exerciseId, difficulty);
                    storage.set(storageKeyValue, true);
                    
                    // Create unlock object for notification
                    const exercise = getExercise(exerciseId);
                    const difficultyName = DIFFICULTY_LABELS[difficulty] || difficulty;
                    
                    const unlockObj = {
                        exerciseId,
                        difficulty,
                        label: `${difficultyName} - ${exercise?.name || exerciseId}`
                    };
                    
                    newUnlocks.push(unlockObj);
                    
                    console.log(`🔓 Unlocked: ${unlockKey(exerciseId, difficulty)}`);
                }
            });
        });
        
        // Show toast notifications for new unlocks
        if (newUnlocks.length > 0) {
            this.showUnlockNotifications(newUnlocks);
        }
        
        return newUnlocks;
    },

    /**
     * Show toast notifications for newly unlocked difficulties
     * @param {Array<Object>} unlocks - Array of unlock objects
     */
    showUnlockNotifications(unlocks) {
        // Debounce multiple unlocks into a single notification
        if (unlocks.length === 1) {
            showToast(`🎉 New Difficulty Unlocked: ${unlocks[0].label}`, 'success', 5000);
        } else {
            const message = `🎉 ${unlocks.length} New Difficulties Unlocked! Check your exercises.`;
            showToast(message, 'success', 5000);
            
            // Log details for debugging
            console.log('🎉 Multiple unlocks:', unlocks.map(u => u.label).join(', '));
        }
    },

    /**
     * Get unlock criteria description for UI display
     * @param {string} exerciseId - The exercise identifier
     * @param {string} difficulty - The difficulty level
     * @returns {string|null} Human-readable unlock criteria or null if always available
     */
    getUnlockCriteria(exerciseId, difficulty) {
        const unlockRule = getUnlockRule(exerciseId, difficulty);
        
        if (!unlockRule) {
            return null; // Always available
        }
        
        const { base, minSessions = 0, minScore = 0 } = unlockRule;
        const baseDifficultyName = DIFFICULTY_LABELS[base] || base;
        
        return `Complete ${minSessions} sessions on ${baseDifficultyName} with score ≥ ${minScore}`;
    },

    /**
     * Get user's progress toward unlocking a difficulty
     * @param {string} exerciseId - The exercise identifier  
     * @param {string} difficulty - The difficulty level
     * @returns {Object|null} Progress info or null if always available
     */
    getUnlockProgress(exerciseId, difficulty) {
        const unlockRule = getUnlockRule(exerciseId, difficulty);
        
        if (!unlockRule) {
            return null; // Always available
        }
        
        const { base, minSessions = 0, minScore = 0 } = unlockRule;
        const basePerf = this.getPerformanceData(exerciseId, base);
        
        return {
            currentSessions: basePerf.sessions,
            requiredSessions: minSessions,
            currentBestScore: basePerf.bestScore,
            requiredScore: minScore,
            sessionsMet: basePerf.sessions >= minSessions,
            scoreMet: basePerf.bestScore >= minScore
        };
    },

    /**
     * Update difficulty selection UI based on unlock status
     * @param {string} exerciseId - The exercise identifier
     * @param {HTMLSelectElement} selectElement - The difficulty select element
     * @param {string} currentDifficulty - Currently selected difficulty
     */
    updateDifficultyUI(exerciseId, selectElement, currentDifficulty = null) {
        if (!selectElement) return;
        
        const exercise = getExercise(exerciseId);
        if (!exercise) return;
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        let selectedSet = false;
        
        // Add options based on unlock status
        exercise.difficulties.forEach(difficulty => {
            const option = document.createElement('option');
            option.value = difficulty;
            
            const difficultyName = DIFFICULTY_LABELS[difficulty] || difficulty;
            const isUnlocked = this.isUnlocked(exerciseId, difficulty);
            
            if (isUnlocked) {
                option.textContent = difficultyName;
                option.disabled = false;
            } else {
                const criteria = this.getUnlockCriteria(exerciseId, difficulty);
                option.textContent = `🔒 ${difficultyName}`;
                option.disabled = true;
                option.title = `Unlock ${difficultyName}: ${criteria}`;
            }
            
            // Select current difficulty or default to first unlocked
            if (!selectedSet && (currentDifficulty === difficulty || (!currentDifficulty && isUnlocked))) {
                option.selected = true;
                selectedSet = true;
            }
            
            selectElement.appendChild(option);
        });
        
        // Final guard: ensure an enabled option is selected
        if (!selectedSet) {
            const firstUnlocked = selectElement.querySelector('option:not([disabled])');
            if (firstUnlocked) {
                firstUnlocked.selected = true;
            }
        }
    },

    /**
     * Create unlock criteria display for a specific difficulty
     * @param {string} exerciseId - The exercise identifier
     * @param {string} difficulty - The difficulty level
     * @returns {HTMLElement|null} DOM element showing unlock criteria or null if always available
     */
    createUnlockDisplay(exerciseId, difficulty) {
        const criteria = this.getUnlockCriteria(exerciseId, difficulty);
        if (!criteria) return null;
        
        const isUnlocked = this.isUnlocked(exerciseId, difficulty);
        const progress = this.getUnlockProgress(exerciseId, difficulty);
        
        const container = document.createElement('div');
        container.className = `unlock-display ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        if (isUnlocked) {
            container.innerHTML = `
                <span class="unlock-status">✅ Unlocked</span>
            `;
        } else {
            const sessionProgress = `${progress.currentSessions}/${progress.requiredSessions} sessions`;
            const scoreProgress = `best: ${progress.currentBestScore}/${progress.requiredScore}`;
            const sessionCheck = progress.sessionsMet ? '✅' : '⏳';
            const scoreCheck = progress.scoreMet ? '✅' : '⏳';
            
            container.innerHTML = `
                <div class="unlock-criteria">
                    <div class="unlock-title">🔒 ${DIFFICULTY_LABELS[difficulty] || difficulty}</div>
                    <div class="unlock-requirements">
                        <div class="requirement ${progress.sessionsMet ? 'met' : 'unmet'}">
                            ${sessionCheck} ${sessionProgress}
                        </div>
                        <div class="requirement ${progress.scoreMet ? 'met' : 'unmet'}">
                            ${scoreCheck} ${scoreProgress}
                        </div>
                    </div>
                </div>
            `;
        }
        
        return container;
    },

    /**
     * Apply safety limits for therapeutic progression
     * Prevents users from jumping too quickly to advanced difficulties
     * @param {string} exerciseId - The exercise identifier
     * @param {string} requestedDifficulty - The difficulty user wants to try
     * @returns {boolean} True if the difficulty change is therapeutically safe
     */
    checkTherapeuticSafety(exerciseId, requestedDifficulty) {
        const exercise = getExercise(exerciseId);
        if (!exercise) return false;
        
        // Ignore unrelated values that might slip through
        if (!exercise.difficulties.includes(requestedDifficulty)) {
            return true;
        }
        
        const currentIndex = exercise.difficulties.indexOf(requestedDifficulty);
        if (currentIndex === -1) return false;
        
        // Always allow easier difficulties (first two levels)
        if (currentIndex <= 1) return true;
        
        // Check if previous difficulty has sufficient practice
        const previousDifficulty = exercise.difficulties[currentIndex - 1];
        const prevPerf = this.getPerformanceData(exerciseId, previousDifficulty);
        
        // Require at least 2 sessions on previous difficulty
        const MIN_SESSIONS_FOR_PROGRESSION = 2;
        
        return prevPerf.sessions >= MIN_SESSIONS_FOR_PROGRESSION;
    },

    /**
     * Get detailed safety feedback for UI display
     * @param {string} exerciseId - The exercise identifier
     * @param {string} requestedDifficulty - The difficulty user wants to try
     * @returns {string|null} Safety message or null if safe
     */
    getTherapeuticSafetyMessage(exerciseId, requestedDifficulty) {
        const exercise = getExercise(exerciseId);
        if (!exercise || !exercise.difficulties.includes(requestedDifficulty)) {
            return null;
        }
        
        const currentIndex = exercise.difficulties.indexOf(requestedDifficulty);
        if (currentIndex <= 1) return null; // Safe
        
        const previousDifficulty = exercise.difficulties[currentIndex - 1];
        const prevPerf = this.getPerformanceData(exerciseId, previousDifficulty);
        const MIN_SESSIONS_FOR_PROGRESSION = 2;
        
        if (prevPerf.sessions < MIN_SESSIONS_FOR_PROGRESSION) {
            const prevName = DIFFICULTY_LABELS[previousDifficulty] || previousDifficulty;
            return `⚠️ Try ${prevName} a bit more (${prevPerf.sessions}/${MIN_SESSIONS_FOR_PROGRESSION} sessions) before moving up.`;
        }
        
        return null;
    },

    /**
     * Ensure base difficulties are unlocked for new users
     * @param {string} exerciseId - The exercise identifier
     */
    seedBaseUnlocks(exerciseId) {
        const exercise = getExercise(exerciseId);
        if (!exercise || exercise.difficulties.length === 0) return;
        
        // Ensure the first difficulty is always unlocked
        const baseDifficulty = exercise.difficulties[0];
        const storageKeyValue = unlockKey(exerciseId, baseDifficulty);
        
        if (!storage.get(storageKeyValue)) {
            storage.set(storageKeyValue, true);
            console.log(`🌱 Seeded base unlock: ${storageKeyValue}`);
        }
    },

    /**
     * Initialize adaptive difficulty system for an exercise page
     * @param {string} exerciseId - The exercise identifier
     */
    initializeForExercise(exerciseId) {
        console.log(`🎯 Initializing adaptive difficulty for ${exerciseId}`);
        
        // Seed base unlocks for new users
        this.seedBaseUnlocks(exerciseId);
        
        // Re-check unlocks on page load (in case of external changes)
        this.checkAllUnlocks();
        
        // Find and update difficulty selectors (target specific data attribute)
        const difficultySelects = document.querySelectorAll('select[data-role="difficulty"]');
        
        if (difficultySelects.length === 0) {
            // Fallback: look for common difficulty select IDs
            const fallbackSelects = document.querySelectorAll('#difficulty, #difficultySelect, #difficulty-select');
            fallbackSelects.forEach(select => {
                select.setAttribute('data-role', 'difficulty');
                difficultySelects.push(select);
            });
        }
        
        difficultySelects.forEach(select => {
            this.updateDifficultyUI(exerciseId, select);
            
            // Add change handler to re-validate on selection
            select.addEventListener('change', (e) => {
                const selectedDifficulty = e.target.value;
                
                // Check therapeutic safety with detailed feedback
                const safetyMessage = this.getTherapeuticSafetyMessage(exerciseId, selectedDifficulty);
                if (safetyMessage) {
                    showToast(safetyMessage, 'warning', 3500);
                }
                
                // Update UI to reflect current state
                this.updateDifficultyUI(exerciseId, select, selectedDifficulty);
            });
        });
        
        console.log(`✅ Adaptive difficulty initialized for ${exerciseId} with ${difficultySelects.length} selectors`);
    }
};

/**
 * Export for global use
 */
export default adaptiveDifficulty;