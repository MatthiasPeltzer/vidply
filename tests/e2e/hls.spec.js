/**
 * E2E Tests: HLS streaming (Chromium / hls.js path)
 * Exercises demo/hls-test.html where desktop browsers load the pinned hls.js build.
 */

import { test, expect } from '@playwright/test';

/** Keep in sync with HLSRenderer.loadHlsJs() — update when the CDN pin changes. */
const HLS_JS_PIN_URL =
  'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';

test.describe('HLS streaming (Chromium)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/hls-test.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('loads the pinned hls.js build from the CDN', async ({ page }) => {
    const hlsScript = page.waitForResponse(
      (response) =>
        response.url() === HLS_JS_PIN_URL && response.status() === 200,
      { timeout: 30000 }
    );

    // Reload so we can observe the CDN fetch even when a prior run cached hls.js.
    await page.reload();
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
    await hlsScript;

    const engineLabel = page.locator('#hls-engine');
    await expect(engineLabel).toContainText(/hls\.js v1\.7\.3/i, { timeout: 15000 });
  });

  test('uses the hls.js renderer in Chromium (not native HLS)', async ({ page }) => {
    await expect(page.locator('#browser-info')).toContainText(/Chrome \(hls\.js\)/i);
    await expect(page.locator('#hls-engine')).toContainText(/hls\.js v1\.7\.3/i, {
      timeout: 30000
    });

    const usesHlsJs = await page.evaluate(() => window.hlsPlayer?.renderer?.hls != null);
    expect(usesHlsJs).toBe(true);
  });

  test('shows standard playback controls', async ({ page }) => {
    await expect(page.locator('button[aria-label="Play"]')).toBeVisible();
    await expect(page.locator('.vidply-controls')).toBeVisible();
  });
});
