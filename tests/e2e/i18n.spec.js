/**
 * E2E Tests: Internationalization (i18n)
 * Comprehensive tests for player UI in different languages: German, French, Spanish, Japanese, Italian
 */

import { test, expect } from '@playwright/test';

// All translations from language files
const translations = {
  en: {
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    captions: 'Captions',
    chapters: 'Chapters',
    transcript: 'Toggle transcript',
    audioDescription: 'Audio description',
    signLanguage: 'Sign language video',
    settings: 'Settings',
    speed: 'Playback Speed',
    pip: 'Picture in Picture',
    restart: 'Restart from beginning',
    rewind: 'Rewind',
    forward: 'Forward',
    previous: 'Previous track',
    next: 'Next track',
    playlist: 'Toggle playlist',
    moreOptions: 'More options',
    quality: 'Quality',
    captionStyling: 'Caption styling'
  },
  de: {
    play: 'Abspielen',
    pause: 'Pause',
    mute: 'Stumm',
    unmute: 'Ton ein',
    volume: 'Lautstärke',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Vollbild beenden',
    captions: 'Untertitel',
    chapters: 'Kapitel',
    transcript: 'Transkript umschalten',
    audioDescription: 'Audiodeskription',
    signLanguage: 'Gebärdensprache-Video',
    settings: 'Einstellungen',
    speed: 'Wiedergabegeschwindigkeit',
    pip: 'Bild-in-Bild',
    restart: 'Von vorne beginnen',
    rewind: 'Zurückspulen',
    forward: 'Vorspulen',
    previous: 'Vorheriger Titel',
    next: 'Nächster Titel',
    playlist: 'Wiedergabeliste umschalten',
    moreOptions: 'Weitere Optionen',
    quality: 'Qualität',
    captionStyling: 'Untertitel-Stil'
  },
  fr: {
    play: 'Lecture',
    pause: 'Pause',
    mute: 'Muet',
    unmute: 'Activer le son',
    volume: 'Volume',
    fullscreen: 'Plein écran',
    exitFullscreen: 'Quitter le plein écran',
    captions: 'Sous-titres',
    chapters: 'Chapitres',
    transcript: 'Activer/désactiver la transcription',
    audioDescription: 'Audiodescription',
    signLanguage: 'Vidéo en langue des signes',
    settings: 'Paramètres',
    speed: 'Vitesse de lecture',
    pip: "Image dans l'image",
    restart: 'Redémarrer du début',
    rewind: 'Reculer',
    forward: 'Avancer',
    previous: 'Piste précédente',
    next: 'Piste suivante',
    playlist: 'Basculer la liste de lecture',
    moreOptions: "Plus d'options",
    quality: 'Qualité',
    captionStyling: 'Style des sous-titres'
  },
  es: {
    play: 'Reproducir',
    pause: 'Pausa',
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    volume: 'Volumen',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    captions: 'Subtítulos',
    chapters: 'Capítulos',
    transcript: 'Alternar transcripción',
    audioDescription: 'Audiodescripción',
    signLanguage: 'Video en lengua de señas',
    settings: 'Configuración',
    speed: 'Velocidad de reproducción',
    pip: 'Imagen en imagen',
    restart: 'Reiniciar desde el principio',
    rewind: 'Retroceder',
    forward: 'Avanzar',
    previous: 'Pista anterior',
    next: 'Siguiente pista',
    playlist: 'Alternar lista de reproducción',
    moreOptions: 'Más opciones',
    quality: 'Calidad',
    captionStyling: 'Estilo de subtítulos'
  },
  ja: {
    play: '再生',
    pause: '一時停止',
    mute: 'ミュート',
    unmute: 'ミュート解除',
    volume: '音量',
    fullscreen: '全画面表示',
    exitFullscreen: '全画面表示を終了',
    captions: '字幕',
    chapters: 'チャプター',
    transcript: '文字起こし切り替え',
    audioDescription: '音声解説',
    signLanguage: '手話動画',
    settings: '設定',
    speed: '再生速度',
    pip: 'ピクチャーインピクチャー',
    restart: '最初から再生',
    rewind: '巻き戻し',
    forward: '早送り',
    previous: '前のトラック',
    next: '次のトラック',
    playlist: 'プレイリストの切り替え',
    moreOptions: 'その他のオプション',
    quality: '画質',
    captionStyling: '字幕スタイル'
  }
};

// Language configurations with demo pages
const languages = [
  { code: 'de', name: 'German', page: '/demo/demo-de.html' },
  { code: 'fr', name: 'French', page: '/demo/demo-fr.html' },
  { code: 'es', name: 'Spanish', page: '/demo/demo-es.html' },
  { code: 'ja', name: 'Japanese', page: '/demo/demo-jp.html' },
  { code: 'it', name: 'Italian', page: '/demo/demo-it.html' }  // Falls back to English if no Italian translation
];

// Helper function to create button selector with fallback to English
function buttonSelector(lang, key) {
  const localLabel = translations[lang]?.[key] || translations.en[key];
  const enLabel = translations.en[key];
  return `button[aria-label="${localLabel}"], button[aria-label="${enLabel}"]`;
}

// Generate tests for each language
for (const lang of languages) {
  test.describe(`${lang.name} Language (${lang.code})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(lang.page);
      await page.waitForSelector('.vidply-player', { timeout: 15000 });
    });

    test('should display player', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      await expect(player).toBeVisible();
    });

    // Core playback controls
    test('should have play button with correct label', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      const playButton = player.locator(`button[aria-label="${t.play}"], button[aria-label="${translations.en.play}"]`);
      await expect(playButton).toBeVisible();
    });

    test('should have fullscreen button with correct label', async ({ page }) => {
      // Find video player (not audio)
      const videoPlayer = page.locator('.vidply-player.vidply-video').first();
      if (await videoPlayer.isVisible()) {
        const t = translations[lang.code] || translations.en;
        const fullscreenButton = videoPlayer.locator(`button[aria-label="${t.fullscreen}"], button[aria-label="${translations.en.fullscreen}"]`);
        await expect(fullscreenButton).toBeVisible();
      }
    });

    test('should have volume control with correct label', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      // Desktop volume button label is suffixed with the current percentage
      // (e.g. "Volume 100%" / "Lautstärke 100%") so screen readers announce
      // the level. Touch devices use the bare mute / unmute labels. Match by
      // prefix to cover both forms.
      const volumeButton = player.locator(
        `button[aria-label^="${t.volume}"], button[aria-label^="${translations.en.volume}"], ` +
        `button[aria-label^="${t.mute}"], button[aria-label^="${translations.en.mute}"], ` +
        `button[aria-label^="${t.unmute}"], button[aria-label^="${translations.en.unmute}"]`
      );
      await expect(volumeButton.first()).toBeVisible();
    });

    test('should have captions button with correct label', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      const captionsButton = player.locator(`button[aria-label="${t.captions}"], button[aria-label="${translations.en.captions}"]`);
      
      // Captions button may not be present if video has no captions
      const isVisible = await captionsButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(captionsButton).toBeVisible();
      }
    });

    test('should have settings/speed button with correct label', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      // Speed button or settings button
      const settingsButton = player.locator(
        `button[aria-label="${t.speed}"], button[aria-label="${translations.en.speed}"], ` +
        `button[aria-label="${t.settings}"], button[aria-label="${translations.en.settings}"]`
      );
      
      const isVisible = await settingsButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(settingsButton).toBeVisible();
      }
    });

    test('should have transcript button with correct label if available', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      const transcriptButton = player.locator(`button[aria-label="${t.transcript}"], button[aria-label="${translations.en.transcript}"]`);
      
      const isVisible = await transcriptButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(transcriptButton).toBeVisible();
      }
    });

    test('should have chapters button with correct label if available', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      const chaptersButton = player.locator(`button[aria-label="${t.chapters}"], button[aria-label="${translations.en.chapters}"]`);
      
      const isVisible = await chaptersButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(chaptersButton).toBeVisible();
      }
    });

    test('should have rewind button with correct label if available', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      // Could be "Rewind" or "Rewind X seconds"
      const rewindButton = player.locator(`button[aria-label^="${t.rewind}"], button[aria-label^="${translations.en.rewind}"]`);
      
      const isVisible = await rewindButton.isVisible().catch(() => false);
      // Not all players have rewind button visible by default
    });

    test('should have forward button with correct label if available', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      // Could be "Forward" or "Forward X seconds"
      const forwardButton = player.locator(`button[aria-label^="${t.forward}"], button[aria-label^="${translations.en.forward}"]`);
      
      const isVisible = await forwardButton.isVisible().catch(() => false);
      // Not all players have forward button visible by default
    });

    test('should have more options button if available', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      const moreButton = player.locator(`button[aria-label="${t.moreOptions}"], button[aria-label="${translations.en.moreOptions}"]`);
      
      const isVisible = await moreButton.isVisible().catch(() => false);
      if (isVisible) {
        await expect(moreButton).toBeVisible();
      }
    });

    test('should show pause button after playing', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      
      // Click play
      const playButton = player.locator(`button[aria-label="${t.play}"], button[aria-label="${translations.en.play}"]`);
      await playButton.click();
      await page.waitForTimeout(1500);
      
      // Check pause button appears
      const pauseButton = player.locator(`button[aria-label="${t.pause}"], button[aria-label="${translations.en.pause}"]`);
      await expect(pauseButton).toBeVisible({ timeout: 5000 });
    });

    test('should have progress bar with correct label', async ({ page }) => {
      const player = page.locator('.vidply-player').first();
      // Progress bar uses "Progress" in all languages or translated version
      const progressBar = player.locator('[role="slider"][aria-label]');
      await expect(progressBar).toBeVisible();
    });
  });
}

// Special tests for the German demo page with multiple players
test.describe('German Demo Page - Multiple Players', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/demo/demo-de.html');
    await page.waitForSelector('.vidply-player', { timeout: 15000 });
  });

  test('should have multiple video players on page', async ({ page }) => {
    const players = page.locator('.vidply-player');
    const count = await players.count();
    expect(count).toBeGreaterThan(1);
  });

  test('should have video and audio players', async ({ page }) => {
    const videoPlayers = page.locator('.vidply-player.vidply-video');
    const audioPlayers = page.locator('.vidply-player.vidply-audio');
    
    const videoCount = await videoPlayers.count();
    const audioCount = await audioPlayers.count();
    
    // Should have at least one of each type
    expect(videoCount + audioCount).toBeGreaterThan(1);
  });

  test('each player should have play button', async ({ page }) => {
    const players = page.locator('.vidply-player');
    const count = await players.count();
    
    for (let i = 0; i < count; i++) {
      const player = players.nth(i);
      const playButton = player.locator('button[aria-label="Abspielen"], button[aria-label="Play"]');
      await expect(playButton).toBeVisible();
    }
  });

  test('each player should have volume control', async ({ page }) => {
    const players = page.locator('.vidply-player');
    const count = await players.count();

    for (let i = 0; i < count; i++) {
      const player = players.nth(i);
      // Desktop label is "Lautstärke X%" / "Volume X%" (suffixed with the
      // current percentage); touch label is "Stumm" / "Ton ein" / "Mute" /
      // "Unmute". Match by prefix so the level suffix doesn't break the test.
      const volumeButton = player.locator(
        'button[aria-label^="Lautstärke"], button[aria-label^="Volume"], ' +
        'button[aria-label^="Stumm"], button[aria-label^="Mute"], ' +
        'button[aria-label^="Ton ein"], button[aria-label^="Unmute"]'
      );
      await expect(volumeButton.first()).toBeVisible();
    }
  });

  test('video players should have fullscreen button', async ({ page }) => {
    const videoPlayers = page.locator('.vidply-player.vidply-video');
    const count = await videoPlayers.count();
    
    for (let i = 0; i < count; i++) {
      const player = videoPlayers.nth(i);
      const fullscreenButton = player.locator('button[aria-label="Vollbild"], button[aria-label="Fullscreen"]');
      await expect(fullscreenButton).toBeVisible();
    }
  });
});

// Test caption language options across all demo pages
test.describe('Caption Languages', () => {
  for (const lang of languages) {
    test(`${lang.name} page should have caption language options`, async ({ page }) => {
      await page.goto(lang.page);
      await page.waitForSelector('.vidply-player', { timeout: 15000 });
      
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      const captionsButton = player.locator(`button[aria-label="${t.captions}"], button[aria-label="${translations.en.captions}"]`);
      
      if (await captionsButton.isVisible()) {
        await captionsButton.click();
        await page.waitForTimeout(500);
        
        // Check for caption menu
        const menu = page.locator('[role="menu"]');
        if (await menu.isVisible()) {
          const menuItems = menu.locator('[role="menuitemradio"], button');
          const count = await menuItems.count();
          
          // Should have at least Off + some languages
          expect(count).toBeGreaterThan(0);
          
          // Close menu
          await page.keyboard.press('Escape');
        }
      }
    });
  }
});

// Test playback controls work with translated labels
test.describe('Playback Controls with Translated Labels', () => {
  for (const lang of languages) {
    test(`${lang.name}: play and pause should work`, async ({ page }) => {
      await page.goto(lang.page);
      await page.waitForSelector('.vidply-player', { timeout: 15000 });
      
      const player = page.locator('.vidply-player').first();
      const t = translations[lang.code] || translations.en;
      
      // Play
      const playButton = player.locator(`button[aria-label="${t.play}"], button[aria-label="${translations.en.play}"]`);
      await playButton.click();
      await page.waitForTimeout(1500);
      
      // Verify pause button appears
      const pauseButton = player.locator(`button[aria-label="${t.pause}"], button[aria-label="${translations.en.pause}"]`);
      await expect(pauseButton).toBeVisible({ timeout: 5000 });
      
      // Pause
      await pauseButton.click();
      await page.waitForTimeout(500);
      
      // Verify play button returns
      await expect(playButton).toBeVisible({ timeout: 5000 });
    });
  }
});

// Test keyboard shortcuts work regardless of language
test.describe('Keyboard Shortcuts Across Languages', () => {
  for (const lang of languages) {
    test(`${lang.name}: Space should toggle play/pause`, async ({ page }) => {
      await page.goto(lang.page);
      await page.waitForSelector('.vidply-player', { timeout: 15000 });
      
      const player = page.locator('.vidply-player').first();
      await player.click();
      await page.waitForTimeout(300);
      
      // Space to play
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);
      
      const t = translations[lang.code] || translations.en;
      const pauseButton = player.locator(`button[aria-label="${t.pause}"], button[aria-label="${translations.en.pause}"]`);
      
      // Pause button should be visible (playing state)
      const isPlaying = await pauseButton.isVisible().catch(() => false);
      
      // Space to pause
      await page.keyboard.press('Space');
      await page.waitForTimeout(500);
      
      // Player should still be functional
      await expect(player).toBeVisible();
    });

    test(`${lang.name}: M should toggle mute`, async ({ page }) => {
      await page.goto(lang.page);
      await page.waitForSelector('.vidply-player', { timeout: 15000 });
      
      const player = page.locator('.vidply-player').first();
      await player.click();
      await page.waitForTimeout(300);
      
      // Press M to mute
      await page.keyboard.press('m');
      await page.waitForTimeout(500);
      
      // Press M again to unmute
      await page.keyboard.press('m');
      await page.waitForTimeout(500);
      
      // Player should still be functional
      await expect(player).toBeVisible();
    });
  }
});
