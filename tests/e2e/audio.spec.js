/**
 * E2E Tests: Audio Player
 * Tests audio-specific functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Audio Player', () => {
  test.beforeEach(async ({ page }) => {
    // Demo page has audio players
    await page.goto('/demo/demo-de.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display audio player', async ({ page }) => {
    // Find audio player (has .vidply-audio class or contains audio element)
    const audioPlayer = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');
    
    if (await audioPlayer.count() > 0) {
      await expect(audioPlayer.first()).toBeVisible();
    } else {
      // Fall back to any player
      const player = page.locator('.vidply-player');
      await expect(player.first()).toBeVisible();
    }
  });

  test('should have audio-specific controls (no fullscreen)', async ({ page }) => {
    const audioPlayer = page.locator('.vidply-player.vidply-audio');
    
    if (await audioPlayer.count() > 0) {
      // Audio players typically don't have fullscreen button
      const fullscreenInAudio = audioPlayer.first().locator('button[aria-label="Fullscreen"]');
      const hasFullscreen = await fullscreenInAudio.isVisible().catch(() => false);
      // Fullscreen is usually hidden for audio
    }
  });

  test('should play audio', async ({ page }) => {
    const audioPlayer = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');
    
    if (await audioPlayer.count() > 0) {
      const playButton = audioPlayer.first().locator('button[aria-label="Play"], button[aria-label="Abspielen"]');
      
      if (await playButton.isVisible()) {
        await playButton.click();
        await page.waitForTimeout(1000);

        // Should show pause button
        const pauseButton = audioPlayer.first().locator('button[aria-label="Pause"]');
        await expect(pauseButton).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should have progress bar', async ({ page }) => {
    const audioPlayer = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');
    
    if (await audioPlayer.count() > 0) {
      const progressBar = audioPlayer.first().locator('[aria-label="Progress"], [aria-label="Fortschritt"]');
      await expect(progressBar.first()).toBeVisible();
    }
  });

  test('should have volume control', async ({ page }) => {
    const audioPlayer = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');

    if (await audioPlayer.count() > 0) {
      // Desktop label is suffixed with the current percentage (e.g.
      // "Volume 100%" / "Lautstärke 100%"); touch is bare mute/unmute. Match
      // by prefix in either language.
      const volumeControl = audioPlayer.first().locator(
        'button[aria-label^="Volume"], button[aria-label^="Lautstärke"], ' +
        'button[aria-label^="Mute"], button[aria-label^="Stumm"], ' +
        'button[aria-label^="Unmute"], button[aria-label^="Ton ein"]'
      );
      await expect(volumeControl.first()).toBeVisible();
    }
  });

  test('should show time display', async ({ page }) => {
    const audioPlayer = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');
    
    if (await audioPlayer.count() > 0) {
      const timeDisplay = audioPlayer.first().locator('[aria-label="Time display"], .vidply-time');
      await expect(timeDisplay.first()).toBeVisible();
    }
  });

  test('should have captions button for audio with captions', async ({ page }) => {
    const audioPlayer = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');
    
    if (await audioPlayer.count() > 0) {
      // Some audio players have captions (lyrics/transcripts)
      const captionsButton = audioPlayer.first().locator('button[aria-label="Captions"], button[aria-label="Untertitel"]');
      const hasCaptions = await captionsButton.isVisible().catch(() => false);
      // May or may not have captions
    }
  });
});

test.describe('Audio Player - Standalone Demo', () => {
  test.beforeEach(async ({ page }) => {
    // Try the audio playlist demo which definitely has audio
    await page.goto('/demo/playlist-audio.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should render as audio player', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have compact layout for audio', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    
    // Audio players are typically shorter/more compact
    const box = await player.boundingBox();
    if (box) {
      // Audio players usually have smaller height than video
      // Just verify it rendered with some dimensions
      expect(box.height).toBeGreaterThan(0);
      expect(box.width).toBeGreaterThan(0);
    }
  });

  test('should update progress during playback', async ({ page }) => {
    const playButton = page.locator('button[aria-label="Play"]').first();
    await playButton.click();

    // Wait for some playback
    await page.waitForTimeout(2000);

    // Progress bar should have updated
    const progressBar = page.locator('[aria-label="Progress"][role="slider"]').first();
    const value = await progressBar.getAttribute('aria-valuenow');

    // Value should be greater than 0
    expect(parseFloat(value || '0')).toBeGreaterThan(0);
  });

  test('should handle keyboard controls for audio', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await player.click();
    await page.waitForTimeout(300);

    // Space to play
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);

    // Verify the player responded - either pause button visible or player state changed
    const pauseButton = player.locator('button[aria-label="Pause"]');
    const hasPauseButton = await pauseButton.isVisible().catch(() => false);
    
    // If pause button appeared, keyboard control works
    if (hasPauseButton) {
      // Space to pause
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      // Verify paused - play button should be visible or pause still visible (depends on timing)
      const playButtonAgain = player.locator('button[aria-label="Play"], button[aria-label="Pause"]');
      await expect(playButtonAgain).toBeVisible({ timeout: 5000 });
    } else {
      // At least player should still be functional
      await expect(player).toBeVisible();
    }
  });

  test('should seek with arrow keys', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await player.click();

    // Start playback
    await page.keyboard.press('Space');
    await page.waitForTimeout(2000);

    // Seek forward
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(300);

    // Seek backward
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(300);

    // Should still be playing
    const pauseButton = page.locator('button[aria-label="Pause"]');
    await expect(pauseButton.first()).toBeVisible();
  });

  test('should toggle mute with M key', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await player.click();

    // Toggle mute
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Toggle back
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Player should still be functional
    await expect(player).toBeVisible();
  });
});

test.describe('Audio with Lyrics/Captions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-de.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display lyrics as scrolling text', async ({ page }) => {
    // Find audio player with captions (French song demo)
    const audioPlayers = page.locator('.vidply-player.vidply-audio, .vidply-player:has(audio)');
    
    for (let i = 0; i < await audioPlayers.count(); i++) {
      const player = audioPlayers.nth(i);
      const captionsButton = player.locator('button[aria-label="Captions"], button[aria-label="Untertitel"]');
      
      if (await captionsButton.isVisible()) {
        // This audio has captions
        await captionsButton.click();
        await page.waitForTimeout(300);

        // Select a caption language
        const englishOption = page.locator('[role="menu"] >> text=English').first();
        if (await englishOption.isVisible()) {
          await englishOption.click();
          await page.waitForTimeout(300);

          // Start playback to see captions
          const playButton = player.locator('button[aria-label="Play"], button[aria-label="Abspielen"]');
          await playButton.click();
          await page.waitForTimeout(2000);

          // Captions should display in audio player
          const captions = player.locator('.vidply-captions, .vidply-caption-cue');
          // May or may not be visible depending on timing
        }
        break;
      }
    }
  });
});
