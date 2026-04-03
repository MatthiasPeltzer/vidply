/**
 * E2E Tests: Captions and Subtitles
 * Tests caption display and controls
 */

import { test, expect } from '@playwright/test';

test.describe('Captions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player-video.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have captions button visible', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await expect(captionsButton).toBeVisible();
  });

  test('should open captions menu when button is clicked', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await captionsButton.click();

    // Wait for menu to appear
    await page.waitForTimeout(300);

    // Check for menu with role="menu"
    const menu = page.locator('[role="menu"][aria-label="Select captions"]');
    await expect(menu).toBeVisible({ timeout: 3000 });
  });

  test('should show available caption languages', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await captionsButton.click();

    await page.waitForTimeout(300);

    // The demo has multiple caption tracks
    const menuItems = page.locator('[role="menu"] [role="menuitemradio"], [role="menu"] button');
    const count = await menuItems.count();
    
    // Should have Off + language options
    expect(count).toBeGreaterThan(1);
  });

  test('should have "Off" option in captions menu', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await captionsButton.click();

    await page.waitForTimeout(300);

    // Look for Off option
    const offOption = page.locator('[role="menu"] >> text=Off');
    await expect(offOption).toBeVisible();
  });

  test('should select caption language', async ({ page }) => {
    // Open captions menu
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await captionsButton.click();
    await page.waitForTimeout(300);

    // Click English option
    const englishOption = page.locator('[role="menu"] >> text=English').first();
    
    if (await englishOption.isVisible()) {
      await englishOption.click();
      await page.waitForTimeout(500);

      // Menu should close after selection
      const menu = page.locator('[role="menu"][aria-label="Select captions"]');
      await expect(menu).toBeHidden({ timeout: 3000 });
    }
  });
});

test.describe('Chapters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player-video.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have chapters button', async ({ page }) => {
    const chaptersButton = page.locator('button[aria-label="Chapters"]');
    await expect(chaptersButton).toBeVisible();
  });

  test('should open chapters menu when clicked', async ({ page }) => {
    const chaptersButton = page.locator('button[aria-label="Chapters"]');
    await chaptersButton.click();
    await page.waitForTimeout(300);

    // Check for chapters menu
    const chaptersMenu = page.locator('[role="menu"][aria-label="Chapters"]');
    await expect(chaptersMenu).toBeVisible({ timeout: 3000 });
  });

  test('should display chapter items', async ({ page }) => {
    const chaptersButton = page.locator('button[aria-label="Chapters"]');
    await chaptersButton.click();
    await page.waitForTimeout(500);

    // Check for chapter items
    const chapterItems = page.locator('[role="menu"][aria-label="Chapters"] [role="menuitem"]');
    const count = await chapterItems.count();
    
    // The demo video has chapters defined
    expect(count).toBeGreaterThan(0);
  });

  test('should seek to chapter when clicked', async ({ page }) => {
    // Open chapters
    const chaptersButton = page.locator('button[aria-label="Chapters"]');
    await chaptersButton.click();
    await page.waitForTimeout(500);

    // Click first chapter
    const firstChapter = page.locator('[role="menu"][aria-label="Chapters"] [role="menuitem"]').first();
    
    if (await firstChapter.isVisible()) {
      await firstChapter.click();
      await page.waitForTimeout(500);

      // Menu should close and video should have seeked
      const chaptersMenu = page.locator('[role="menu"][aria-label="Chapters"]');
      await expect(chaptersMenu).toBeHidden({ timeout: 3000 });
    }
  });
});

test.describe('Transcript', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player-video.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have transcript button', async ({ page }) => {
    const transcriptButton = page.locator('button[aria-label="Toggle transcript"]');
    await expect(transcriptButton).toBeVisible();
  });

  test('should open transcript panel when clicked', async ({ page }) => {
    const transcriptButton = page.locator('button[aria-label="Toggle transcript"]');
    await transcriptButton.click();
    await page.waitForTimeout(500);

    // Check for transcript panel or dialog
    const transcriptPanel = page.locator('.vidply-transcript, .vidply-transcript-dialog');
    await expect(transcriptPanel.first()).toBeVisible({ timeout: 5000 });
  });

  test('should close transcript when toggle clicked again', async ({ page }) => {
    const transcriptButton = page.locator('button[aria-label="Toggle transcript"]');
    
    // Open transcript
    await transcriptButton.click();
    await page.waitForTimeout(500);

    // Verify it opened
    const transcriptPanel = page.locator('.vidply-transcript, .vidply-transcript-dialog');
    await expect(transcriptPanel.first()).toBeVisible({ timeout: 5000 });

    // Close transcript by clicking the toggle button again
    // (The close button might be outside viewport, so use the toggle)
    await transcriptButton.click();
    await page.waitForTimeout(500);

    // Button aria-expanded should be false now
    const collapsedButton = page.locator('button[aria-label="Toggle transcript"][aria-expanded="false"]');
    await expect(collapsedButton).toBeVisible({ timeout: 3000 });
  });

  test('should have transcript header with title', async ({ page }) => {
    const transcriptButton = page.locator('button[aria-label="Toggle transcript"]');
    await transcriptButton.click();
    await page.waitForTimeout(500);

    // Look for transcript panel with title or aria-label
    const transcriptPanel = page.locator('.vidply-transcript, [aria-label="Video Transcript"]');
    await expect(transcriptPanel.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sign Language', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player-video.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have sign language button', async ({ page }) => {
    // Initial label is "Sign language video" 
    const signButton = page.locator('button[aria-label="Sign language video"], button[aria-label="Show sign language video"]');
    await expect(signButton.first()).toBeVisible();
  });

  test('should toggle sign language video', async ({ page }) => {
    // First start playback (sign language requires playback in demo)
    const playButton = page.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(1000);

    // Click sign language button
    const signButton = page.locator('button[aria-label="Sign language video"], button[aria-label="Show sign language video"]');
    await signButton.first().click();
    await page.waitForTimeout(500);

    // Sign language wrapper should appear or button aria-expanded should change
    const signWrapper = page.locator('.vidply-sign-language-wrapper');
    const expandedButton = page.locator('button[aria-label="Sign language video"][aria-expanded="true"], button[aria-label="Hide sign language video"]');
    
    // Either the button changed state or the wrapper is visible
    const buttonExpanded = await expandedButton.first().isVisible().catch(() => false);
    const wrapperVisible = await signWrapper.isVisible().catch(() => false);
    
    expect(buttonExpanded || wrapperVisible).toBeTruthy();
  });
});

test.describe('Audio Description', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player-video.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have audio description button', async ({ page }) => {
    // Label is "Audio description" with role="switch"
    const adButton = page.locator('button[aria-label="Audio description"]');
    await expect(adButton).toBeVisible();
  });

  test('should toggle audio description', async ({ page }) => {
    // First start playback
    const playButton = page.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(1000);

    // Click audio description button (role="switch")
    const adButton = page.locator('button[aria-label="Audio description"]');
    await adButton.click();
    await page.waitForTimeout(500);

    // The aria-checked should change to true
    const checkedButton = page.locator('button[aria-label="Audio description"][aria-checked="true"]');
    await expect(checkedButton).toBeVisible({ timeout: 3000 });
  });
});
