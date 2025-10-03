// Tests for progress tracking system
// Jest globals are available automatically: describe, test, expect, beforeEach, jest

// Note: These tests use mock implementations to test logic in isolation
// For integration testing, use the actual imported functions with jest.mock()

describe('Progress Tracking System', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Helper functions for consistent test behavior
  const toUTC = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };

  const daysDiffUTC = (fromYMD, toYMD) =>
    Math.floor((toUTC(toYMD) - toUTC(fromYMD)) / 86400000);

  const createUpdateStreak = () => (mockToday) => {
    const today = mockToday || new Date().toISOString().split('T')[0];
    const lastActiveDate = localStorage.getItem('FPR_v1_lastActiveDate');
    const currentStreak = parseInt(localStorage.getItem('FPR_v1_streak') || '0', 10);

    if (!lastActiveDate) {
      localStorage.setItem('FPR_v1_streak', '1');
      localStorage.setItem('FPR_v1_lastActiveDate', today);
      return 1;
    }

    const daysDiff = daysDiffUTC(lastActiveDate, today);

    if (daysDiff === 1) {
      const newStreak = currentStreak + 1;
      localStorage.setItem('FPR_v1_streak', newStreak.toString());
      localStorage.setItem('FPR_v1_lastActiveDate', today);
      return newStreak;
    } else if (daysDiff === 0) {
      return currentStreak;
    } else {
      localStorage.setItem('FPR_v1_streak', '1');
      localStorage.setItem('FPR_v1_lastActiveDate', today);
      return 1;
    }
  };

  const isWeekendAmnestyEligible = (lastDateYMD, todayYMD, daysDiff) => {
    const ld = new Date(lastDateYMD);
    const td = new Date(todayYMD);
    return td.getDay() === 1 && (ld.getDay() === 0 || ld.getDay() >= 5) && daysDiff <= 3;
  };

  describe('Session Recording', () => {
    test('should record a new session correctly', () => {
      const recordSession = (exerciseId, difficulty, score) => {
        const key = `FPR_v1_exercise:${exerciseId}:sessions`;
        const currentSessions = parseInt(localStorage.getItem(key) || '0', 10);
        localStorage.setItem(key, (currentSessions + 1).toString());
        
        const bestKey = `FPR_v1_exercise:${exerciseId}:best`;
        const currentBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
        if (score > currentBest) {
          localStorage.setItem(bestKey, score.toString());
        }
      };

      recordSession('bubble', 'medium', 150);

      expect(localStorage.getItem('FPR_v1_exercise:bubble:sessions')).toBe('1');
      expect(localStorage.getItem('FPR_v1_exercise:bubble:best')).toBe('150');
    });

    test('should update personal best when score is higher', () => {
      const recordSession = (exerciseId, difficulty, score) => {
        const bestKey = `FPR_v1_exercise:${exerciseId}:best`;
        const currentBest = parseInt(localStorage.getItem(bestKey) || '0', 10);
        if (score > currentBest) {
          localStorage.setItem(bestKey, score.toString());
          return true; // indicates new personal best
        }
        return false;
      };

      // Set initial best
      localStorage.setItem('FPR_v1_exercise:bubble:best', '100');

      // Record higher score
      const isNewBest = recordSession('bubble', 'medium', 150);
      expect(isNewBest).toBe(true);
      expect(localStorage.getItem('FPR_v1_exercise:bubble:best')).toBe('150');

      // Record lower score
      const isNotNewBest = recordSession('bubble', 'medium', 120);
      expect(isNotNewBest).toBe(false);
      expect(localStorage.getItem('FPR_v1_exercise:bubble:best')).toBe('150');
    });
  });

  describe('Streak System', () => {
    test('should initialize streak correctly for first session', () => {
      const updateStreak = createUpdateStreak();

      const streak = updateStreak('2024-01-01');
      expect(streak).toBe(1);
      expect(localStorage.getItem('FPR_v1_streak')).toBe('1');
      expect(localStorage.getItem('FPR_v1_lastActiveDate')).toBe('2024-01-01');
    });

    test('should increment streak for consecutive days', () => {
      const updateStreak = createUpdateStreak();

      // Day 1
      const streak1 = updateStreak('2024-01-15');
      expect(streak1).toBe(1);

      // Day 2 (consecutive)
      const streak2 = updateStreak('2024-01-16');
      expect(streak2).toBe(2);

      // Day 3 (consecutive)
      const streak3 = updateStreak('2024-01-17');
      expect(streak3).toBe(3);
      
      expect(localStorage.getItem('FPR_v1_streak')).toBe('3');
    });

    test('should reset streak after missing days', () => {
      const updateStreak = (mockToday) => {
        const today = mockToday;
        const lastActiveDate = localStorage.getItem('FPR_v1_lastActiveDate');
        const currentStreak = parseInt(localStorage.getItem('FPR_v1_streak') || '0', 10);
        
        if (lastActiveDate) {
          const daysDiff = daysDiffUTC(lastActiveDate, today);
          
          if (daysDiff > 1) {
            localStorage.setItem('FPR_v1_streak', '1');
            localStorage.setItem('FPR_v1_lastActiveDate', today);
            return 1; // Reset streak
          }
        }
        return currentStreak;
      };

      // Set initial streak
      localStorage.setItem('FPR_v1_streak', '5');
      localStorage.setItem('FPR_v1_lastActiveDate', '2024-01-15');

      // Miss several days
      const resetStreak = updateStreak('2024-01-20');
      expect(resetStreak).toBe(1);
      expect(localStorage.getItem('FPR_v1_streak')).toBe('1');
    });

    test('should handle weekend amnesty correctly', () => {
      const updateStreakWithAmnesty = (mockToday) => {
        const today = mockToday;
        const lastActiveDate = localStorage.getItem('FPR_v1_lastActiveDate');
        const currentStreak = parseInt(localStorage.getItem('FPR_v1_streak') || '0', 10);
        
        if (!lastActiveDate) {
          return 0; // No streak to continue
        }
        
        const daysDiff = daysDiffUTC(lastActiveDate, today);
        
        if (daysDiff === 1 || isWeekendAmnestyEligible(lastActiveDate, today, daysDiff)) {
          const newStreak = currentStreak + 1;
          localStorage.setItem('FPR_v1_streak', newStreak.toString());
          localStorage.setItem('FPR_v1_lastActiveDate', today);
          return newStreak;
        }
        
        return currentStreak;
      };

      // Friday session
      localStorage.setItem('FPR_v1_streak', '3');
      localStorage.setItem('FPR_v1_lastActiveDate', '2024-01-12'); // Friday

      // Monday session (should maintain streak with amnesty)
      const mondayStreak = updateStreakWithAmnesty('2024-01-15'); // Monday
      expect(mondayStreak).toBe(4);
    });
  });

  describe('Points System', () => {
    test('should award points based on difficulty', () => {
      const calculatePoints = (difficulty, isPersonalBest = false, streak = 1) => {
        const basePoints = 10;
        const multipliers = {
          'veryLarge': 0.8,
          'large': 1.0,
          'medium': 1.2,
          'small': 1.5
        };
        
        let points = basePoints * (multipliers[difficulty] || 1.0);
        
        if (isPersonalBest) {
          points += 5; // Personal best bonus
        }
        
        points += Math.min(streak, 7) * 2; // Streak bonus (capped at 7 days)
        
        return Math.round(points);
      };

      expect(calculatePoints('medium')).toBe(14); // 10 * 1.2 + 2 (1-day streak)
      expect(calculatePoints('small', true, 3)).toBe(26); // 10 * 1.5 + 5 (PB) + 6 (3-day streak)
      expect(calculatePoints('large', false, 10)).toBe(24); // 10 * 1.0 + 14 (7-day max streak)
    });
  });

  describe('Export/Import System', () => {
    beforeEach(() => {
      // Seed test data for export tests
      localStorage.setItem('FPR_v1_points', '250');
      localStorage.setItem('FPR_v1_level', '3');
      localStorage.setItem('FPR_v1_streak', '5');
      localStorage.setItem('FPR_v1_lastActiveDate', '2024-01-15');
      localStorage.setItem('FPR_v1_exercise:bubble:best', '150');
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '8');
      localStorage.setItem('FPR_v1_exercise:typing:best', '75');
      localStorage.setItem('FPR_v1_exercise:typing:sessions', '12');
      localStorage.setItem('FPR_v1_achievements', JSON.stringify(['firstSteps', 'consistent']));
    });

    test('should export progress data correctly', () => {
      const exportData = () => {
        const data = {
          version: 1,
          exportedAt: new Date().toISOString(),
          stats: {
            points: parseInt(localStorage.getItem('FPR_v1_points') || '0', 10),
            level: parseInt(localStorage.getItem('FPR_v1_level') || '1', 10),
            streak: parseInt(localStorage.getItem('FPR_v1_streak') || '0', 10),
            lastActiveDate: localStorage.getItem('FPR_v1_lastActiveDate')
          },
          exercises: {},
          achievements: JSON.parse(localStorage.getItem('FPR_v1_achievements') || '[]')
        };

        // Collect exercise data - correct iteration for jsdom
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('FPR_v1_exercise:')) {
            const rest = key.slice('FPR_v1_exercise:'.length);
            const idx = rest.lastIndexOf(':');
            const exerciseId = rest.slice(0, idx);
            const metric = rest.slice(idx + 1);
            data.exercises[exerciseId] ||= {};
            data.exercises[exerciseId][metric] = parseInt(localStorage.getItem(key) || '0', 10);
          }
        }

        return data;
      };

      const exported = exportData();
      
      expect(exported.version).toBe(1);
      expect(exported.stats.points).toBe(250);
      expect(exported.stats.level).toBe(3);
      expect(exported.stats.streak).toBe(5);
      expect(exported.stats.lastActiveDate).toBe('2024-01-15');
      expect(exported.exercises.bubble.best).toBe(150);
      expect(exported.exercises.bubble.sessions).toBe(8);
      expect(exported.exercises.typing.best).toBe(75);
      expect(exported.exercises.typing.sessions).toBe(12);
      expect(exported.achievements).toEqual(['firstSteps', 'consistent']);
      expect(new Date(exported.exportedAt).toString()).not.toBe('Invalid Date');
    });

    test('should import and replace progress data', () => {
      const importData = (data) => {
        if (data.version !== 1) {
          throw new Error('Incompatible version');
        }

        // Clear existing FPR data - correct iteration for jsdom
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && key.startsWith('FPR_v1_')) {
            localStorage.removeItem(key);
          }
        }

        // Import new data
        localStorage.setItem('FPR_v1_points', data.stats.points.toString());
        localStorage.setItem('FPR_v1_level', data.stats.level.toString());
        localStorage.setItem('FPR_v1_streak', data.stats.streak.toString());
        
        if (data.stats.lastActiveDate) {
          localStorage.setItem('FPR_v1_lastActiveDate', data.stats.lastActiveDate);
        }

        Object.entries(data.exercises).forEach(([exerciseId, metrics]) => {
          Object.entries(metrics).forEach(([metric, value]) => {
            localStorage.setItem(`FPR_v1_exercise:${exerciseId}:${metric}`, value.toString());
          });
        });

        localStorage.setItem('FPR_v1_achievements', JSON.stringify(data.achievements));
      };

      const testData = {
        version: 1,
        stats: { points: 500, level: 5, streak: 10, lastActiveDate: '2024-01-20' },
        exercises: { 
          bubble: { best: 200, sessions: 15 },
          typing: { best: 90, sessions: 20 }
        },
        achievements: ['firstSteps', 'dedicated', 'perfectionist']
      };

      importData(testData);

      expect(localStorage.getItem('FPR_v1_points')).toBe('500');
      expect(localStorage.getItem('FPR_v1_level')).toBe('5');
      expect(localStorage.getItem('FPR_v1_streak')).toBe('10');
      expect(localStorage.getItem('FPR_v1_lastActiveDate')).toBe('2024-01-20');
      expect(localStorage.getItem('FPR_v1_exercise:bubble:best')).toBe('200');
      expect(localStorage.getItem('FPR_v1_exercise:bubble:sessions')).toBe('15');
      expect(localStorage.getItem('FPR_v1_exercise:typing:best')).toBe('90');
      expect(localStorage.getItem('FPR_v1_exercise:typing:sessions')).toBe('20');
      expect(JSON.parse(localStorage.getItem('FPR_v1_achievements'))).toEqual(['firstSteps', 'dedicated', 'perfectionist']);
    });

    test('should handle invalid import data', () => {
      const importData = (data) => {
        if (data.version !== 1) {
          throw new Error('Incompatible version');
        }
        // ... rest of import logic
      };

      expect(() => {
        importData({ version: 2 });
      }).toThrow('Incompatible version');
    });
  });
});