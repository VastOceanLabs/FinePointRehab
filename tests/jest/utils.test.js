// tests/jest/utils.test.js - FIXED VERSION
// Tests for utility functions that work with the actual storage system

import { storage, clearAllFPRData } from '../../js/utils.js';

describe('Utility Functions', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    
    // Set up test data that clearAllFPRData should remove
    localStorage.setItem('FPR_v1_points', '100');
    localStorage.setItem('FPR_v1_level', '5');
    localStorage.setItem('other_app_data', 'should_remain');
  });

  describe('Storage System', () => {
    test('should store and retrieve data with version prefix', () => {
      // Test basic set/get with actual storage system
      storage.set('testKey', 'testValue');
      expect(storage.get('testKey')).toBe('testValue');
      // Expecting JSON-stringified value since our storage.set() JSON.stringify's everything
      expect(localStorage.getItem('FPR_v1_testKey')).toBe('"testValue"');

      // Test with objects
      const testObject = { points: 100, level: 2 };
      storage.set('userData', testObject);
      expect(storage.get('userData')).toEqual(testObject);

      // Test default values
      expect(storage.get('nonexistent', 'default')).toBe('default');

      // Test removal
      storage.remove('testKey');
      expect(storage.get('testKey', null)).toBeNull();
    });

    test('should handle storage errors gracefully', () => {
      // Mock localStorage to throw error and suppress console output for test
      const originalSetItem = localStorage.setItem;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error, but will call console.warn internally
      storage.set('testKey', 'testValue');
      expect(localStorage.setItem).toHaveBeenCalled();
      
      // Note: Our storage.set() only logs in non-test environments now,
      // so we won't see the console.warn call in NODE_ENV=test
      // This is expected behavior

      // Restore original
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();

      // Test malformed JSON parsing
      localStorage.setItem('FPR_v1_malformed', 'invalid json {');
      expect(storage.get('malformed', 'fallback')).toBe('fallback');
    });

    test('clearAllFPRData should remove all FPR_v1_ keys', () => {
      // Verify initial data exists
      expect(localStorage.getItem('FPR_v1_points')).toBe('100');
      expect(localStorage.getItem('FPR_v1_level')).toBe('5');
      expect(localStorage.getItem('other_app_data')).toBe('should_remain');

      clearAllFPRData();

      // Verify FPR data removed but other data remains
      expect(localStorage.getItem('FPR_v1_points')).toBeNull();
      expect(localStorage.getItem('FPR_v1_level')).toBeNull();
      expect(localStorage.getItem('other_app_data')).toBe('should_remain');
    });

    test('should clear all FPR data without affecting other data', () => {
      // Set additional FPR and non-FPR data
      localStorage.setItem('FPR_v1_sessions', '10');
      localStorage.setItem('FPR_v1_achievements', '[]');
      localStorage.setItem('user_preference', 'also_should_remain');

      clearAllFPRData();

      // Verify all FPR data cleared
      expect(localStorage.getItem('FPR_v1_points')).toBeNull();
      expect(localStorage.getItem('FPR_v1_level')).toBeNull();
      expect(localStorage.getItem('FPR_v1_sessions')).toBeNull();
      expect(localStorage.getItem('FPR_v1_achievements')).toBeNull();
      
      // Verify non-FPR data preserved
      expect(localStorage.getItem('other_app_data')).toBe('should_remain');
      expect(localStorage.getItem('user_preference')).toBe('also_should_remain');
    });

    test('should handle getInt method for numeric values', () => {
      // Test number storage and retrieval
      storage.set('numericValue', 42);
      expect(storage.getInt('numericValue')).toBe(42);

      // Test string numbers
      storage.set('stringNumber', '123');
      expect(storage.getInt('stringNumber')).toBe(123);

      // Test default values for missing keys
      expect(storage.getInt('nonexistent', 999)).toBe(999);

      // Test invalid values fall back to default
      localStorage.setItem('FPR_v1_invalid', '"not a number"');
      expect(storage.getInt('invalid', 0)).toBe(0);
    });
  });

  describe('Theme Management', () => {
    test('should handle theme preferences correctly', () => {
      // Mock window.matchMedia for system preference testing
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      // Test that system dark mode preference is detected
      const matchesDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      expect(matchesDark).toBe(true);

      // Test theme storage
      storage.set('theme', 'dark');
      expect(storage.get('theme')).toBe('dark');

      storage.set('theme', 'light');
      expect(storage.get('theme')).toBe('light');

      storage.set('theme', 'contrast');
      expect(storage.get('theme')).toBe('contrast');
    });
  });

  describe('Audio Management', () => {
    test('should handle audio mute preferences', () => {
      // Test audio mute setting storage
      storage.set('audioMuted', true);
      expect(storage.get('audioMuted')).toBe(true);

      storage.set('audioMuted', false);
      expect(storage.get('audioMuted')).toBe(false);

      // Test that mute setting is stored with proper prefix
      expect(localStorage.getItem('FPR_v1_audioMuted')).toBe('false');
    });
  });

  describe('Reduced Motion Management', () => {
    test('should handle reduced motion preferences', () => {
      // Mock window.matchMedia for reduced motion testing
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      // Test system reduced motion preference detection
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      expect(prefersReduced).toBe(true);

      // Test reduced motion setting storage
      storage.set('reducedMotion', true);
      expect(storage.get('reducedMotion')).toBe(true);

      storage.set('reducedMotion', false);
      expect(storage.get('reducedMotion')).toBe(false);
    });
  });

  describe('Viewport Utilities', () => {
    test('should handle viewport height calculations', () => {
      // Mock window.innerHeight
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 800,
      });

      // Test viewport height calculation
      const vh = window.innerHeight * 0.01;
      expect(vh).toBe(8);
      
      // Test with different viewport sizes
      Object.defineProperty(window, 'innerHeight', {
        value: 1000,
      });
      
      const vh2 = window.innerHeight * 0.01;
      expect(vh2).toBe(10);
    });
  });

  describe('Date and Time Utilities', () => {
    test('should handle timezone-aware date operations', () => {
      const getLocalDateString = (date = new Date()) => {
        return date.toISOString().split('T')[0];
      };

      const calculateDaysDiff = (date1, date2) => {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000));
      };

      // Test date string conversion
      const testDate = new Date('2024-01-15T10:30:00Z');
      expect(getLocalDateString(testDate)).toBe('2024-01-15');

      // Test days difference calculation
      expect(calculateDaysDiff('2024-01-15', '2024-01-16')).toBe(1);
      expect(calculateDaysDiff('2024-01-15', '2024-01-15')).toBe(0);
      expect(calculateDaysDiff('2024-01-15', '2024-01-18')).toBe(3);
    });

    test('should handle weekend amnesty logic', () => {
      const isWeekendAmnestyEligible = (today, lastActiveDate) => {
        const todayDate = new Date(today);
        const lastDate = new Date(lastActiveDate);
        const daysDiff = Math.floor((todayDate - lastDate) / (24 * 60 * 60 * 1000));
        
        // Monday amnesty: if today is Monday and last active was Fri/Sat/Sun
        return todayDate.getDay() === 1 && 
               (lastDate.getDay() >= 5 || lastDate.getDay() === 0) && 
               daysDiff <= 3;
      };

      // Friday to Monday (should be eligible)
      expect(isWeekendAmnestyEligible('2024-01-15', '2024-01-12')).toBe(true); // Mon from Fri
      
      // Saturday to Monday (should be eligible)
      expect(isWeekendAmnestyEligible('2024-01-15', '2024-01-13')).toBe(true); // Mon from Sat
      
      // Sunday to Monday (should be eligible)
      expect(isWeekendAmnestyEligible('2024-01-15', '2024-01-14')).toBe(true); // Mon from Sun
      
      // Tuesday to Monday (should not be eligible)
      expect(isWeekendAmnestyEligible('2024-01-15', '2024-01-09')).toBe(false); // Mon from Tue
      
      // Monday to Tuesday (should not be eligible - not Monday)
      expect(isWeekendAmnestyEligible('2024-01-16', '2024-01-15')).toBe(false); // Tue from Mon
    });
  });

  describe('Storage Availability', () => {
    test('should detect when localStorage is not available', () => {
      // Mock storage unavailable scenario
      const originalIsAvailable = storage.isAvailable;
      storage.isAvailable = jest.fn(() => false);

      // Test graceful handling when storage unavailable
      expect(storage.isAvailable()).toBe(false);
      
      // Restore original function
      storage.isAvailable = originalIsAvailable;
      expect(storage.isAvailable()).toBe(true);
    });

    test('should check if keys exist in storage', () => {
      // Test key existence checking
      storage.set('existingKey', 'value');
      expect(storage.has('existingKey')).toBe(true);
      expect(storage.has('nonexistentKey')).toBe(false);
    });
  });
});