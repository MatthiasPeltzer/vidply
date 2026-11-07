/**
 * E2E Tests: Player context menu
 * Right-click / Menu key menu with the player's own functions.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const MENU = '.vidply-context-menu';

async function openWithMouse(page) {
  const video = page.locator('.vidply-player video');
  await video.click({ button: 'right', position: { x: 120, y: 120 } });
  const menu = page.locator(MENU).first();
  await expect(menu).toBeVisible();
  return menu;
}

test.describe('Context menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/single-player-video.html');
    await page.waitForSelector('.vidply-player .vidply-controls', { timeout: 15000 });
  });

  test('right-click opens the player menu instead of the browser menu', async ({ page }) => {
    const menu = await openWithMouse(page);

    await expect(menu).toHaveAttribute('role', 'menu');
    await expect(menu).toHaveAttribute('aria-label', 'Player menu');
    await expect(menu.getByRole('menuitem', { name: 'Play', exact: true })).toBeVisible();
    await expect(menu.getByRole('menuitem', { name: /^Captions/ })).toHaveAttribute(
      'aria-haspopup',
      'menu'
    );
    // Single video: no playlist navigation.
    await expect(menu.getByRole('menuitem', { name: /^Previous/ })).toHaveCount(0);
  });

  test('Escape closes the menu and returns focus to the player', async ({ page }) => {
    await openWithMouse(page);
    await page.keyboard.press('Escape');

    await expect(page.locator(MENU)).toHaveCount(0);
    const focusInPlayer = await page.evaluate(() =>
      document.querySelector('.vidply-player').contains(document.activeElement)
    );
    expect(focusInPlayer).toBe(true);
  });

  test('activating Play starts playback', async ({ page }) => {
    const menu = await openWithMouse(page);
    await menu.getByRole('menuitem', { name: 'Play', exact: true }).click();

    await expect(page.locator(MENU)).toHaveCount(0);
    await expect(page.locator('.vidply-controls button[aria-label="Pause"]')).toBeVisible({
      timeout: 5000
    });
  });

  test('Shift + right-click keeps the browser menu', async ({ page }) => {
    const video = page.locator('.vidply-player video');
    await page.keyboard.down('Shift');
    await video.click({ button: 'right', position: { x: 120, y: 120 } });
    await page.keyboard.up('Shift');

    await expect(page.locator(MENU)).toHaveCount(0);
  });

  for (const key of ['ContextMenu', 'Shift+F10']) {
    test(`${key} opens the menu with the first item focused`, async ({ page }) => {
      await page.locator('.vidply-player').focus();
      await page.keyboard.press(key);

      const menu = page.locator(MENU).first();
      await expect(menu).toBeVisible();
      await expect(menu.locator('[role^="menuitem"]').first()).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(page.locator(MENU)).toHaveCount(0);
      await expect(page.locator('.vidply-player')).toBeFocused();
    });
  }

  test('menu is keyboard operable', async ({ page }) => {
    const menu = await openWithMouse(page);
    const items = menu.locator('[role^="menuitem"]');

    await page.keyboard.press('ArrowDown');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('End');
    await expect(items.last()).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(items.first()).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(items.last()).toBeFocused();
  });

  test('speed submenu opens with ArrowRight and changes the rate', async ({ page }) => {
    const menu = await openWithMouse(page);
    const speed = menu.getByRole('menuitem', { name: /^Playback Speed/ });
    await speed.focus();
    await page.keyboard.press('ArrowRight');

    await expect(speed).toHaveAttribute('aria-expanded', 'true');
    const submenu = page.locator(MENU).nth(1);
    await expect(submenu).toBeVisible();
    await expect(submenu.getByRole('menuitemradio', { name: 'Normal' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await page.keyboard.press('ArrowLeft');
    await expect(page.locator(MENU)).toHaveCount(1);
    await expect(speed).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await submenu.getByRole('menuitemradio', { name: '1.5×' }).click();

    await expect(page.locator(MENU)).toHaveCount(0);
    const rate = await page.locator('.vidply-player video').evaluate((v) => v.playbackRate);
    expect(rate).toBe(1.5);
  });

  test('captions submenu opens on hover and switches the track', async ({ page }) => {
    const menu = await openWithMouse(page);
    await menu.getByRole('menuitem', { name: /^Captions/ }).hover();

    const submenu = page.locator(MENU).nth(1);
    await expect(submenu).toBeVisible();
    const radios = submenu.getByRole('menuitemradio');
    await expect(submenu.locator('[role="menuitemradio"][aria-checked="true"]')).toHaveCount(1);
    const target = (await radios.nth(1).getAttribute('aria-checked')) === 'true' ? 2 : 1;

    await radios.nth(target).click();
    await expect(page.locator(MENU)).toHaveCount(0);

    const reopened = await openWithMouse(page);
    await reopened.getByRole('menuitem', { name: /^Captions/ }).hover();
    const radiosAgain = page.locator(MENU).nth(1).getByRole('menuitemradio');
    await expect(radiosAgain.nth(target)).toHaveAttribute('aria-checked', 'true');
  });

  test('open menu has no critical or serious axe violations', async ({ page }) => {
    const menu = await openWithMouse(page);
    await menu.getByRole('menuitem', { name: /^Captions/ }).hover();
    await expect(page.locator(MENU).nth(1)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include(MENU)
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    if (blocking.length > 0) {
      console.log(JSON.stringify(blocking, null, 2));
    }
    expect(blocking).toEqual([]);
  });
});
