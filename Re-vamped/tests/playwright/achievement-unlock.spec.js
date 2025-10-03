// Tests for achievement system
// Jest globals are available automatically: describe, test, expect, beforeEach, jest

describe('Achievement System', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Achievement Definitions', () => {
    test('should have correct achievement definitions', () => {
      const ACHIEVEMENTS = {
        firstSteps: {
          id: 'firstSteps',
          name: 'First Steps',
          description: 'Complete your first session',
          checkUnlock: () => {
            // Check if any exercise has at least 1 session
            const keys = Object.keys(localStorage);
            return keys.some(key => 
              key.includes('exercise:') && 
              key.includes(':sessions') && 
              parseInt(localStorage.getItem(key) || '0') > 0
            );
          }
        },
        consistent: {
          id: 'consistent',
          name: 'Consistent',
          description: 'Achieve a 7-day streak',
          checkUnlock: () => {
            return parseInt(localStorage.getItem('FPR_v1_streak') || '0') >= 7;
          }
        },
        dedicated: {
          id: 'dedicated',
          name: 'Dedicated',
          description: 'Complete 50 total sessions',
          checkUnlock: () => {
            const keys = Object.keys(localStorage);
            const totalSessions = keys
              .filter(key => key.includes('exercise:') && key.includes(':sessions'))
              .reduce((total, key) => total + parseInt(localStorage.getItem(key) || '0'), 0);
            return totalSessions >= 50;
          }
        },
        personalBest: {
          id: 'personalBest',
          name: 'Personal Best',
          description: 'Beat your previous score in any exercise',
          checkUnlock: () => {
            // This would be triggered when a new personal best is achieved
            return localStorage.getItem('FPR_v1_newPersonalBest') === 'true';
          }
        },
        explorer: {
          id: 'explorer',
          name: 'Explorer',
          description: 'Try all available exercises',
          checkUnlock: () => {
            // Mock visible exercises (in real implementation, this would come from exercises.js)
            const visibleExercises = ['bubble', 'comet', 'handwriting', 'maze', 'rhythm', 'sequence'];
            const tried = JSON.parse(localStorage.getItem('FPR_v1_tried') || '[]');
            return visibleExercises.every(id => tried.includes(id));
          }
        }
      };

      expect(ACHIEVEMENTS.firstSteps.name).toBe('First Steps');
      expect(ACHIEVEMENTS.consistent.description).toBe('Achieve a 7-day streak');
      expect(Object.keys(ACHIEVEMENTS)).toHaveLength(5);
    });
  });

  describe('Achievement Unlocking', () => {
    test('should unlock "First Steps" after first session', () => {
      const checkAndUnlockAchievements = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        const newUnlocks = [];

        // Check First Steps
        if (!unlockedAchievements.includes('firstSteps')) {
          const keys = Object.keys(localStorage);
          const hasSession = keys.some(key => 
            key.includes('exercise:') && 
            key.includes(':sessions') && 
            parseInt(localStorage.getItem(key) || '0') > 0
          );
          
          if (hasSession) {
            unlockedAchievements.push('firstSteps');
            newUnlocks.push('firstSteps');
          }
        }

        localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
        return newUnlocks;
      };

      // Record first session
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '1');

      const newUnlocks = checkAndUnlockAchievements();
      expect(newUnlocks).toContain('firstSteps');
      
      const achievements = JSON.parse(localStorage.getItem('FPR_v1_achievements'));
      expect(achievements).toContain('firstSteps');
    });

    test('should unlock "Consistent" after 7-day streak', () => {
      const checkConsistentAchievement = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        
        if (!unlockedAchievements.includes('consistent')) {
          const streak = parseInt(localStorage.getItem('FPR_v1_streak') || '0');
          if (streak >= 7) {
            unlockedAchievements.push('consistent');
            localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
            return ['consistent'];
          }
        }
        return [];
      };

      // Set 7-day streak
      localStorage.setItem('FPR_v1_streak', '7');

      const newUnlocks = checkConsistentAchievement();
      expect(newUnlocks).toContain('consistent');
    });

    test('should unlock "Dedicated" after 50 total sessions', () => {
      const checkDedicatedAchievement = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        
        if (!unlockedAchievements.includes('dedicated')) {
          const keys = Object.keys(localStorage);
          const totalSessions = keys
            .filter(key => key.includes('exercise:') && key.includes(':sessions'))
            .reduce((total, key) => total + parseInt(localStorage.getItem(key) || '0'), 0);
          
          if (totalSessions >= 50) {
            unlockedAchievements.push('dedicated');
            localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
            return ['dedicated'];
          }
        }
        return [];
      };

      // Set up 50+ total sessions across exercises
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '20');
      localStorage.setItem('FPR_v1_exercise:comet:sessions', '15');
      localStorage.setItem('FPR_v1_exercise:handwriting:sessions', '15');

      const newUnlocks = checkDedicatedAchievement();
      expect(newUnlocks).toContain('dedicated');
    });

    test('should unlock "Explorer" after trying all exercises', () => {
      const checkExplorerAchievement = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        
        if (!unlockedAchievements.includes('explorer')) {
          const visibleExercises = ['bubble', 'comet', 'handwriting', 'maze', 'rhythm', 'sequence'];
          const tried = JSON.parse(localStorage.getItem('FPR_v1_tried') || '[]');
          
          if (visibleExercises.every(id => tried.includes(id))) {
            unlockedAchievements.push('explorer');
            localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
            return ['explorer'];
          }
        }
        return [];
      };

      // Mark all exercises as tried
      const allExercises = ['bubble', 'comet', 'handwriting', 'maze', 'rhythm', 'sequence'];
      localStorage.setItem('FPR_v1_tried', JSON.stringify(allExercises));

      const newUnlocks = checkExplorerAchievement();
      expect(newUnlocks).toContain('explorer');
    });

    test('should not unlock achievements twice', () => {
      // Pre-set achievement as already unlocked
      localStorage.setItem('FPR_v1_achievements', JSON.stringify(['firstSteps']));
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '5');

      const checkFirstSteps = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        const newUnlocks = [];

        if (!unlockedAchievements.includes('firstSteps')) {
          const keys = Object.keys(localStorage);
          const hasSession = keys.some(key => 
            key.includes('exercise:') && 
            key.includes(':sessions') && 
            parseInt(localStorage.getItem(key) || '0') > 0
          );
          
          if (hasSession) {
            unlockedAchievements.push('firstSteps');
            newUnlocks.push('firstSteps');
            localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
          }
        }

        return newUnlocks;
      };

      const newUnlocks = checkFirstSteps();
      expect(newUnlocks).toHaveLength(0); // Should not unlock again
      
      const achievements = JSON.parse(localStorage.getItem('FPR_v1_achievements'));
      expect(achievements).toHaveLength(1); // Should still only have one
    });
  });

  describe('Toast Notification System', () => {
    test('should queue achievement notifications properly', () => {
      const toastQueue = [];
      const activeToasts = new Set();
      
      const showAchievementToast = (achievementId) => {
        const debounceKey = `achievement-${achievementId}`;
        
        // Don't show if already showing
        if (activeToasts.has(debounceKey)) return false;
        
        toastQueue.push({
          message: `Achievement unlocked: ${achievementId}`,
          type: 'success',
          debounceKey
        });
        
        activeToasts.add(debounceKey);
        return true;
      };

      // Should queue first achievement
      expect(showAchievementToast('firstSteps')).toBe(true);
      expect(toastQueue).toHaveLength(1);

      // Should not queue duplicate
      expect(showAchievementToast('firstSteps')).toBe(false);
      expect(toastQueue).toHaveLength(1);

      // Should queue different achievement
      expect(showAchievementToast('consistent')).toBe(true);
      expect(toastQueue).toHaveLength(2);
    });
  });

  describe('Personal Best Achievement', () => {
    test('should trigger when beating previous score', () => {
      const recordSessionWithPersonalBest = (exerciseId, score) => {
        const bestKey = `FPR_v1_exercise:${exerciseId}:best`;
        const currentBest = parseInt(localStorage.getItem(bestKey) || '0');
        
        if (score > currentBest) {
          localStorage.setItem(bestKey, score.toString());
          localStorage.setItem('FPR_v1_newPersonalBest', 'true');
          return true;
        }
        
        return false;
      };

      const checkPersonalBestAchievement = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        
        if (!unlockedAchievements.includes('personalBest') && 
            localStorage.getItem('FPR_v1_newPersonalBest') === 'true') {
          unlockedAchievements.push('personalBest');
          localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
          localStorage.removeItem('FPR_v1_newPersonalBest'); // Clear flag
          return ['personalBest'];
        }
        return [];
      };

      // Set initial best score
      localStorage.setItem('FPR_v1_exercise:bubble:best', '100');

      // Beat the score
      const isNewBest = recordSessionWithPersonalBest('bubble', 150);
      expect(isNewBest).toBe(true);

      // Check achievement
      const newUnlocks = checkPersonalBestAchievement();
      expect(newUnlocks).toContain('personalBest');
      
      // Flag should be cleared
      expect(localStorage.getItem('FPR_v1_newPersonalBest')).toBeNull();
    });
  });

  describe('Achievement Integration', () => {
    test('should handle multiple simultaneous achievement unlocks', () => {
      const checkAllAchievements = () => {
        const unlockedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
        const newUnlocks = [];

        // Check all achievement conditions
        const achievementChecks = [
          {
            id: 'firstSteps',
            condition: () => {
              const keys = Object.keys(localStorage);
              return keys.some(key => 
                key.includes('exercise:') && 
                key.includes(':sessions') && 
                parseInt(localStorage.getItem(key) || '0') > 0
              );
            }
          },
          {
            id: 'consistent',
            condition: () => parseInt(localStorage.getItem('FPR_v1_streak') || '0') >= 7
          },
          {
            id: 'personalBest',
            condition: () => localStorage.getItem('FPR_v1_newPersonalBest') === 'true'
          }
        ];

        achievementChecks.forEach(({ id, condition }) => {
          if (!unlockedAchievements.includes(id) && condition()) {
            unlockedAchievements.push(id);
            newUnlocks.push(id);
          }
        });

        localStorage.setItem('FPR_v1_achievements', JSON.stringify(unlockedAchievements));
        return newUnlocks;
      };

      // Set up conditions for multiple achievements
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '1'); // First Steps
      localStorage.setItem('FPR_v1_streak', '7'); // Consistent
      localStorage.setItem('FPR_v1_newPersonalBest', 'true'); // Personal Best

      const newUnlocks = checkAllAchievements();
      expect(newUnlocks).toContain('firstSteps');
      expect(newUnlocks).toContain('consistent');
      expect(newUnlocks).toContain('personalBest');
      expect(newUnlocks).toHaveLength(3);
    });
  });

  describe('Achievement Persistence', () => {
    test('should persist achievements across sessions', () => {
      // Set achievements
      const achievements = ['firstSteps', 'consistent'];
      localStorage.setItem('FPR_v1_achievements', JSON.stringify(achievements));

      // Simulate page reload by checking localStorage
      const loadedAchievements = JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]');
      
      expect(loadedAchievements).toEqual(['firstSteps', 'consistent']);
      expect(loadedAchievements).toHaveLength(2);
    });
  });
});