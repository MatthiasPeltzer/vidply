import { getBaseTranslations, getBuiltInLanguageLoaders, loadBuiltInTranslation, type TranslationData } from './translations.js';

declare global {
  interface Window {
    jsyaml?: { load(input: string): unknown };
  }
}

class I18n {
  currentLanguage: string;
  translations: Record<string, TranslationData>;
  private loadingPromises: Map<string, Promise<unknown>>;
  private builtInLanguageLoaders: Record<string, () => Promise<Record<string, TranslationData>>>;

  constructor() {
    this.currentLanguage = 'en';
    this.translations = getBaseTranslations();
    this.loadingPromises = new Map();
    this.builtInLanguageLoaders = getBuiltInLanguageLoaders();
  }

  setLanguage(lang: string): void {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
    } else {
      console.warn(`Language "${lang}" not found, falling back to English`);
      this.currentLanguage = 'en';
    }
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  async ensureLanguage(lang: string): Promise<string | null> {
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

  t(key: string, replacements: Record<string, string | number> = {}): string {
    const keys = key.split('.');
    let value: unknown = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[k];
      } else {
        value = this.translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in (value as Record<string, unknown>)) {
            value = (value as Record<string, unknown>)[fallbackKey];
          } else {
            return key;
          }
        }
        break;
      }
    }

    if (typeof value === 'string') {
      let result = value;
      Object.entries(replacements).forEach(([placeholder, replacement]) => {
        result = result.replace(new RegExp(`\\{${placeholder}\\}`, 'g'), String(replacement));
      });
      return result;
    }

    return typeof value === 'string' ? value : key;
  }

  addTranslation(lang: string, newTranslations: TranslationData): void {
    if (!this.translations[lang]) {
      this.translations[lang] = {};
    }
    Object.assign(this.translations[lang], newTranslations);
  }

  async loadLanguageFromUrl(langCode: string, url: string): Promise<unknown> {
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
        let loadedTranslations: TranslationData;

        const buffer = await response.arrayBuffer();
        const utf8Text = new TextDecoder('utf-8').decode(buffer);

        if (contentType.includes('application/json') || url.endsWith('.json')) {
          loadedTranslations = JSON.parse(utf8Text);
        } else if (
          contentType.includes('text/yaml') ||
          contentType.includes('application/x-yaml') ||
          url.endsWith('.yaml') ||
          url.endsWith('.yml')
        ) {
          try {
            loadedTranslations = JSON.parse(utf8Text);
          } catch {
            if (typeof window !== 'undefined' && window.jsyaml) {
              loadedTranslations = window.jsyaml.load(utf8Text) as TranslationData;
            } else {
              console.warn('YAML parsing requires js-yaml library. Please include it or use JSON format.');
              throw new Error('YAML parsing not available. Please use JSON format or include js-yaml library.');
            }
          }
        } else {
          loadedTranslations = JSON.parse(utf8Text);
        }

        this.addTranslation(langCode, loadedTranslations);
        return loadedTranslations;
      } catch (error) {
        console.error(`Error loading language file from ${url}:`, error);
        throw error;
      } finally {
        this.loadingPromises.delete(url);
      }
    })();

    this.loadingPromises.set(url, loadPromise);
    return loadPromise;
  }

  async loadLanguagesFromUrls(languageMap: Record<string, string>): Promise<void> {
    const promises = Object.entries(languageMap).map(([langCode, url]) =>
      this.loadLanguageFromUrl(langCode, url)
    );
    await Promise.all(promises);
  }
}

export const i18n = new I18n();
