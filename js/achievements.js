/**
 * FinePointRehab Achievement System
 * 
 * Unified achievement tracking with shared IDs and condition-based unlocking
 */

import { storage } from './utils.js';
import { EXERCISES } from './exercises.js';

// ============================================================================
// SAFE STORAGE HELPERS
// ============================================================================

function getJSON(key, fallback) {
  const raw = storage.get(key);
  if (raw == null) return fallback;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; }
  catch { return fallback; }
}

function getBool(key, fallback=false) {
  const v = storage.get(key);
  if (typeof v === 'boolean') return v;
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function setBool(key, val) {
  // store as string to be explicit
  storage.set(key, val ? 'true' : 'false');
}

// ============================================================================
// ACHIEVEMENT STORAGE HELPERS
// ============================================================================

function getUnlockedSet() {
  const arr = getJSON('achievements', []);
  return new Set(Array.isArray(arr) ? arr : []);
}

function saveUnlocked(set) {
  storage.set('achievements', JSON.stringify([...set]));
}

// ============================================================================
// ACHIEVEMENT DEFINITIONS (CURRENT PROJECT COMPATIBLE)
// ============================================================================

export const ACHIEVEMENTS = {
  // Keep existing IDs that tests expect
  firstSteps: { 
    name: 'First Steps', 
    description: 'Complete your first session',
    condition: ({ stats }) => stats.totalSessions >= 1
  },
  consistent: { 
    name: 'Consistent', 
    description: 'Achieve a 7-day streak',
    condition: ({ stats }) => stats.streak >= 7
  },
  dedicated: { 
    name: 'Dedicated', 
    description: 'Complete 50 total sessions',
    condition: ({ stats }) => stats.totalSessions >= 50
  },
  personalBest: { 
    name: 'Personal Best', 
    description: 'Beat your previous score',
    condition: ({ stats }) => stats.newPersonalBest === true
  },
  explorer: { 
    name: 'Explorer', 
    description: 'Try all available exercises',
    condition: ({ stats }) => stats.triedCount >= stats.totalExercises && stats.totalExercises > 0
  },
  
  // Future unified achievements (can be added later)
  perfect_5: { 
    name: 'Precision', 
    description: 'Get 5 perfect moves in one session',
    condition: ({ entry }) => (entry?.perfects ?? 0) >= 5
  },
  streak_10: { 
    name: 'On Fire', 
    description: 'Get 10 consecutive successes',
    condition: ({ entry }) => (entry?.streak ?? 0) >= 10
  },
  hard_clear: { 
    name: 'Challenge Accepted', 
    description: 'Score 1000+ on hard difficulty',
    condition: ({ entry }) => entry?.difficulty === 'hard' && (entry?.score ?? 0) >= 1000
  }
};

// ============================================================================
// MAIN ACHIEVEMENT CHECKING FUNCTION - CURRENT PROJECT COMPATIBLE
// ============================================================================

export function checkAndUnlockAchievements(entry, stats) {
  const newly = [];
  
  // Handle legacy call with no parameters (current project expects this)
  if (entry === undefined && stats === undefined) {
    stats = calculateStats();
    entry = {}; // Empty entry for legacy compatibility
  } else if (stats === undefined) {
    stats = calculateStats();
  }
  
  // Create context object for conditions
  const ctx = { 
    entry: entry || {}, 
    stats 
  };
  
  // Cache unlocked set to avoid repeated reads
  const unlockedSet = getUnlockedSet();
  
  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (unlockedSet.has(id)) continue; // already unlocked
    
    try {
      if (achievement.condition(ctx)) {
        unlockedSet.add(id);
        newly.push(id);
        // Store unlock timestamp
        storage.set(`achievement_${id}_date`, new Date().toISOString());
      }
    } catch (error) {
      console.warn(`Error checking achievement ${id}:`, error);
    }
  }
  
  // Save and notify if any new achievements
  if (newly.length > 0) {
    saveUnlocked(unlockedSet);
    showAchievementNotifications(newly);
  }

  return newly;
}

// ============================================================================
// STATS CALCULATION (for legacy compatibility)
// ============================================================================

function calculateStats() {
  // Use totalSessions from storage directly (as progress.js does)
  const totalSessions = storage.getInt ? storage.getInt('totalSessions', 0) : 
                       parseInt(storage.get('totalSessions') || '0', 10);
  
  const streak = storage.getInt ? storage.getInt('streak', 0) : 
                 parseInt(storage.get('streak') || '0', 10);
  
  const triedList = getJSON('tried', []);
  const triedCount = Array.isArray(triedList) ? new Set(triedList).size : 0;
  
  // Calculate total exercises
  let totalExercises = 0;
  if (EXERCISES) {
    const exerciseList = Array.isArray(EXERCISES) ? EXERCISES : Object.values(EXERCISES);
    totalExercises = exerciseList.length;
  }
  
  const newPersonalBest = getBool('newPersonalBest', false);
  
  return {
    totalSessions,
    streak,
    triedCount,
    totalExercises,
    newPersonalBest
  };
}

// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================

function showAchievementNotifications(unlockedIds) {
  // Clear personal best flag after showing
  if (unlockedIds.includes('personalBest')) {
    setBool('newPersonalBest', false);
  }
  
  // Show toast notifications if available
  if (typeof toast !== 'undefined' && toast?.show) {
    if (unlockedIds.length === 1) {
      const achievement = ACHIEVEMENTS[unlockedIds[0]];
      toast.show(`🎉 Achievement Unlocked: ${achievement.name}!`, {
        type: 'achievement',
        duration: 4000
      });
    } else {
      toast.show(`🎉 ${unlockedIds.length} achievements unlocked!`, {
        type: 'achievement',
        duration: 4000
      });
    }
  }
}

// ============================================================================
// LEGACY COMPATIBILITY FUNCTIONS - CURRENT PROJECT COMPATIBLE
// ============================================================================

export function checkAchievements() {
  // Legacy function - just calls main function with no parameters
  return checkAndUnlockAchievements();
}

export function getAchievements() { 
  return [...getUnlockedSet()]; 
}

export function getUnlockedAchievements() { 
  return getAchievements(); 
}

export function isAchievementUnlocked(id) { 
  return getUnlockedSet().has(id); 
}

export function getAchievementProgress() {
  const stats = calculateStats();
  const progress = {};
  
  // Current project expects these specific achievement IDs
  const expectedAchievements = ['firstSteps', 'consistent', 'dedicated', 'personalBest', 'explorer'];
  
  for (const id of expectedAchievements) {
    const achievement = ACHIEVEMENTS[id];
    if (achievement) {
      let progressValue = 0;
      let target = 1;
      
      try {
        if (id === 'firstSteps') {
          progressValue = Math.min(stats.totalSessions, 1);
          target = 1;
        } else if (id === 'consistent') {
          progressValue = stats.streak;
          target = 7;
        } else if (id === 'dedicated') {
          progressValue = stats.totalSessions;
          target = 50;
        } else if (id === 'personalBest') {
          progressValue = stats.newPersonalBest ? 1 : 0;
          target = 1;
        } else if (id === 'explorer') {
          progressValue = stats.triedCount;
          target = Math.max(stats.totalExercises, 1); // Avoid division by zero
        }
      } catch (error) {
        console.warn(`Error calculating progress for ${id}:`, error);
      }
      
      progress[id] = {
        unlocked: isAchievementUnlocked(id),
        progress: progressValue,
        target: target,
        description: achievement.description
      };
    }
  }
  
  return progress;
}

export function markExerciseTried(exerciseId) {
  const triedRaw = getJSON('tried', []);
  const tried = Array.from(new Set(triedRaw)); // Dedupe existing data
  
  if (!tried.includes(exerciseId)) {
    tried.push(exerciseId);
    storage.set('tried', JSON.stringify(tried)); // Store deduped array
  }
}

// ============================================================================
// EXPORTS FOR COMPATIBILITY
// ============================================================================

export const achievements = {
  checkAchievements: checkAndUnlockAchievements,
  checkAndUnlockAchievements,
  getUnlockedAchievements,
  isAchievementUnlocked,
  getAchievementProgress,
  markExerciseTried,
  ACHIEVEMENTS
};