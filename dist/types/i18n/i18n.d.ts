import { type TranslationData } from './translations.js';
declare global {
    interface Window {
        jsyaml?: {
            load(input: string): unknown;
        };
    }
}
declare class I18n {
    currentLanguage: string;
    translations: Record<string, TranslationData>;
    private loadingPromises;
    private builtInLanguageLoaders;
    constructor();
    setLanguage(lang: string): void;
    getLanguage(): string;
    ensureLanguage(lang: string): Promise<string | null>;
    t(key: string, replacements?: Record<string, string | number>): string;
    addTranslation(lang: string, newTranslations: TranslationData): void;
    /**
     * Load a translation file from a URL. Bounded by an `AbortSignal.timeout`
     * (default 8s) plus an optional caller-supplied signal — typically the
     * Player's lifecycle controller — so a torn-down player does not keep
     * the request alive.
     */
    loadLanguageFromUrl(langCode: string, url: string, options?: {
        signal?: AbortSignal;
        timeoutMs?: number;
    }): Promise<unknown>;
    loadLanguagesFromUrls(languageMap: Record<string, string>, options?: {
        signal?: AbortSignal;
        timeoutMs?: number;
    }): Promise<void>;
}
export declare const i18n: I18n;
export {};
//# sourceMappingURL=i18n.d.ts.map