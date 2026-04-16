import { en } from './languages/en.js';

export type TranslationData = Record<string, unknown>;

const builtInLanguageLoaders: Record<string, () => Promise<Record<string, TranslationData>>> = {
  de: () => import('./languages/de.js') as Promise<Record<string, TranslationData>>,
  es: () => import('./languages/es.js') as Promise<Record<string, TranslationData>>,
  fr: () => import('./languages/fr.js') as Promise<Record<string, TranslationData>>,
  ja: () => import('./languages/ja.js') as Promise<Record<string, TranslationData>>
};

export function getBaseTranslations(): Record<string, TranslationData> {
  return { en };
}

export function getBuiltInLanguageLoaders(): Record<string, () => Promise<Record<string, TranslationData>>> {
  return builtInLanguageLoaders;
}

export async function loadBuiltInTranslation(lang: string): Promise<TranslationData | null> {
  const loader = builtInLanguageLoaders[lang];
  if (!loader) return null;

  const module = await loader();
  return (module[lang] || (module as Record<string, unknown>).default || null) as TranslationData | null;
}

export const translations = getBaseTranslations();
