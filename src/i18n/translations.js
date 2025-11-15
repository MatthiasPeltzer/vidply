/**
 * Translation strings for VidPly
 * This file loads all built-in language files
 */

import { en } from './languages/en.js';
import { de } from './languages/de.js';
import { es } from './languages/es.js';
import { fr } from './languages/fr.js';
import { ja } from './languages/ja.js';

/**
 * Load all built-in translations
 * @returns {Object} Object containing all built-in language translations
 */
export function loadBuiltInTranslations() {
  return {
    en,
    de,
    es,
    fr,
    ja
  };
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use loadBuiltInTranslations() instead
 */
export const translations = loadBuiltInTranslations();

