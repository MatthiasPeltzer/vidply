import { describe, it, expect } from 'vitest';
import { resolveEmbedProviderWatchUrl } from '../../src/utils/EmbedProviderLinks.js';

describe('EmbedProviderLinks', () => {
  it('builds a YouTube watch URL from youtu.be links', () => {
    expect(resolveEmbedProviderWatchUrl('https://youtu.be/w-JOJl7Qs6U')).toBe(
      'https://www.youtube.com/watch?v=w-JOJl7Qs6U'
    );
  });

  it('builds a Vimeo watch URL from player URLs', () => {
    expect(resolveEmbedProviderWatchUrl('https://vimeo.com/960454227')).toBe(
      'https://vimeo.com/960454227'
    );
  });

  it('unwraps SoundCloud widget URLs', () => {
    const widget =
      'https://w.soundcloud.com/player/?url=' +
      encodeURIComponent('https://soundcloud.com/artist/track');
    expect(resolveEmbedProviderWatchUrl(widget)).toBe('https://soundcloud.com/artist/track');
  });

  it('rejects non-embed sources', () => {
    expect(resolveEmbedProviderWatchUrl('https://example.com/video.mp4')).toBe(null);
  });
});
