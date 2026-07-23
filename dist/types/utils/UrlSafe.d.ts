/**
 * URL sanitisation helpers for values that flow into `<video>.poster`
 * attributes or CSS `url(...)` declarations.
 *
 * Both helpers used to live as file-local functions inside `Player.ts`,
 * which meant `PlaylistManager` interpolated raw `track.poster` values
 * into `backgroundImage` without any validation. They now live here so
 * every consumer of untrusted poster/artwork URLs can share the same
 * allow-list + CSS escape.
 */
/**
 * Validate a poster/artwork URL before interpolating it into a CSS
 * `url(...)` value or assigning it to `<video>.poster`. Allows `https:`,
 * `http:`, `data:image/<png|jpeg|webp|gif|svg+xml>;...`, root-relative
 * paths starting with `/`, and same-origin relative paths.
 *
 * Returns `null` for anything suspicious — callers must check for null
 * and fall back to a safe default (e.g. skip setting `backgroundImage`).
 */
export declare function sanitizePosterUrl(input: unknown): string | null;
/**
 * CSS-escape an already-validated URL for safe interpolation into a
 * `url(...)` value. Defense in depth alongside {@link sanitizePosterUrl}:
 * even if the URL slipped through, the CSS parser cannot leave the
 * `url()` context because `"`, `(`, `)` and `\` are all escaped.
 */
export declare function cssEscapeUrl(url: string): string;
/**
 * Convenience wrapper: given an unknown input, return a CSS
 * `url("escaped-safe-url")` string ready to assign to
 * `element.style.backgroundImage`, or `null` if the input is unsafe
 * (so the caller can leave the current background untouched instead
 * of clearing it).
 */
export declare function toCssBackgroundImage(input: unknown): string | null;
//# sourceMappingURL=UrlSafe.d.ts.map