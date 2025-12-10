// Jest setup for FinePointRehab testing
// Mock localStorage for browser environment simulation
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index) => Object.keys(store)[index] || null)
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock matchMedia for prefers-color-scheme and prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock HTMLAudioElement for audio testing
global.HTMLAudioElement = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  canPlayType: jest.fn().mockReturnValue('probably'),
  currentTime: 0,
  duration: 10,
  muted: false,
  volume: 1,
  readyState: 4,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  appendChild: jest.fn(),
  style: {}
}));

// Mock document.createElement for audio elements
const originalCreateElement = document.createElement;
document.createElement = jest.fn().mockImplementation((tagName) => {
  if (tagName === 'audio') {
    return new HTMLAudioElement();
  }
  return originalCreateElement.call(document, tagName);
});

// Mock document.body.appendChild
document.body.appendChild = jest.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = jest.fn();

// Mock performance.now for consistent timing
global.performance = {
  now: jest.fn(() => Date.now())
};

// Reset all mocks before each test
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  
  // CRITICAL FIX: Set consistent fake timers for all tests
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2024-01-15T12:00:00Z'));
});

// CRITICAL FIX: Clean up timers after each test
afterEach(() => {
  jest.useRealTimers();
});

// Global test utilities
global.testUtils = {
  // Helper to simulate user gesture for audio
  simulateUserGesture: () => {
    const event = new Event('click');
    document.dispatchEvent(event);
  },
  
  // Helper to set localStorage data for testing
  seedStorage: (data) => {
    Object.entries(data).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  },
  
  // Helper to advance timers and process async operations
  flushPromises: () => new Promise(resolve => setImmediate(resolve)),
  
  // Helper to mock Date for streak testing
  mockDate: (dateString) => {
    const RealDate = Date;
    const mockDate = new RealDate(dateString);
    global.Date = jest.fn(() => mockDate);
    global.Date.now = jest.fn(() => mockDate.getTime());
    return mockDate;
  },

  // CRITICAL FIX: Helper to set up exercise session data that achievements expect
  setupExerciseData: (exerciseId, sessions = 1, best = 100) => {
    localStorage.setItem(`FPR_v1_exercise:${exerciseId}:sessions`, sessions.toString());
    localStorage.setItem(`FPR_v1_exercise:${exerciseId}:best`, best.toString());
  },

  // CRITICAL FIX: Helper to set up data for "dedicated" achievement (50+ sessions)
  setupDedicatedAchievement: () => {
    localStorage.setItem('FPR_v1_exercise:bubble:sessions', '25');
    localStorage.setItem('FPR_v1_exercise:comet:sessions', '15');
    localStorage.setItem('FPR_v1_exercise:crosshair:sessions', '10');
  },

  // CRITICAL FIX: Helper to set up data for export tests
  setupExportData: () => {
    localStorage.setItem('FPR_v1_exercise:bubble:best', '150');
    localStorage.setItem('FPR_v1_exercise:bubble:sessions', '5');
    localStorage.setItem('FPR_v1_exercise:comet:best', '200');
    localStorage.setItem('FPR_v1_exercise:comet:sessions', '3');
    localStorage.setItem('FPR_v1_points', '500');
    localStorage.setItem('FPR_v1_streak', '3');
    localStorage.setItem('FPR_v1_totalSessions', '8');
  }
};