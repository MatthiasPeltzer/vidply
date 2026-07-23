/**
 * Unit Tests: UrlSafe (poster/artwork URL allow-list + CSS escaping)
 *
 * Poster and artwork URLs flow from attacker-influenced data (playlist
 * manifests, data-* attributes) into `<video>.poster` and CSS
 * `url(...)` values. These tests lock the allow-list and the CSS
 * escaping so a regression that reintroduces a `url()` break-out or a
 * dangerous scheme fails loudly.
 */

import { describe, it, expect } from 'vitest';
import { sanitizePosterUrl, cssEscapeUrl, toCssBackgroundImage } from '../../src/utils/UrlSafe.js';

describe('UrlSafe', () => {
  describe('sanitizePosterUrl', () => {
    it('accepts root-relative and relative paths', () => {
      expect(sanitizePosterUrl('/media/poster.jpg')).toBe('/media/poster.jpg');
      expect(sanitizePosterUrl('./poster.jpg')).toBe('./poster.jpg');
      expect(sanitizePosterUrl('../poster.jpg')).toBe('../poster.jpg');
    });

    it('accepts http(s) absolute URLs', () => {
      expect(sanitizePosterUrl('https://example.com/p.jpg')).toContain('https://example.com/p.jpg');
      expect(sanitizePosterUrl('http://example.com/p.jpg')).toContain('http://example.com/p.jpg');
    });

    it('accepts data:image URLs', () => {
      const png = 'data:image/png;base64,AAAA';
      expect(sanitizePosterUrl(png)).toBe(png);
    });

    it('rejects non-image data URLs', () => {
      expect(sanitizePosterUrl('data:text/html;base64,AAAA')).toBeNull();
    });

    it('rejects the javascript: scheme', () => {
      expect(sanitizePosterUrl('javascript:alert(1)')).toBeNull();
    });

    it('rejects values containing quotes, angle brackets, backslashes or whitespace', () => {
      expect(sanitizePosterUrl('/a"),url("//evil')).toBeNull();
      expect(sanitizePosterUrl('/a<b>c')).toBeNull();
      expect(sanitizePosterUrl('/a\\b')).toBeNull();
      expect(sanitizePosterUrl('/a b')).toBeNull();
      expect(sanitizePosterUrl("/a'b")).toBeNull();
    });

    it('rejects non-strings, empty, and over-long input', () => {
      expect(sanitizePosterUrl(undefined)).toBeNull();
      expect(sanitizePosterUrl(null)).toBeNull();
      expect(sanitizePosterUrl(123)).toBeNull();
      expect(sanitizePosterUrl('')).toBeNull();
      expect(sanitizePosterUrl('/' + 'a'.repeat(4100))).toBeNull();
    });
  });

  describe('cssEscapeUrl', () => {
    it('escapes double-quotes, parentheses and backslashes', () => {
      expect(cssEscapeUrl('a"b(c)d\\e')).toBe('a\\"b\\(c\\)d\\\\e');
    });

    it('leaves safe characters untouched', () => {
      expect(cssEscapeUrl('/media/poster.jpg')).toBe('/media/poster.jpg');
    });
  });

  describe('toCssBackgroundImage', () => {
    it('wraps a safe URL in an escaped url() value', () => {
      expect(toCssBackgroundImage('/media/poster.jpg')).toBe('url("/media/poster.jpg")');
    });

    it('returns null for unsafe input so the caller can skip it', () => {
      expect(toCssBackgroundImage('/a"),url("//evil')).toBeNull();
      expect(toCssBackgroundImage('javascript:alert(1)')).toBeNull();
      expect(toCssBackgroundImage(undefined)).toBeNull();
    });
  });
});
