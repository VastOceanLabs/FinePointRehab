# FinePointRehab Testing Infrastructure - Task 21

This directory contains the comprehensive testing infrastructure implemented for **Task 21: Testing Infrastructure** as part of Phase 3: Polish & Optimization.

## 🎯 Overview

The testing infrastructure provides:

- **Jest unit tests** for core gamification modules
- **Playwright E2E tests** for critical user flows
- **Lighthouse performance auditing** (target ≥90 score)
- **Cross-browser compatibility verification**

## 📁 Directory Structure

```
tests/
├── jest/
│   ├── setup.js              # Jest configuration and mocks
│   ├── progress.test.js       # Progress tracking system tests
│   ├── achievements.test.js   # Achievement system tests
│   └── utils.test.js          # Utility functions tests
├── playwright/
│   ├── exercise-session.spec.js    # Exercise completion flow tests
│   ├── achievement-unlock.spec.js  # Achievement unlock flow tests
│   └── export-import.spec.js       # Data export/import flow tests
├── lighthouse/
│   └── audit.js              # Performance auditing script
├── run-all-tests.sh          # Comprehensive test runner
└── README.md                 # This documentation
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ installed
- FinePointRehab application files in project root

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
# Run complete test suite
./tests/run-all-tests.sh

# Or using npm
npm run test:all
```

### Run Individual Test Types

```bash
# Unit tests only
npm run test
# or
./tests/run-all-tests.sh --unit-only

# E2E tests only  
npm run test:e2e
# or
./tests/run-all-tests.sh --e2e-only

# Lighthouse audit only
npm run test:lighthouse
# or
./tests/run-all-tests.sh --lighthouse-only

# With coverage report
./tests/run-all-tests.sh --with-coverage
```

## 🧪 Test Categories

### 1. Jest Unit Tests

**Location**: `tests/jest/`

Tests the core gamification modules in isolation:

#### Progress System Tests (`progress.test.js`)
- Session recording and personal best tracking
- Streak system with timezone handling
- Weekend amnesty logic
- Points calculation based on difficulty
- Export/import functionality with replace policy

#### Achievement System Tests (`achievements.test.js`)
- All 5 core achievements (First Steps, Consistent, Dedicated, Personal Best, Explorer)
- Achievement unlock logic and deduplication
- Toast notification system with debouncing
- Achievement persistence across sessions

#### Utility Functions Tests (`utils.test.js`)
- Versioned localStorage wrapper (`FPR_v1_` prefix)
- Theme management (light/dark/contrast)
- Audio system with gesture gating
- Toast notification queue management
- Reduced motion preferences
- Viewport utilities for mobile

**Key Features**:
- Comprehensive mocking (localStorage, HTMLAudioElement, matchMedia)
- Date mocking for consistent streak testing
- Edge case coverage (storage errors, malformed data)
- Accessibility compliance verification

### 2. Playwright E2E Tests

**Location**: `tests/playwright/`

Tests critical user flows across multiple browsers:

#### Exercise Session Flow (`exercise-session.spec.js`)
- Complete exercise session from start to finish
- Personal best display on subsequent sessions
- Mobile viewport responsiveness
- Navigation between exercises
- Data persistence across page refreshes

#### Achievement Unlock Flow (`achievement-unlock.spec.js`)
- "First Steps" unlock after completing first session
- "Consistent" unlock after achieving 7-day streak
- "Personal Best" unlock when beating previous score
- "Explorer" unlock after trying all exercises
- Multiple simultaneous achievement unlocks
- Duplicate achievement prevention

#### Export/Import Flow (`export-import.spec.js`)
- Complete progress data export with proper JSON structure
- Import with replace policy (clears existing data)
- Version compatibility error handling
- Full export-import round trip verification
- Malformed data handling and graceful errors

**Cross-Browser Testing**:
- Desktop: Chrome, Firefox, Safari
- Mobile: Chrome (Pixel 5), Safari (iPhone 12)

### 3. Lighthouse Performance Audit

**Location**: `tests/lighthouse/audit.js`

Automated performance auditing with strict targets:

**Target Scores** (minimum):
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥90
- SEO: ≥90

**Target Metrics**:
- First Contentful Paint: ≤2000ms
- Largest Contentful Paint: ≤3000ms
- Cumulative Layout Shift: ≤0.1
- Total Blocking Time: ≤300ms

**Audited Pages**:
- Home page (`/`)
- Exercise page (`/exercises/bubble-exercise.html`)
- Dashboard (`/dashboard.html`)

**Features**:
- Mobile-first auditing with throttling
- Detailed reporting with actionable recommendations
- Automatic failure detection for CI/CD
- JSON and text report generation

## 📊 Test Results

Test results are saved in the `test-results/` directory:

```
test-results/
├── lighthouse-results-TIMESTAMP.json    # Detailed Lighthouse data
├── lighthouse-summary-TIMESTAMP.txt     # Human-readable summary
├── results.json                         # Playwright test results
└── results.xml                          # JUnit format for CI/CD
```

## 🔧 Configuration

### Jest Configuration (`package.json`)

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/tests/jest/setup.js"],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Playwright Configuration (`playwright.config.js`)

- Tests run on `http://localhost:8081`
- Automatic test server startup
- Screenshot/video capture on failure
- Trace collection for debugging

### Lighthouse Configuration (`tests/lighthouse/audit.js`)

- Mobile-first with network throttling
- Custom audit selection for performance focus
- Configurable thresholds for pass/fail

## 🎯 Task 21 Success Criteria

✅ **Jest unit tests for core gamification modules**
- Progress tracking system fully tested
- Achievement system with all 5 achievements tested
- Utility functions comprehensively covered

✅ **Playwright E2E tests for critical user flows**
- Exercise session completion flow verified
- Achievement unlock flow tested across all achievements
- Export/import progress flow validated

✅ **Lighthouse performance auditing (target ≥90)**
- Automated performance monitoring
- Mobile-first audit approach
- Actionable recommendations for improvements

✅ **Cross-browser compatibility verification**
- Desktop browsers: Chrome, Firefox, Safari
- Mobile browsers: Chrome (Android), Safari (iOS)
- Responsive design validation

## 🚨 Troubleshooting

### Common Issues

**Tests fail to start**:
```bash
# Check Node.js version
node --version  # Should be 16+

# Install dependencies
npm install

# Clear cache
npm cache clean --force
```

**E2E tests can't connect to server**:
```bash
# Manually start test server
npm run serve:test

# Check if port 8081 is available
lsof -ti:8081
```

**Playwright browsers not found**:
```bash
# Install Playwright browsers
npx playwright install --with-deps
```

**Lighthouse audit fails**:
```bash
# Ensure test server is running
curl http://localhost:8081/

# Check Chrome installation
google-chrome --version
```

### Debugging E2E Tests

```bash
# Run with UI mode for debugging
npm run test:e2e:ui

# Run specific test file
npx playwright test exercise-session.spec.js

# Run in headed mode
npx playwright test --headed
```

### Mock Data for Testing

The test setup provides utilities for seeding localStorage:

```javascript
// In tests
testUtils.seedStorage({
  'FPR_v1_points': 250,
  'FPR_v1_exercise:bubble:best': 150,
  'FPR_v1_achievements': ['firstSteps', 'consistent']
});
```

## 📈 Next Steps

After Task 21 completion, this testing infrastructure supports:

1. **Continuous Integration**: All tests can run in CI/CD pipelines
2. **Performance Monitoring**: Regular Lighthouse audits catch regressions
3. **Feature Development**: Test-driven development for new features
4. **Quality Gates**: Automated quality checks before deployment

## 🤝 Contributing

When adding new features to FinePointRehab:

1. **Add unit tests** for new utility functions or core logic
2. **Add E2E tests** for new user-facing flows
3. **Update Lighthouse config** if new pages are added
4. **Run full test suite** before submitting changes

```bash
# Before submitting changes
./tests/run-all-tests.sh --with-coverage
```

The testing infrastructure ensures FinePointRehab maintains high quality and performance standards as it evolves.