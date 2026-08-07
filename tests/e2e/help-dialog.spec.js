/**
 * E2E Tests: Keyboard help dialog
 *
 * An audio player is only as tall as its control bar, so a dialog confined to
 * the player box would be clipped to a few pixels. These tests pin down that
 * the dialog is usable on both player types.
 */

import { test, expect } from '@playwright/test';

const openHelp = async (player) => {
  const helpButton = player.locator('.vidply-help, button[data-vidply-control="help"]').first();
  await helpButton.click();
  const dialog = player.locator('.vidply-help-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
};

test.describe('Keyboard help dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-de.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('shows its content on an audio player', async ({ page }) => {
    const player = page.locator('.vidply-player.vidply-audio').first();
    await expect(player).toBeVisible();

    const dialog = await openHelp(player);
    const box = await dialog.boundingBox();

    // The shortcut list needs real room — the audio control bar is ~4rem high.
    expect(box.height).toBeGreaterThan(200);

    const viewport = page.viewportSize();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);

    const rows = dialog.locator('.vidply-help-action');
    expect(await rows.count()).toBeGreaterThan(0);
    await expect(rows.first()).toBeInViewport();
  });

  test('shows its content on a video player', async ({ page }) => {
    const player = page.locator('.vidply-player.vidply-video').first();
    await expect(player).toBeVisible();

    const dialog = await openHelp(player);
    const box = await dialog.boundingBox();

    expect(box.height).toBeGreaterThan(200);
    await expect(dialog.locator('.vidply-help-action').first()).toBeInViewport();
  });
});
