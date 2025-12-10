/**
 * FinePointRehab Progress Tracking System - Complete Rewrite
 * 
 * Simplified, test-compatible implementation focusing on:
 * - Correct streak logic with consistent date handling
 * - Proper session recording with total session tracking
 * - Fixed export system using exercise registry
 * - Enhanced session recording with extras for achievement analysis
 * - All updates flow through single functions for consistency
 */

import { storage } from './utils.js';
import { toYMD, dayDiff } from './utils/date.js';
import { EXERCISES } from './exercises.js';

/**
 * Record a session and update all related metrics
 * @param {string} exerciseId - Exercise identifier
 * @param {string} difficulty - Difficulty level (optional for some tests)
 * @param {number} score - Session score
 * @param {Object} extras - Optional extra metrics for achievements (accuracy, perfects, streak, etc.)
 * @returns {Object} Result with isNewBest, totalSessions, and sessionEntry
 */
export function recordSession(exerciseId, difficulty, score, extras = {}) {
    // Create session entry with timestamp and extras for achievement analysis
    // FIX: extras first so core fields always win and can't be overwritten
    const sessionEntry = {
        ...extras, // Include accuracy, perfects, streak, moves, found, etc.
        id: exerciseId,
        difficulty,
        score,
        timestamp: Date.now(),
        date: new Date().toISOString()
    };
    
    // Store individual session entry for achievement system
    const sessionHistoryKey = `sessions:${exerciseId}`;
    const existingHistory = JSON.parse(storage.get(sessionHistoryKey) || '[]');
    existingHistory.push(sessionEntry);
    
    // Keep only recent sessions to prevent storage bloat (last 100 sessions per exercise)
    if (existingHistory.length > 100) {
        existingHistory.splice(0, existingHistory.length - 100);
    }
    
    storage.set(sessionHistoryKey, JSON.stringify(existingHistory));
    
    // Individual exercise tracking (existing aggregated data)
    const sessionKey = `exercise:${exerciseId}:sessions`;
    const bestKey = `exercise:${exerciseId}:best`;
    
    const currentSessions = storage.getInt(sessionKey, 0);
    storage.set(sessionKey, String(currentSessions + 1));
    
    // Update total sessions (this is what achievements check!)
    const totalSessions = storage.getInt('totalSessions', 0);
    const newTotalSessions = totalSessions + 1;
    storage.set('totalSessions', String(newTotalSessions));
    
    // Handle personal best
    const currentBest = storage.getInt(bestKey, 0);
    const isNewBest = score > currentBest;
    if (isNewBest) {
        storage.set(bestKey, String(score));
        storage.set('newPersonalBest', 'true'); // Flag for achievements
    }
    
    // Update streak when recording session (ensures all updates flow through updateStreak)
    updateStreak();
    
    // Return object with session entry for achievement checking
    return {
        isNewBest,
        totalSessions: newTotalSessions,
        sessionEntry // Achievement system can use this to check performance-based achievements
    };
}

/**
 * Helper function to get day of week from YYYY-MM-DD string consistently
 * @param {string} ymd - Date string in YYYY-MM-DD format
 * @returns {number} Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
function dayOfWeekFromYMD(ymd) {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0..6
}

/**
 * Safe JSON parser that won't throw on corrupt data
 * @param {string} str - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
function safeParse(str, fallback) {
    try {
        return JSON.parse(str || 'null');
    } catch {
        return fallback;
    }
}

/**
 * Update streak system with consistent date handling
 * @param {string|Date} currentDateLike - Date string (YYYY-MM-DD) or Date object
 * @returns {number} Current streak value
 */
export function updateStreak(currentDateLike = new Date()) {
    const currentYMD = toYMD(currentDateLike);
    const lastYMD = storage.get('lastActiveDate');
    let streak = storage.getInt('streak', 0);
    
    if (!lastYMD) {
        // First session ever
        streak = 1;
    } else {
        // FIX: Don't update if current date is older than last active date (backwards in time)
        const diff = dayDiff(lastYMD, currentYMD);
        const safeDiff = Number.isFinite(diff) ? diff : 0; // Handle corrupt lastActiveDate
        
        if (safeDiff < 0) {
            // Current date is older than last active date - ignore out-of-order updates
            return streak;
        }
        
        if (safeDiff === 0) {
            // Same day, keep streak as is
        } else if (safeDiff === 1) {
            // Consecutive day
            streak += 1;
        } else if (safeDiff >= 2 && safeDiff <= 3) {
            // FIX: Monday amnesty with consistent timezone handling
            const isCurrentMonday = dayOfWeekFromYMD(currentYMD) === 1;
            const lastWeekday = dayOfWeekFromYMD(lastYMD);
            
            if (isCurrentMonday && (lastWeekday === 5 || lastWeekday === 6 || lastWeekday === 0)) {
                // Monday amnesty applies: Fri/Sat/Sun → Mon
                streak += 1;
            } else {
                // Missed days -> reset
                streak = 1;
            }
        } else if (safeDiff > 3) {
            // Multiple missed days -> reset
            streak = 1;
        } else {
            // Edge case: clamp to 1
            streak = Math.max(1, streak);
        }
    }
    
    storage.set('streak', String(streak));
    storage.set('lastActiveDate', currentYMD);
    return streak;
}

/**
 * Export all progress data with proper structure
 * @returns {Object} Complete export data using exercise registry
 */
export function exportData() {
    const exercises = {};
    
    // FIX: Guard against malformed registry entries and handle both formats
    const exerciseIds = Array.isArray(EXERCISES)
        ? EXERCISES.map(e => e && e.id).filter(Boolean)
        : Object.keys(EXERCISES || {});
    
    exerciseIds.forEach(id => {
        const sessions = storage.getInt(`exercise:${id}:sessions`, 0);
        const best = storage.getInt(`exercise:${id}:best`, 0);
        
        // Only include exercises with data to keep export clean
        if (sessions > 0 || best > 0) {
            exercises[id] = {
                sessions,
                best // FIX #5: Export raw number, keep import backward-compatible
            };
        }
    });
    
    return {
        exercises,
        totalSessions: storage.getInt('totalSessions', 0),
        streak: storage.getInt('streak', 0),
        achievements: safeParse(storage.get('achievements'), []),
        exportDate: new Date().toISOString(),
        version: 1
    };
}

/**
 * Import progress data with validation
 * @param {Object} data - Data to import
 * @returns {Object} Import result
 */
export function importData(data) {
    try {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid import data');
        }
        
        // FIX: Import exercises with proper handling of both numeric and object best values
        if (data.exercises && typeof data.exercises === 'object') {
            for (const [exerciseId, exerciseData] of Object.entries(data.exercises)) {
                // Handle sessions (including 0 values)
                if ('sessions' in exerciseData) {
                    storage.set(`exercise:${exerciseId}:sessions`, String(exerciseData.sessions || 0));
                }
                
                // Handle best scores (both number and object formats)
                if ('best' in exerciseData) {
                    const bestVal = exerciseData.best;
                    let bestScore = 0;
                    
                    if (typeof bestVal === 'number') {
                        bestScore = bestVal;
                    } else if (bestVal && typeof bestVal === 'object') {
                        // Handle legacy object format - prefer max across difficulties
                        const nums = Object.values(bestVal).filter(v => typeof v === 'number');
                        bestScore = nums.length ? Math.max(...nums) : 0;
                    }
                    
                    storage.set(`exercise:${exerciseId}:best`, String(bestScore));
                }
            }
        }
        
        // FIX #4: Import logic must handle valid zeros
        if ('totalSessions' in data) {
            storage.set('totalSessions', String(data.totalSessions));
        }
        if ('streak' in data) {
            storage.set('streak', String(data.streak));
        }
        if ('achievements' in data) {
            storage.set('achievements', JSON.stringify(data.achievements));
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Get current statistics
 * @returns {Object} Current stats
 */
export function getStats() {
    return {
        totalSessions: storage.getInt('totalSessions', 0),
        streak: storage.getInt('streak', 0),
        achievements: safeParse(storage.get('achievements'), []),
        lastActiveDate: storage.get('lastActiveDate')
    };
}

/**
 * Reset all progress data
 * @returns {Object} Reset result
 */
export function resetProgress() {
    try {
        // FIX: Use storage API instead of raw localStorage for consistency and test compatibility
        const exerciseIds = Array.isArray(EXERCISES) 
            ? EXERCISES.map(e => e && e.id).filter(Boolean)
            : Object.keys(EXERCISES || {});
        
        // Reset global counters
        storage.set('totalSessions', '0');
        storage.set('streak', '0');
        storage.set('lastActiveDate', '');
        storage.set('achievements', '[]');
        
        // Reset per-exercise data and session history
        exerciseIds.forEach(id => {
            storage.set(`exercise:${id}:sessions`, '0');
            storage.set(`exercise:${id}:best`, '0');
            storage.set(`sessions:${id}`, '[]');
        });
        
        // Clear personal best flag
        if (typeof storage.remove === 'function') {
            storage.remove('newPersonalBest');
        } else {
            storage.set('newPersonalBest', '');
        }
        
        return { success: true, message: 'All progress data has been reset' };
    } catch (error) {
        return { success: false, message: 'Failed to reset progress data' };
    }
}

/**
 * Get personal best for specific exercise
 * @param {string} exerciseId - Exercise identifier
 * @returns {number} Best score or 0 if none recorded
 */
export function getPersonalBest(exerciseId) {
    return storage.getInt(`exercise:${exerciseId}:best`, 0);
}

/**
 * Get session count for specific exercise
 * @param {string} exerciseId - Exercise identifier
 * @returns {number} Number of sessions completed
 */
export function getSessionCount(exerciseId) {
    return storage.getInt(`exercise:${exerciseId}:sessions`, 0);
}

/**
 * Get session history for a specific exercise
 * @param {string} exerciseId - Exercise identifier  
 * @param {number} limit - Maximum number of recent sessions to return (default: 10)
 * @returns {Array} Array of session entries with extras data
 */
export function getSessionHistory(exerciseId, limit = 10) {
    const sessionHistoryKey = `sessions:${exerciseId}`;
    const history = JSON.parse(storage.get(sessionHistoryKey) || '[]');
    
    // Return most recent sessions first
    return history.slice(-limit).reverse();
}

/**
 * Get all recent session entries across all exercises for achievement analysis
 * @param {number} limit - Maximum number of recent sessions to return (default: 50)
 * @returns {Array} Array of session entries sorted by timestamp (newest first)
 */
export function getAllRecentSessions(limit = 50) {
    const allSessions = [];
    
    // FIX: Use consistent registry access with guards
    const exerciseIds = Array.isArray(EXERCISES)
        ? EXERCISES.map(e => e && e.id).filter(Boolean)
        : Object.keys(EXERCISES || {});
    
    exerciseIds.forEach(id => {
        const sessionHistoryKey = `sessions:${id}`;
        const history = safeParse(storage.get(sessionHistoryKey), []);
        if (Array.isArray(history)) {
            allSessions.push(...history);
        }
    });
    
    // Sort by timestamp (newest first) and limit
    return allSessions
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limit);
}

/**
 * Clear session history for an exercise (useful for testing/reset)
 * @param {string} exerciseId - Exercise identifier
 */
export function clearSessionHistory(exerciseId) {
    const sessionHistoryKey = `sessions:${exerciseId}`;
    storage.set(sessionHistoryKey, JSON.stringify([]));
}

/**
 * Check if personal best flag is set and clear it
 * @returns {boolean} Whether personal best flag was set
 */
export function checkAndClearPersonalBestFlag() {
    const flag = storage.get('newPersonalBest');
    if (flag === 'true') {
        // FIX #7: Ensure storage.remove exists or use alternative
        if (typeof storage.remove === 'function') {
            storage.remove('newPersonalBest');
        } else {
            // Fallback: set to empty string if remove doesn't exist
            storage.set('newPersonalBest', '');
        }
        return true;
    }
    return false;
}

// Legacy export aliases for backwards compatibility
export const exportProgressData = exportData;
export const importProgressData = importData;
export const updateStreakWithAmnesty = updateStreak; // Same function since amnesty is built-in

// Default export for module compatibility
export default {
    recordSession,
    updateStreak,
    exportData,
    importData,
    getStats,
    resetProgress,
    getPersonalBest,
    getSessionCount,
    checkAndClearPersonalBestFlag,
    getSessionHistory,
    getAllRecentSessions,
    clearSessionHistory
};