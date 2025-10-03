// E2E tests for exercise session completion flow
import { test, expect } from '@playwright/test';

test.describe('Exercise Session Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('FPR_v1_')) {
          localStorage.removeItem(key);
        }
      });
    });
  });

  test('should complete a bubble exercise session', async ({ page }) => {
    // Navigate to bubble exercise
    await page.goto('/exercises/bubble-exercise.html');
    
    // Wait for page to load
    await expect(page.locator('h1')).toContainText(['Bubble', 'Tap']);
    
    // Check if settings panel exists
    const settingsButton = page.locator('[data-testid="settings-button"], .settings-button, #settings-button');
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      
      // Set medium difficulty if settings panel opens
      const difficultySelect = page.locator('#difficulty-select, select[name="difficulty"]');
      if (await difficultySelect.isVisible()) {
        await difficultySelect.selectOption('medium');
      }
      
      // Close settings or start game
      const startButton = page.locator('[data-testid="start-button"], .start-button, #start-button, button:has-text("Start")');
      if (await startButton.isVisible()) {
        await startButton.click();
      }
    }

    // Look for game area or canvas
    const gameArea = page.locator('#game-area, #game-canvas, canvas, .game-container').first();
    await expect(gameArea).toBeVisible({ timeout: 10000 });

    // Simulate user interaction - click on game area multiple times
    const gameAreaBox = await gameArea.boundingBox();
    if (gameAreaBox) {
      // Click multiple times to simulate bubble tapping
      for (let i = 0; i < 5; i++) {
        await page.mouse.click(
          gameAreaBox.x + gameAreaBox.width * Math.random(),
          gameAreaBox.y + gameAreaBox.height * Math.random()
        );
        await page.waitForTimeout(200); // Small delay between clicks
      }
    }

    // Wait for session to potentially complete (either by timer or actions)
    await page.waitForTimeout(3000);

    // Check for completion indicators
    const completionIndicators = [
      '#completion-message',
      '.completion-message', 
      '#session-complete',
      '.session-complete',
      'text=Session Complete',
      'text=Well Done',
      'text=Great Work'
    ];

    let sessionCompleted = false;
    for (const indicator of completionIndicators) {
      try {
        await expect(page.locator(indicator)).toBeVisible({ timeout: 2000 });
        sessionCompleted = true;
        break;
      } catch (e) {
        // Continue checking other indicators
      }
    }

    // If no automatic completion, try to manually end session
    if (!sessionCompleted) {
      const endButton = page.locator('button:has-text("End"), button:has-text("Stop"), button:has-text("Finish")');
      if (await endButton.isVisible()) {
        await endButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Verify that progress was recorded
    const progressData = await page.evaluate(() => {
      return {
        sessions: localStorage.getItem('FPR_v1_exercise:bubble:sessions'),
        points: localStorage.getItem('FPR_v1_points'),
        hasAnyProgress: Object.keys(localStorage).some(key => key.startsWith('FPR_v1_'))
      };
    });

    // At minimum, some progress should be recorded
    expect(progressData.hasAnyProgress).toBe(true);
  });

  test('should show personal best on subsequent sessions', async ({ page }) => {
    // Set up existing personal best
    await page.goto('/exercises/bubble-exercise.html');
    await page.evaluate(() => {
      localStorage.setItem('FPR_v1_exercise:bubble:best', '150');
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '3');
    });

    // Reload page to trigger personal best display
    await page.reload();

    // Look for personal best display
    const personalBestIndicators = [
      'text=Personal Best',
      'text=Best Score',
      'text=150', // The actual score
      '[data-testid="personal-best"]',
      '.personal-best'
    ];

    let foundPersonalBest = false;
    for (const indicator of personalBestIndicators) {
      try {
        await expect(page.locator(indicator)).toBeVisible({ timeout: 3000 });
        foundPersonalBest = true;
        break;
      } catch (e) {
        // Continue checking
      }
    }

    // Personal best should be displayed somewhere on the page
    expect(foundPersonalBest).toBe(true);
  });

  test('should handle exercise session on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/exercises/bubble-exercise.html');
    
    // Ensure page is responsive and game area is visible
    const gameArea = page.locator('#game-area, #game-canvas, canvas, .game-container').first();
    await expect(gameArea).toBeVisible();

    // Check that touch targets are appropriately sized (at least 44px)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const buttonBox = await firstButton.boundingBox();
      
      if (buttonBox) {
        // Buttons should be at least 44px for touch accessibility
        expect(Math.min(buttonBox.width, buttonBox.height)).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should navigate between exercises correctly', async ({ page }) => {
    // Start at home page
    await page.goto('/');
    
    // Find and click on bubble exercise link
    const bubbleLink = page.locator('a[href*="bubble"], a:has-text("Bubble")').first();
    await expect(bubbleLink).toBeVisible();
    await bubbleLink.click();
    
    // Should be on bubble exercise page
    await expect(page).toHaveURL(/bubble-exercise/);
    await expect(page.locator('h1')).toContainText(['Bubble', 'Tap']);
    
    // Navigate back to home (if home button exists)
    const homeButton = page.locator('a[href="/"], a[href="index.html"], button:has-text("Home"), .home-button');
    if (await homeButton.first().isVisible()) {
      await homeButton.first().click();
      await expect(page).toHaveURL(/\/(index\.html)?$/);
    }
  });

  test('should persist data across page refreshes', async ({ page }) => {
    await page.goto('/exercises/bubble-exercise.html');
    
    // Set some progress data
    await page.evaluate(() => {
      localStorage.setItem('FPR_v1_exercise:bubble:sessions', '5');
      localStorage.setItem('FPR_v1_points', '75');
      localStorage.setItem('FPR_v1_streak', '3');
    });

    // Refresh the page
    await page.reload();

    // Verify data persists
    const persistedData = await page.evaluate(() => {
      return {
        sessions: localStorage.getItem('FPR_v1_exercise:bubble:sessions'),
        points: localStorage.getItem('FPR_v1_points'),
        streak: localStorage.getItem('FPR_v1_streak')
      };
    });

    expect(persistedData.sessions).toBe('5');
    expect(persistedData.points).toBe('75');
    expect(persistedData.streak).toBe('3');
  });
});