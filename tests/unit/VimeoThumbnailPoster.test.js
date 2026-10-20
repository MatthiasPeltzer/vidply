import { describe, it, expect, vi, afterEach } from 'vitest';
import { resolveVimeoThumbnailPosterUrl } from '../../src/utils/VimeoThumbnailPoster.js';

describe('VimeoThumbnailPoster', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns thumbnail_url from oEmbed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ thumbnail_url: 'https://i.vimeocdn.com/video/123.jpg' })
    }));

    await expect(resolveVimeoThumbnailPosterUrl('960454227')).resolves.toBe(
      'https://i.vimeocdn.com/video/123.jpg'
    );
  });

  it('returns null when oEmbed fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

    await expect(resolveVimeoThumbnailPosterUrl('960454227')).resolves.toBeNull();
  });
});
