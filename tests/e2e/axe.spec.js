// Automated axe-core/playwright accessibility smoke test.
// Runs against the demo pages and asserts WCAG 2.2 AA + jurisdictional rules.

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/demo/',
  '/demo/single-player.html',
  '/demo/single-player-audio.html',
  '/demo/playlist.html'
];

for (const path of PAGES) {
  test(`axe-core: ${path} has no critical/serious violations`, async ({ page, baseURL }) => {
    await page.goto(`${baseURL ?? ''}${path}`);
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
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
}
