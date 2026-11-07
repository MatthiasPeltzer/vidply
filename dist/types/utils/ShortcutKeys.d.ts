/**
 * Turn a raw KeyboardEvent.key value into a human-readable label. Arrow
 * keys become universally understood glyphs; the space bar and single
 * letters are normalised for legibility.
 */
export declare function formatShortcutKey(key: string): string;
/** Value for `aria-keyshortcuts`, which expects key names rather than glyphs. */
export declare function ariaShortcutKey(key: string): string;
//# sourceMappingURL=ShortcutKeys.d.ts.map