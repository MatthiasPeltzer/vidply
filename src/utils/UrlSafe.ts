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
export function sanitizePosterUrl(input: unknown): string | null {
  if (typeof input !== 'string' || input.length === 0 || input.length > 4096) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Whitespace, quotes, angle brackets and backslashes would let a
  // crafted value break out of a CSS declaration or HTML attribute.
  if (/[\s"'<>\\]/.test(trimmed)) return null;

  if (trimmed.startsWith('/') || trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed, typeof window !== 'undefined' ? window.location.href : 'http://localhost/');
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      return url.href;
    }
    if (url.protocol === 'data:' && /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);/i.test(trimmed)) {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * CSS-escape an already-validated URL for safe interpolation into a
 * `url(...)` value. Defense in depth alongside {@link sanitizePosterUrl}:
 * even if the URL slipped through, the CSS parser cannot leave the
 * `url()` context because `"`, `(`, `)` and `\` are all escaped.
 */
export function cssEscapeUrl(url: string): string {
  return url.replace(/["()\\]/g, (m) => `\\${m}`);
}

/**
 * Convenience wrapper: given an unknown input, return a CSS
 * `url("escaped-safe-url")` string ready to assign to
 * `element.style.backgroundImage`, or `null` if the input is unsafe
 * (so the caller can leave the current background untouched instead
 * of clearing it).
 */
export function toCssBackgroundImage(input: unknown): string | null {
  const safe = sanitizePosterUrl(input);
  if (!safe) return null;
  return `url("${cssEscapeUrl(safe)}")`;
}
