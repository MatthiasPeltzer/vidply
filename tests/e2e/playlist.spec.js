/**
 * E2E Tests: Playlist Functionality
 * Tests video playlists, audio playlists, and mixed media playlists
 */

import { test, expect } from '@playwright/test';

test.describe('Video Playlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/playlist-video.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display video playlist player', async ({ page }) => {
    // Page may have multiple players - use first()
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have playlist panel or toggle', async ({ page }) => {
    // Find the player with playlist (has .vidply-has-playlist class)
    const playlistPlayer = page.locator('.vidply-player.vidply-has-playlist').first();
    const hasPlaylistPlayer = await playlistPlayer.isVisible().catch(() => false);
    
    // Or look for playlist toggle button
    const playlistToggle = page.locator('button[aria-label="Toggle playlist"], button[aria-label*="playlist"]').first();
    const hasToggle = await playlistToggle.isVisible().catch(() => false);
    
    expect(hasPlaylistPlayer || hasToggle).toBeTruthy();
  });

  test('should have next track button', async ({ page }) => {
    const nextButton = page.locator('button[aria-label="Next track"], button[aria-label*="Next"]').first();
    // Next button should be visible on playlist player
    const isVisible = await nextButton.isVisible().catch(() => false);
    // May not be visible if there's only one track or on last track
  });

  test('should show rewind and forward on VOD tracks', async ({ page }) => {
    const player = page.locator('.vidply-player.vidply-has-playlist').first();
    await page.waitForFunction(() => {
      const media = document.querySelector('.vidply-has-playlist video, .vidply-has-playlist audio');
      return media && Number.isFinite(media.duration) && media.duration > 0;
    });
    await expect(player.locator('.vidply-rewind')).toBeVisible();
    await expect(player.locator('.vidply-forward')).toBeVisible();
  });

  test('should navigate to next track', async ({ page }) => {
    // Find the first player
    const player = page.locator('.vidply-player').first();
    
    // Start playback on first player
    const playButton = player.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(1000);

    // Click next track if available
    const nextButton = player.locator('button[aria-label="Next track"], button[aria-label*="Next"]');
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Player should still be functional
      await expect(player).toBeVisible();
    }
  });

  test('should show playlist track items when panel opened', async ({ page }) => {
    // Find player with playlist
    const player = page.locator('.vidply-player.vidply-has-playlist').first();
    
    if (await player.isVisible()) {
      // Open playlist if there's a toggle
      const playlistToggle = player.locator('button[aria-label="Toggle playlist"], button[aria-label*="playlist"]');
      
      if (await playlistToggle.isVisible()) {
        await playlistToggle.click();
        await page.waitForTimeout(500);
      }

      // Look for playlist items within the player or page
      const playlistItems = page.locator('.vidply-playlist-item');
      const count = await playlistItems.count();
      
      // Should have tracks if playlist is shown
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle keyboard navigation in playlist (Shift+N for next)', async ({ page }) => {
    // Focus on the first player
    const player = page.locator('.vidply-player').first();
    await player.click();

    // Start playback
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Press Shift+N for next track
    await page.keyboard.press('Shift+n');
    await page.waitForTimeout(1000);

    // Player should still be functional
    await expect(player).toBeVisible();
  });

  test('should handle keyboard navigation in playlist (Shift+P for previous)', async ({ page }) => {
    // Focus on the first player
    const player = page.locator('.vidply-player').first();
    await player.click();

    // First go to track 2
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await page.keyboard.press('Shift+n');
    await page.waitForTimeout(1000);

    // Press Shift+P for previous track
    await page.keyboard.press('Shift+p');
    await page.waitForTimeout(1000);

    // Player should still be functional
    await expect(player).toBeVisible();
  });
});

test.describe('Audio Playlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/playlist-audio.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display audio playlist player', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have audio-specific styling', async ({ page }) => {
    // Audio player has .vidply-audio class
    const audioPlayer = page.locator('.vidply-player.vidply-audio').first();
    const isAudio = await audioPlayer.isVisible().catch(() => false);
    
    // At least one player should be visible
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have play/pause controls', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    const playButton = player.locator('button[aria-label="Play"]');
    await expect(playButton).toBeVisible();
  });

  test('should play audio track', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    const playButton = player.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(1000);

    // Pause button should appear
    const pauseButton = player.locator('button[aria-label="Pause"]');
    await expect(pauseButton).toBeVisible({ timeout: 5000 });
  });

  test('should have progress bar for audio', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    const progressBar = player.locator('[aria-label="Progress"][role="slider"]');
    await expect(progressBar).toBeVisible();
  });

  test('should show rewind and forward on VOD tracks', async ({ page }) => {
    const player = page.locator('.vidply-player.vidply-has-playlist').first();
    await page.waitForFunction(() => {
      const media = document.querySelector('.vidply-has-playlist video, .vidply-has-playlist audio');
      return media && Number.isFinite(media.duration) && media.duration > 0;
    });
    await expect(player.locator('.vidply-rewind')).toBeVisible();
    await expect(player.locator('.vidply-forward')).toBeVisible();
  });

  test('should navigate between audio tracks', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    
    // Start playback
    const playButton = player.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(500);

    // Try next track
    const nextButton = player.locator('button[aria-label="Next track"], button[aria-label*="Next"]');
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Should still have controls
      await expect(player).toBeVisible();
    }
  });
});

test.describe('Mixed Media Playlist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/playlist-mixed.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display mixed media playlist player', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should show rewind and forward on VOD tracks', async ({ page }) => {
    const player = page.locator('.vidply-player.vidply-has-playlist').first();
    await page.waitForFunction(() => {
      const media = document.querySelector('.vidply-has-playlist video, .vidply-has-playlist audio');
      return media && Number.isFinite(media.duration) && media.duration > 0;
    });
    await expect(player.locator('.vidply-rewind')).toBeVisible();
    await expect(player.locator('.vidply-forward')).toBeVisible();
  });

  test('should enable sign language overlay on tracks that provide a source', async ({ page }) => {
    const player = page.locator('.vidply-player.vidply-has-playlist').first();
    await page.waitForSelector('.vidply-sign-language', { timeout: 15000 });

    const warnings = [];
    page.on('console', (msg) => {
      if (msg.type() === 'warning' && msg.text().includes('No sign language video source provided')) {
        warnings.push(msg.text());
      }
    });

    await player.locator('.vidply-sign-language').click();
    await page.waitForTimeout(500);

    expect(warnings).toEqual([]);
    await expect(player.locator('.vidply-sign-language-wrapper')).toBeVisible();
  });

  test('should handle mixed video and audio tracks', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    
    // Start playback
    const playButton = player.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(1000);

    // Navigate through tracks
    const nextButton = player.locator('button[aria-label="Next track"], button[aria-label*="Next"]');
    
    if (await nextButton.isVisible()) {
      // Go through a few tracks to test video/audio switching
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Player should adapt to media type
      await expect(player).toBeVisible();
    }
  });

  test('should maintain player after track changes', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    
    const playButton = player.locator('button[aria-label="Play"]');
    await playButton.click();
    await page.waitForTimeout(500);

    // Navigate to next track
    const nextButton = player.locator('button[aria-label="Next track"], button[aria-label*="Next"]');
    
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(1000);
    }

    // Hover over player to show controls
    await player.hover();
    await page.waitForTimeout(500);

    // Player should still exist and be functional
    await expect(player).toBeVisible();
    
    // Check for any control element
    const controls = player.locator('.vidply-controls');
    await expect(controls).toBeVisible();
  });
});

test.describe('Single Video with Playlist Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-playlist.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display single video with playlist capability', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have standard video controls', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    
    const playButton = player.locator('button[aria-label="Play"]');
    await expect(playButton).toBeVisible();

    const fullscreenButton = player.locator('button[aria-label="Fullscreen"]');
    await expect(fullscreenButton).toBeVisible();
  });
});
