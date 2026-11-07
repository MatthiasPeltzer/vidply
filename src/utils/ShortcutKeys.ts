import { i18n } from '../i18n/i18n.js';

/**
 * Turn a raw KeyboardEvent.key value into a human-readable label. Arrow
 * keys become universally understood glyphs; the space bar and single
 * letters are normalised for legibility.
 */
export function formatShortcutKey(key: string): string {
  switch (key) {
    case ' ':
      return i18n.t('help.keys.space');
    case 'ArrowUp':
      return '\u2191';
    case 'ArrowDown':
      return '\u2193';
    case 'ArrowLeft':
      return '\u2190';
    case 'ArrowRight':
      return '\u2192';
    case 'Escape':
      return 'Esc';
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

/** Value for `aria-keyshortcuts`, which expects key names rather than glyphs. */
export function ariaShortcutKey(key: string): string {
  if (key === ' ') return 'Space';
  return key.length === 1 ? key.toUpperCase() : key;
}
