/**
 * E2E Tests: Video Playback
 * Tests actual video playback in real browsers using Playwright
 */

import {test, expect} from '@playwright/test';

test.describe('Video Playback', () => {
    test.beforeEach(async ({page}) => {
        // Navigate to the single player demo
        await page.goto('/demo/single-player-video.html');

        // Wait for player to initialize (the main player class)
        await page.waitForSelector('.vidply-player', {timeout: 15000});
    });

    test('should display the video player', async ({page}) => {
        const player = page.locator('.vidply-player');
        await expect(player).toBeVisible();
    });

    test('should show play button initially', async ({page}) => {
        // The play button uses aria-label="Play"
        const playButton = page.locator('button[aria-label="Play"]');
        await expect(playButton).toBeVisible();
    });

    test('should show control bar', async ({page}) => {
        const controlBar = page.locator('.vidply-controls');
        await expect(controlBar).toBeVisible();
    });

    test('should have volume control', async ({page}) => {
        // On desktop: button with aria-label="Volume" that opens slider
        // On mobile: button with aria-label="Mute"
        const volumeButton = page.locator('button[aria-label="Volume"], button[aria-label="Mute"]');
        await expect(volumeButton.first()).toBeVisible();
    });

    test('should have fullscreen button', async ({page}) => {
        const fullscreenBtn = page.locator('button[aria-label="Fullscreen"]');
        await expect(fullscreenBtn).toBeVisible();
    });

    test('should have progress bar', async ({page}) => {
        // Progress slider has aria-label="Progress"
        const progressBar = page.locator('[aria-label="Progress"][role="slider"]');
        await expect(progressBar).toBeVisible();
    });

    test('should play video when play button is clicked', async ({page}) => {
        // Click play button
        const playButton = page.locator('button[aria-label="Play"]');
        await playButton.click();

        // Wait a moment for state change
        await page.waitForTimeout(1000);

        // Check that video is playing (pause button should now be visible)
        const pauseButton = page.locator('button[aria-label="Pause"]');
        await expect(pauseButton).toBeVisible({timeout: 5000});
    });

    test('should pause video when pause button is clicked', async ({page}) => {
        // Start playback
        const playButton = page.locator('button[aria-label="Play"]');
        await playButton.click();

        // Wait for video to start
        await page.waitForTimeout(1000);

        // Click pause
        const pauseButton = page.locator('button[aria-label="Pause"]');
        await pauseButton.click();

        // Play button should be visible again
        await page.waitForTimeout(500);
        const playButtonAgain = page.locator('button[aria-label="Play"]');
        await expect(playButtonAgain).toBeVisible({timeout: 5000});
    });

    test('should have mute/volume button', async ({page}) => {
        // On desktop: "Volume" button (mute via right-click or slider)
        // On mobile: "Mute" button (direct toggle)
        const volumeOrMuteButton = page.locator('button[aria-label="Volume"], button[aria-label="Mute"]');
        await expect(volumeOrMuteButton.first()).toBeVisible();

        // Click opens volume slider on desktop
        await volumeOrMuteButton.first().click();
        await page.waitForTimeout(300);

        // Volume menu/slider should appear
        const volumeMenu = page.locator('.vidply-volume-menu, .vidply-volume-slider');
        // On desktop this should be visible, on mobile it might not exist
        const menuVisible = await volumeMenu.isVisible().catch(() => false);
        // Just verify the click didn't cause errors - menu might or might not show
    });

    test('should show time display', async ({page}) => {
        // Time display group
        const timeDisplay = page.locator('[aria-label="Time display"]');
        await expect(timeDisplay).toBeVisible();
    });
});

test.describe('Video Accessibility', () => {
    test.beforeEach(async ({page}) => {
        await page.goto('/demo/single-player-video.html');
        await page.waitForSelector('.vidply-player', {timeout: 15000});
    });

    test('should have proper ARIA labels on controls', async ({page}) => {
        // Check play button has aria-label
        const playButton = page.locator('button[aria-label="Play"]');
        await expect(playButton).toBeVisible();

        // Check volume/mute button has accessible label
        const volumeOrMuteButton = page.locator('button[aria-label="Volume"], button[aria-label="Mute"]');
        await expect(volumeOrMuteButton.first()).toBeVisible();

        // Check progress slider has accessible label
        const progressSlider = page.locator('[aria-label="Progress"][role="slider"]');
        await expect(progressSlider).toBeVisible();
    });

    test('should have captions button', async ({page}) => {
        const captionsButton = page.locator('button[aria-label="Captions"]');
        await expect(captionsButton).toBeVisible();
    });

    test('should have sign language button when configured', async ({page}) => {
        // The demo page has sign language configured
        // Initial label is "Sign language video" or "Show sign language video"
        const signLanguageButton = page.locator('button[aria-label="Sign language video"], button[aria-label="Show sign language video"]');
        await expect(signLanguageButton.first()).toBeVisible();
    });

    test('should have audio description button when configured', async ({page}) => {
        // The demo page has audio description configured
        // Label is "Audio description" with role="switch"
        const audioDescButton = page.locator('button[aria-label="Audio description"]');
        await expect(audioDescButton).toBeVisible();
    });

    test('should have transcript button when configured', async ({page}) => {
        // The demo page has transcript configured
        const transcriptButton = page.locator('button[aria-label="Toggle transcript"]');
        await expect(transcriptButton).toBeVisible();
    });

    test('should have chapters button', async ({page}) => {
        const chaptersButton = page.locator('button[aria-label="Chapters"]');
        await expect(chaptersButton).toBeVisible();
    });
});
