/**
 * E2E Tests: streamed accessibility videos (HLS/DASH) with progressive fallbacks
 *
 * Converted mpc-vidply records hand the player HLS/DASH manifests for the
 * sign-language and audio-described videos plus an MP4 fallback. These tests
 * serve a fixture page whose manifests 404 and check that the player ends up
 * on the MP4s instead of a dead overlay / main view.
 */

import { test, expect } from '@playwright/test';

const FIXTURE_PATH = '/demo/__streaming-fallbacks.html';

function fixtureHtml({ signSrc, signFallback, adSrc, adFallback }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Streaming fallbacks</title>
<link rel="stylesheet" href="/dist/vidply.min.css"></head>
<body>
<video id="fixture-video" data-vidply
  data-sign-language-src="${signSrc}"
  data-sign-language-fallback-src="${signFallback}"
  data-sign-language-button="true"
  data-audio-description-src="${adSrc}"
  data-audio-description-fallback-src="${adFallback}"
  data-audio-description-button="true"
  data-vidply-options='{"signLanguageDisplayMode":"pip","debug":true}'
  width="640" height="360" preload="metadata">
  <source src="/demo/media/wwa.mp4" type="video/mp4">
</video>
<script type="module">import '/dist/prod/vidply.esm.min.js';</script>
</body>
</html>`;
}

async function openFixture(page, sources) {
  await page.route('**/__streaming-fallbacks.html', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: fixtureHtml(sources) })
  );
  await page.route('**/missing/**', (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.goto(FIXTURE_PATH);
  await page.waitForSelector('.vidply-player', { timeout: 15000 });
}

test.describe('Streamed accessibility videos fall back to MP4', () => {
  // hls.js / dash.js retry a missing manifest a few times before giving up.
  test.setTimeout(60000);

  test('sign-language overlay falls back when its HLS manifest is missing', async ({ page }) => {
    await openFixture(page, {
      signSrc: '/demo/media/missing/wwa_sign.m3u8',
      signFallback: '/demo/media/wwa_sign_en.mp4',
      adSrc: '/demo/media/wwa_described.mp4',
      adFallback: ''
    });

    await page.locator('.vidply-sign-language').click();
    const overlay = page.locator('.vidply-sign-language-video');
    await expect(overlay).toBeAttached();

    await expect
      .poll(() => overlay.getAttribute('src'), { timeout: 30000 })
      .toBe('/demo/media/wwa_sign_en.mp4');
  });

  test('sign-language overlay falls back when its DASH manifest is missing', async ({ page }) => {
    await openFixture(page, {
      signSrc: '/demo/media/missing/wwa_sign.mpd',
      signFallback: '/demo/media/wwa_sign_en.mp4',
      adSrc: '/demo/media/wwa_described.mp4',
      adFallback: ''
    });

    await page.locator('.vidply-sign-language').click();
    const overlay = page.locator('.vidply-sign-language-video');

    await expect
      .poll(() => overlay.getAttribute('src'), { timeout: 30000 })
      .toBe('/demo/media/wwa_sign_en.mp4');
  });

  test('audio description swaps to its MP4 when the HLS version is missing', async ({ page }) => {
    await openFixture(page, {
      signSrc: '/demo/media/wwa_sign_en.mp4',
      signFallback: '',
      adSrc: '/demo/media/missing/wwa_described.m3u8',
      adFallback: '/demo/media/wwa_described.mp4'
    });

    await page.locator('.vidply-audio-description').click();

    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.getElementById('fixture-video')?.vidply?.currentSource ?? ''
          ),
        { timeout: 40000 }
      )
      .toContain('/demo/media/wwa_described.mp4');

    const rendererType = await page.evaluate(
      () => document.getElementById('fixture-video')?.vidply?.renderer?.rendererType
    );
    expect(rendererType).toBe('html5');
  });
});
