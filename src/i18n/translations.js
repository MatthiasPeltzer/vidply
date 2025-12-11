/**
 * Translation strings for VidPly
 * Lazily loads built-in language files to keep the base bundle small.
 */

import { en } from './languages/en.js';

const builtInLanguageLoaders = {
  de: () => import('./languages/de.js'),
  es: () => import('./languages/es.js'),
  fr: () => import('./languages/fr.js'),
  ja: () => import('./languages/ja.js')
};

/**
 * Returns the base translations that are always available in the bundle.
 * Currently this is English-only to minimize bundle size.
 */
export function getBaseTranslations() {
  return { en };
}

/**
 * Expose built-in language loaders so they can be loaded on demand.
 */
export function getBuiltInLanguageLoaders() {
  return builtInLanguageLoaders;
}

/**
 * Load a single built-in language asynchronously.
 * @param {string} lang Language code to load
 * @returns {Promise<Object|null>} Loaded translation object or null if unavailable
 */
export async function loadBuiltInTranslation(lang) {
  const loader = builtInLanguageLoaders[lang];
  if (!loader) return null;

  const module = await loader();
  return module[lang] || module.default || null;
}

/**
 * Legacy export for backwards compatibility (keeps API surface stable)
 * Note: Only English is included by default; other languages are loaded on demand.
 */
export const translations = getBaseTranslations();

