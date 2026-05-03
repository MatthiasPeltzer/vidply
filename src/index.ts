/**
 * VidPly - Universal Video Player
 * Main Entry Point
 */

import { Player } from './core/Player.js';
import { PlaylistManager } from './features/PlaylistManager.js';
import type { PlayerOptions } from './types/options.js';

export type LazyHandle = { cancel: () => void } | null;

interface PendingLazyEntry {
  observer: IntersectionObserver;
  options: Partial<PlayerOptions>;
}

const pendingPlayers = new Map<HTMLElement, PendingLazyEntry>();

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

/**
 * Filter `__proto__` / `constructor` / `prototype` keys from an attacker-
 * influenced JSON object before merging it into the player options. This
 * avoids prototype-pollution turning a malformed `data-vidply-options`
 * attribute into a global gadget.
 */
function sanitizeOptionsObject(input: unknown): Partial<PlayerOptions> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }
  const out: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    out[key] = value;
  }
  return out as Partial<PlayerOptions>;
}

/**
 * Parse a `data-vidply-options` JSON string. Robust against malformed input
 * — a single broken attribute on one element no longer aborts the auto-init
 * loop for every other player on the page.
 */
function parseInlineOptions(element: HTMLElement): Partial<PlayerOptions> {
  const raw = element.dataset.vidplyOptions;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return sanitizeOptionsObject(parsed);
  } catch (err) {
    console.warn('[VidPly] Ignored malformed data-vidply-options:', err);
    return {};
  }
}

function initializePlayers(): void {
  const elements = document.querySelectorAll<HTMLElement>('[data-vidply]');

  elements.forEach((element) => {
    const options = parseInlineOptions(element);
    const dataOptions = parseDataAttributes(element.dataset);
    const mergedOptions: Partial<PlayerOptions> = { ...dataOptions, ...options };

    const lazyInit =
      element.dataset.vidplyLazy !== 'false' && mergedOptions.lazyInit !== false;
    const lazyMargin =
      element.dataset.vidplyLazyMargin || (mergedOptions.lazyMargin as string) || '500px';

    if (lazyInit && 'IntersectionObserver' in window) {
      observeForLazyInit(element, mergedOptions, lazyMargin);
    } else {
      new Player(element, mergedOptions);
    }
  });
}

function observeForLazyInit(
  element: HTMLElement,
  options: Partial<PlayerOptions>,
  margin: string
): void {
  const rect = element.getBoundingClientRect();
  if (rect.height < 20) {
    new Player(element, options);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          pendingPlayers.delete(entry.target as HTMLElement);
          new Player(entry.target as HTMLElement, options);
        }
      });
    },
    { rootMargin: margin, threshold: 0 }
  );

  observer.observe(element);
  pendingPlayers.set(element, { observer, options });
}

function cancelLazyInit(element: HTMLElement): void {
  const pending = pendingPlayers.get(element);
  if (pending) {
    pending.observer.unobserve(element);
    pendingPlayers.delete(element);
  }
}

/**
 * Manually trigger lazy observation for an element. Real, typed static
 * method on the Player class.
 */
Player.observeLazy = function observeLazy(
  selector: string | HTMLElement,
  options: Record<string, unknown> = {},
  margin = '200px'
): LazyHandle {
  const element =
    typeof selector === 'string'
      ? (document.querySelector(selector) as HTMLElement | null)
      : selector;

  if (!element) {
    console.warn('VidPly: Element not found for lazy observation');
    return null;
  }

  if ('IntersectionObserver' in window) {
    observeForLazyInit(element, options as Partial<PlayerOptions>, margin);
    return {
      cancel: () => cancelLazyInit(element)
    };
  }
  new Player(element, options as Partial<PlayerOptions>);
  return null;
};

function parseDataAttributes(dataset: DOMStringMap): Partial<PlayerOptions> {
  const options: Record<string, unknown> = Object.create(null);

  const attributeMap: Record<string, keyof PlayerOptions> = {
    signLanguageSrc: 'signLanguageSrc',
    signLanguageButton: 'signLanguageButton',
    signLanguagePosition: 'signLanguagePosition',
    signLanguageDisplayMode: 'signLanguageDisplayMode',
    audioDescriptionSrc: 'audioDescriptionSrc',
    audioDescriptionButton: 'audioDescriptionButton',
    autoplay: 'autoplay',
    loop: 'loop',
    muted: 'muted',
    controls: 'controls',
    poster: 'poster',
    width: 'width',
    height: 'height',
    language: 'language',
    captions: 'captions',
    captionsDefault: 'captionsDefault',
    transcript: 'transcript',
    transcriptButton: 'transcriptButton',
    keyboard: 'keyboard',
    responsive: 'responsive',
    pipButton: 'pipButton',
    fullscreenButton: 'fullscreenButton',
    floating: 'floating',
    floatingPosition: 'floatingPosition',
    floatingMinViewportWidth: 'floatingMinViewportWidth',
    lazyInit: 'lazyInit',
    lazyMargin: 'lazyMargin',
    theme: 'theme'
  };

  for (const [dataKey, optionKey] of Object.entries(attributeMap)) {
    if (FORBIDDEN_KEYS.has(optionKey as string)) continue;
    const value = dataset[dataKey];
    if (value === undefined) continue;
    if (value === 'true') {
      options[optionKey] = true;
    } else if (value === 'false') {
      options[optionKey] = false;
    } else if (value !== '' && !Number.isNaN(Number(value))) {
      options[optionKey] = Number(value);
    } else {
      options[optionKey] = value;
    }
  }

  const signLanguageSources: Record<string, string> = Object.create(null);
  for (const key of Object.keys(dataset)) {
    if (key.startsWith('signLanguageSrc') && key !== 'signLanguageSrc') {
      const langMatch = key.match(/^signLanguageSrc([A-Z][a-z]*)$/);
      if (langMatch) {
        const langCode = langMatch[1].toLowerCase();
        const value = dataset[key];
        if (value !== undefined) {
          signLanguageSources[langCode] = value;
        }
      }
    }
  }

  if (Object.keys(signLanguageSources).length > 0) {
    options.signLanguageSources = signLanguageSources;
    if (dataset.signLanguageSrc && !options.signLanguageSrc) {
      options.signLanguageSrc = dataset.signLanguageSrc;
    }
  }

  if (dataset.vidplyLanguageFiles) {
    try {
      const parsed = JSON.parse(dataset.vidplyLanguageFiles);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        options.languageFiles = sanitizeOptionsObject(parsed) as Record<string, string>;
      }
    } catch (e) {
      console.warn('Invalid JSON in data-vidply-language-files:', e);
    }
  }

  if (dataset.vidplyLanguageFile) {
    try {
      const parsed = JSON.parse(dataset.vidplyLanguageFile);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        options.languageFiles = sanitizeOptionsObject(parsed) as Record<string, string>;
      }
    } catch {
      if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
        options.languageFile = dataset.vidplyLanguageFileCode;
        options.languageFileUrl = dataset.vidplyLanguageFileUrl;
      }
    }
  } else if (dataset.vidplyLanguageFileCode && dataset.vidplyLanguageFileUrl) {
    options.languageFile = dataset.vidplyLanguageFileCode;
    options.languageFileUrl = dataset.vidplyLanguageFileUrl;
  }

  return options as Partial<PlayerOptions>;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePlayers);
} else {
  initializePlayers();
}

export { Player, PlaylistManager };
export type { PlayerOptions } from './types/options.js';
export type {
  PlayerEventMap,
  PlaylistTrack,
  FloatingChangeDetail
} from './types/events.js';
export type { PlayerState } from './types/state.js';
export type { Renderer, QualityLevel } from './types/renderer.js';
export default Player;
