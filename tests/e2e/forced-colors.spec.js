import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const forcedColorsTest = test.extend({
  launchOptions: {
    firefoxUserPrefs: {
      'browser.display.document_color_use': 2,
      'browser.display.use_system_colors': false,
      'browser.display.foreground_color': '#ffffff',
      'browser.display.background_color': '#000000',
      'ui.use_standins_for_native_colors': false
    }
  }
});

const stylesheet = fileURLToPath(new URL('../../dist/vidply.min.css', import.meta.url));
const icon = `<span class="vidply-icon" aria-hidden="true">
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
</span>`;

test('normal light-theme icon colors stay unchanged', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setContent(`
    <main class="vidply-player vidply-audio vidply-theme-light">
      <div class="vidply-controls">
        <button class="vidply-button" aria-label="Play">${icon}</button>
      </div>
    </main>
  `);
  await page.addStyleTag({ path: stylesheet });
  const control = page.getByRole('button', { name: 'Play', exact: true });
  await expect(control.locator('path')).toHaveCSS('fill', 'rgb(51, 51, 51)');
  await control.hover();
  await expect(control.locator('path')).toHaveCSS('fill', 'rgb(0, 0, 0)');
});

function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const [red, green, blue] = color.match(/\d+/g).slice(0, 3).map(Number);
    const channels = [red, green, blue].map((value) => {
      const channel = value / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

for (const theme of ['dark', 'light', 'high-contrast']) {
  for (const colorScheme of ['dark', 'light']) {
    forcedColorsTest.describe(`${theme} theme, ${colorScheme} color scheme`, () => {
      forcedColorsTest.use({ forcedColors: 'active', colorScheme });

      forcedColorsTest(
        'icons retain contrast before hover, on hover and on keyboard focus',
        async ({ page, browserName }) => {
          if (browserName === 'firefox') {
            // Use Firefox's real custom dark palette instead of its stand-in emulation colors.
            await page.emulateMedia({ forcedColors: null });
          }
          // Isolate production control markup/CSS from media loading and provider APIs.
          await page.setContent(`
          <main class="vidply-player vidply-audio vidply-theme-${theme}">
            <div class="vidply-controls">
              <button class="vidply-button" aria-label="Play">${icon}</button>
              <a class="vidply-button" href="#provider" aria-label="Open provider">${icon}</a>
              <button class="vidply-button" aria-label="Audio description" aria-pressed="true">
                <span class="vidply-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="5" width="20" height="14" rx="2" fill="currentColor"/>
                    <text x="12" y="14.5" class="vidply-icon-ad-fg">AD</text>
                  </svg>
                </span>
              </button>
            </div>
            <div class="vidply-transcript-header">
              <button class="vidply-icon-button vidply-transcript-close"
                aria-label="Close transcript">${icon}</button>
            </div>
            <div class="vidply-sign-language-header">
              <button class="vidply-sign-language-settings"
                aria-label="Sign language settings">${icon}</button>
            </div>
          </main>
        `);
          await page.addStyleTag({ path: stylesheet });
          expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(
            true
          );

          for (const name of [
            'Play',
            'Open provider',
            'Audio description',
            'Close transcript',
            'Sign language settings'
          ]) {
            const control = page.getByRole(name === 'Open provider' ? 'link' : 'button', {
              name,
              exact: true
            });
            for (const state of ['default', 'hover', 'focus']) {
              if (state === 'hover') {
                await control.hover();
              } else {
                await page.mouse.move(1200, 700);
              }
              if (state === 'focus') {
                await control.focus();
              }
              const colors = await control.locator('svg').evaluate((svg) => {
                const style = getComputedStyle(svg);
                const shape = svg.querySelector('path, rect');
                const text = svg.querySelector('text');
                return {
                  background: style.backgroundColor,
                  foreground: getComputedStyle(shape).fill,
                  text: text ? getComputedStyle(text).fill : null
                };
              });
              expect(colors.background).toBe(
                browserName === 'firefox' || colorScheme === 'dark'
                  ? 'rgb(0, 0, 0)'
                  : 'rgb(255, 255, 255)'
              );
              expect(
                contrastRatio(colors.foreground, colors.background),
                `${name}: ${state} icon contrast`
              ).toBeGreaterThanOrEqual(3);
              if (colors.text) {
                expect(
                  contrastRatio(colors.text, colors.foreground),
                  `${name}: ${state} badge text contrast`
                ).toBeGreaterThanOrEqual(4.5);
              }
              if (state === 'focus') {
                await expect(control).toBeFocused();
                await expect(control).toHaveCSS('outline-style', 'solid');
                await expect(control).toHaveCSS('outline-width', '2px');
                await control.evaluate((element) => element.blur());
              }
            }
          }
        }
      );
    });
  }
}
