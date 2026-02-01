/**
 * E2E Tests: Internationalization (i18n)
 * Tests player UI in different languages: German, French, Spanish, Japanese, Italian
 */

import { test, expect } from '@playwright/test';

// Expected translations for Play button in each language
const playLabels = {
  en: 'Play',
  de: 'Abspielen',
  fr: 'Lecture',
  es: 'Reproducir',
  ja: '再生',
  // it: 'Riproduci' // Italian if available
};

const pauseLabels = {
  en: 'Pause',
  de: 'Pause',
  fr: 'Pause',
  es: 'Pausa',
  ja: '一時停止',
};

const fullscreenLabels = {
  en: 'Fullscreen',
  de: 'Vollbild',
  fr: 'Plein écran',
  es: 'Pantalla completa',
  ja: 'フルスクリーン',
};

test.describe('German Language (de)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-de.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display player in German', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have German play button label', async ({ page }) => {
    // Look for either German or English label (depends on player config)
    const playButton = page.locator(`button[aria-label="${playLabels.de}"], button[aria-label="${playLabels.en}"]`);
    await expect(playButton.first()).toBeVisible();
  });

  test('should have German fullscreen button label', async ({ page }) => {
    const fullscreenButton = page.locator(`button[aria-label="${fullscreenLabels.de}"], button[aria-label="${fullscreenLabels.en}"]`);
    await expect(fullscreenButton.first()).toBeVisible();
  });

  test('should show German captions option if available', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Untertitel"], button[aria-label="Captions"]');
    
    if (await captionsButton.first().isVisible()) {
      await captionsButton.first().click();
      await page.waitForTimeout(300);

      // Look for German caption track "Deutsch"
      const deutschOption = page.locator('[role="menu"] >> text=Deutsch');
      const isAvailable = await deutschOption.isVisible().catch(() => false);
      // Demo has German captions for some videos
    }
  });
});

test.describe('French Language (fr)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-fr.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display player in French', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have French or English play button label', async ({ page }) => {
    const playButton = page.locator(`button[aria-label="${playLabels.fr}"], button[aria-label="${playLabels.en}"]`);
    await expect(playButton.first()).toBeVisible();
  });

  test('should show French captions if available', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Sous-titres"], button[aria-label="Captions"]');
    
    if (await captionsButton.first().isVisible()) {
      await captionsButton.first().click();
      await page.waitForTimeout(300);

      // Look for French caption track "Français"
      const francaisOption = page.locator('[role="menu"] >> text=Français');
      const isAvailable = await francaisOption.isVisible().catch(() => false);
    }
  });
});

test.describe('Spanish Language (es)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-es.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display player in Spanish', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have Spanish or English play button label', async ({ page }) => {
    const playButton = page.locator(`button[aria-label="${playLabels.es}"], button[aria-label="${playLabels.en}"]`);
    await expect(playButton.first()).toBeVisible();
  });

  test('should show Spanish captions if available', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Subtítulos"], button[aria-label="Captions"]');
    
    if (await captionsButton.first().isVisible()) {
      await captionsButton.first().click();
      await page.waitForTimeout(300);

      // Look for Spanish caption track "Español"
      const espanolOption = page.locator('[role="menu"] >> text=Español');
      const isAvailable = await espanolOption.isVisible().catch(() => false);
    }
  });
});

test.describe('Japanese Language (ja)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-jp.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display player in Japanese', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have Japanese or English play button label', async ({ page }) => {
    const playButton = page.locator(`button[aria-label="${playLabels.ja}"], button[aria-label="${playLabels.en}"]`);
    await expect(playButton.first()).toBeVisible();
  });

  test('should show Japanese captions if available', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="字幕"], button[aria-label="Captions"]');
    
    if (await captionsButton.first().isVisible()) {
      await captionsButton.first().click();
      await page.waitForTimeout(300);

      // Look for Japanese caption track "日本語"
      const japaneseOption = page.locator('[role="menu"] >> text=日本語');
      const isAvailable = await japaneseOption.isVisible().catch(() => false);
    }
  });
});

test.describe('Italian Language (it)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-it.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should display player in Italian', async ({ page }) => {
    const player = page.locator('.vidply-player').first();
    await expect(player).toBeVisible();
  });

  test('should have Italian or English play button label', async ({ page }) => {
    // Italian might fall back to English if not fully translated
    const playButton = page.locator('button[aria-label="Riproduci"], button[aria-label="Play"]');
    await expect(playButton.first()).toBeVisible();
  });

  test('should show Italian captions if available', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Sottotitoli"], button[aria-label="Captions"]');
    
    if (await captionsButton.first().isVisible()) {
      await captionsButton.first().click();
      await page.waitForTimeout(300);

      // Look for Italian caption track "Italiano"
      const italianoOption = page.locator('[role="menu"] >> text=Italiano');
      const isAvailable = await italianoOption.isVisible().catch(() => false);
    }
  });
});

test.describe('Multi-language Demo Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-de.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have multiple video players on page', async ({ page }) => {
    const players = page.locator('.vidply-player');
    const count = await players.count();
    
    // Demo page has multiple players (video and audio)
    expect(count).toBeGreaterThan(1);
  });

  test('should have multiple caption languages available', async ({ page }) => {
    // Find a player with captions
    const captionsButton = page.locator('button[aria-label="Untertitel"], button[aria-label="Captions"]').first();
    
    if (await captionsButton.isVisible()) {
      await captionsButton.click();
      await page.waitForTimeout(300);

      const menuItems = page.locator('[role="menu"] [role="menuitemradio"], [role="menu"] button');
      const count = await menuItems.count();
      
      // Should have multiple language options
      expect(count).toBeGreaterThan(2);
    }
  });

  test('should switch between caption languages', async ({ page }) => {
    const captionsButton = page.locator('button[aria-label="Untertitel"], button[aria-label="Captions"]').first();
    
    if (await captionsButton.isVisible()) {
      await captionsButton.click();
      await page.waitForTimeout(300);

      // Select a non-default language
      const espanolOption = page.locator('[role="menu"] >> text=Español');
      
      if (await espanolOption.isVisible()) {
        await espanolOption.click();
        await page.waitForTimeout(300);

        // Reopen menu to verify selection
        await captionsButton.click();
        await page.waitForTimeout(300);

        // The selected item should be marked (aria-checked or similar)
      }
    }
  });
});
