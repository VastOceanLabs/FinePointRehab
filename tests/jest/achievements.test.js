/**
 * Achievement System Tests
 * Fixed to match the actual 10 exercises from exercises.js
 * Updated to use ES module imports instead of require()
 */

import { checkAndUnlockAchievements } from '../../js/achievements.js';

describe('Achievement System', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('First Steps Achievement', () => {
    test('should unlock "First Steps" after first session', () => {
      // FIXED: Use the correct FPR_v1_ prefixed keys
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '1');
      
      const unlockedAchievements = checkAndUnlockAchievements();
      
      expect(unlockedAchievements).toContain('firstSteps');
    });
  });

  describe('Dedicated Achievement', () => {
    test('should unlock "Dedicated" after 50 total sessions', () => {
      // FIXED: Use the correct FPR_v1_ prefixed keys
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '25');
      localStorage.setItem('FPR_v1_exercise:comet:sessions', '15');
      localStorage.setItem('FPR_v1_exercise:rhythm:sessions', '10');
      
      const unlockedAchievements = checkAndUnlockAchievements();
      
      expect(unlockedAchievements).toContain('dedicated');
    });
  });

  describe('Multiple Achievement Unlocks', () => {
    test('should handle multiple simultaneous achievement unlocks', () => {
      // FIXED: Use the correct FPR_v1_ prefixed keys
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '50');
      
      const unlockedAchievements = checkAndUnlockAchievements();
      
      expect(unlockedAchievements).toContain('firstSteps');
      expect(unlockedAchievements).toContain('dedicated');
      expect(unlockedAchievements.length).toBe(2);
    });
  });

  describe('Personal Best Achievement', () => {
    test('should unlock "Personal Best" when flag is set', () => {
      // FIXED: Use the correct FPR_v1_ prefixed key
      localStorage.setItem('FPR_v1_newPersonalBest', 'true');
      
      const unlockedAchievements = checkAndUnlockAchievements();
      
      expect(unlockedAchievements).toContain('personalBest');
    });
  });

  describe('Explorer Achievement', () => {
    test('should unlock "Explorer" when all exercises tried', () => {
      // FIXED: Set up "tried" array with ALL 12 exercise IDs and use correct prefix
      const triedExercises = [
        'bubble', 'comet', 'crosshair', 'saccade', 'rhythm', 'precision', 
        'maze', 'sort', 'trace', 'sequence', 'mirror', 'scanner'
      ];
      
      localStorage.setItem('FPR_v1_tried', JSON.stringify(triedExercises));
      
      const unlockedAchievements = checkAndUnlockAchievements();
      
      expect(unlockedAchievements).toContain('explorer');
    });
  });

  describe('Achievement Persistence', () => {
    test('should not unlock already unlocked achievements', () => {
      // Test that achievements don't duplicate
      localStorage.setItem('exercise:bubble:sessions', '1');
      localStorage.setItem('achievements', JSON.stringify(['firstSteps']));
      
      const unlockedAchievements = checkAndUnlockAchievements();
      
      // Should return empty array since firstSteps already unlocked
      expect(unlockedAchievements).toEqual([]);
    });
  });
});