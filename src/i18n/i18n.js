/**
 * Internationalization system
 */

import { getBaseTranslations, getBuiltInLanguageLoaders, loadBuiltInTranslation } from './translations.js';

class I18n {
  constructor() {
    this.currentLanguage = 'en';
    this.translations = getBaseTranslations();
    this.loadingPromises = new Map(); // Cache for loading promises
    this.builtInLanguageLoaders = getBuiltInLanguageLoaders();
  }

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language "${lang}" not found, falling back to English`);
      this.currentLanguage = 'en';
    }
  }

  getLanguage() {
    return this.currentLanguage;
  }

  /**
   * Ensure a language is available, loading built-ins on demand.
   * @param {string} lang Language code
   * @returns {Promise<string|null>} Normalized language code if available
   */
  async ensureLanguage(lang) {
    const normalizedLang = (lang || '').toLowerCase();
    if (!normalizedLang) return this.currentLanguage;

    if (this.translations[normalizedLang]) {
      return normalizedLang;
    }

    if (this.loadingPromises.has(normalizedLang)) {
      await this.loadingPromises.get(normalizedLang);
      return this.translations[normalizedLang] ? normalizedLang : null;
    }

    if (!this.builtInLanguageLoaders[normalizedLang]) {
      return null;
    }

    const loadPromise = (async () => {
      try {
        const loaded = await loadBuiltInTranslation(normalizedLang);
        if (loaded) {
          this.translations[normalizedLang] = loaded;
        }
      } catch (error) {
        console.warn(`Language "${normalizedLang}" failed to load:`, error);
      } finally {
        this.loadingPromises.delete(normalizedLang);
      }
    })();

    this.loadingPromises.set(normalizedLang, loadPromise);
    await loadPromise;

    return this.translations[normalizedLang] ? normalizedLang : null;
  }

  t(key, replacements = {}) {
    const keys = key.split('.');
    let value = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        value = this.translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }
    
    // Replace placeholders
    if (typeof value === 'string') {
      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        value = value.replace(new RegExp(`{${placeholder}}`, 'g'), replacement);
      });
    }
    
    return value;
  }

  addTranslation(lang, translations) {
    if (!this.translations[lang]) {
      this.translations[lang] = {};
    }
    Object.assign(this.translations[lang], translations);
  }

  /**
   * Load a language file from a URL (JSON or YAML)
   * @param {string} langCode - Language code (e.g., 'pt', 'it')
   * @param {string} url - URL to the language file (JSON or YAML)
   * @returns {Promise<void>}
   */
  async loadLanguageFromUrl(langCode, url) {
    // Return cached promise if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load language file: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        let translations;

        const buffer = await response.arrayBuffer();
        const utf8Text = new TextDecoder('utf-8').decode(buffer);

        if (contentType.includes('application/json') || url.endsWith('.json')) {
          translations = JSON.parse(utf8Text);
        } else if (contentType.includes('text/yaml') || contentType.includes('application/x-yaml') || url.endsWith('.yaml') || url.endsWith('.yml')) {
          // For YAML, we'll need to parse it
          // Note: This requires a YAML parser library in production
          // For now, we'll try to parse as JSON first, then show a warning
          try {
            // Try JSON first (in case server sends JSON with YAML content-type)
            translations = JSON.parse(utf8Text);
          } catch (e) {
            // If JSON parsing fails, try to use a YAML parser if available
            if (typeof window !== 'undefined' && window.jsyaml) {
              translations = window.jsyaml.load(utf8Text);
            } else {
              console.warn('YAML parsing requires js-yaml library. Please include it or use JSON format.');
              throw new Error('YAML parsing not available. Please use JSON format or include js-yaml library.');
            }
          }
        } else {
          // Try to parse as JSON by default
          translations = JSON.parse(utf8Text);
        }

        this.addTranslation(langCode, translations);
        return translations;
      } catch (error) {
        console.error(`Error loading language file from ${url}:`, error);
        throw error;
      } finally {
        // Remove from cache after loading completes
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Load multiple language files from URLs
   * @param {Object} languageMap - Object mapping language codes to URLs
   * @returns {Promise<void>}
   */
  async loadLanguagesFromUrls(languageMap) {
    const promises = Object.entries(languageMap).map(([langCode, url]) =>
      this.loadLanguageFromUrl(langCode, url)
    );
    await Promise.all(promises);
  }
}

export const i18n = new I18n();

