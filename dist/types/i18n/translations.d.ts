export type TranslationData = Record<string, unknown>;
export declare function getBaseTranslations(): Record<string, TranslationData>;
export declare function getBuiltInLanguageLoaders(): Record<string, () => Promise<Record<string, TranslationData>>>;
export declare function loadBuiltInTranslation(lang: string): Promise<TranslationData | null>;
export declare const translations: Record<string, TranslationData>;
//# sourceMappingURL=translations.d.ts.map