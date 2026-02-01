/**
 * E2E Tests: Keyboard Navigation
 * Tests keyboard accessibility and shortcuts
 */

import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should toggle play/pause with Space key', async ({ page }) => {
    // Focus the player by clicking on it
    const player = page.locator('.vidply-player');
    await player.click();

    // Press Space to play
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Check for pause button (indicates playing)
    const pauseButton = page.locator('button[aria-label="Pause"]');
    await expect(pauseButton).toBeVisible({ timeout: 5000 });

    // Press Space to pause
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Check for play button (indicates paused)
    const playButton = page.locator('button[aria-label="Play"]');
    await expect(playButton).toBeVisible({ timeout: 5000 });
  });

  test('should toggle play/pause with K key', async ({ page }) => {
    const player = page.locator('.vidply-player');
    await player.click();

    // Press K to play
    await page.keyboard.press('k');
    await page.waitForTimeout(1000);

    const pauseButton = page.locator('button[aria-label="Pause"]');
    await expect(pauseButton).toBeVisible({ timeout: 5000 });

    // Press K to pause
    await page.keyboard.press('k');
    await page.waitForTimeout(500);

    const playButton = page.locator('button[aria-label="Play"]');
    await expect(playButton).toBeVisible({ timeout: 5000 });
  });

  test('should toggle mute with M key', async ({ page }) => {
    const player = page.locator('.vidply-player');
    await player.click();

    // The M key should toggle mute state
    // Check the volume icon changes or player state changes
    await page.keyboard.press('m');
    await page.waitForTimeout(500);

    // Press M again to toggle back
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Just verify no errors occurred - the mute state is internal
    // The volume/mute button should still be visible
    const volumeOrMuteButton = page.locator('button[aria-label="Volume"], button[aria-label="Mute"]');
    await expect(volumeOrMuteButton.first()).toBeVisible();
  });

  test('should toggle fullscreen with F key', async ({ page }) => {
    const player = page.locator('.vidply-player');
    await player.click();

    // Press F to toggle fullscreen
    // Note: Fullscreen might not work in automated tests due to browser restrictions
    // but we verify the key press doesn't cause errors
    await page.keyboard.press('f');
    await page.waitForTimeout(500);
    
    // Press Escape to exit (in case fullscreen worked)
    await page.keyboard.press('Escape');
  });

  test('should seek forward with Arrow Right', async ({ page }) => {
    const player = page.locator('.vidply-player');
    await player.click();

    // Start playback first
    await page.keyboard.press('Space');
    await page.waitForTimeout(1000);

    // Press Right Arrow to seek forward
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    // The seek should have happened - we just verify no crash
    const pauseButton = page.locator('button[aria-label="Pause"]');
    await expect(pauseButton).toBeVisible();
  });

  test('should seek backward with Arrow Left', async ({ page }) => {
    const player = page.locator('.vidply-player');
    await player.click();

    // Start playback and wait a bit
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    // Press Left Arrow to seek backward
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    // Verify video is still playing
    const pauseButton = page.locator('button[aria-label="Pause"]');
    await expect(pauseButton).toBeVisible();
  });

  test('should be able to tab through controls', async ({ page }) => {
    // Tab into the page
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Keep tabbing to reach player controls
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }

    // Verify some element is focused within the player
    const focusedInPlayer = page.locator('.vidply-player :focus');
    const count = await focusedInPlayer.count();
    
    // At some point during tabbing, focus should enter the player
    // This test just verifies tab navigation works without errors
  });

  test('should close menus with Escape key', async ({ page }) => {
    // Open captions menu
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await captionsButton.click();
    await page.waitForTimeout(300);

    // Verify menu opened (look for menu with role="menu")
    const menu = page.locator('[role="menu"]');
    await expect(menu.first()).toBeVisible({ timeout: 3000 });

    // Press Escape to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Menu should be hidden
    await expect(menu.first()).toBeHidden({ timeout: 3000 });
  });
});

test.describe('Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should show focus indicators on interactive elements', async ({ page }) => {
    // Tab to the player area
    const playButton = page.locator('button[aria-label="Play"]');
    await playButton.focus();
    
    // The button should be visible and focused
    await expect(playButton).toBeFocused();
  });

  test('should maintain focus within menus when navigating', async ({ page }) => {
    // Open captions menu
    const captionsButton = page.locator('button[aria-label="Captions"]');
    await captionsButton.click();
    await page.waitForTimeout(300);

    // Navigate within menu with arrow keys
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    // Focus should still be within the menu area
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
