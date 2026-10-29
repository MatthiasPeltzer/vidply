import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  resolveYoutubeThumbnailPosterUrl,
  youtubeThumbnailUrl
} from '../../src/utils/YoutubeThumbnailPoster.js';

describe('YoutubeThumbnailPoster', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds i.ytimg.com URLs per variant', () => {
    expect(youtubeThumbnailUrl('w-JOJl7Qs6U', 'maxres')).toBe(
      'https://i.ytimg.com/vi/w-JOJl7Qs6U/maxresdefault.jpg'
    );
    expect(youtubeThumbnailUrl('abc', 'hq')).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
  });

  it('returns the first thumbnail that loads with sufficient width', async () => {
    vi.stubGlobal(
      'Image',
      class {
        set src(url) {
          queueMicrotask(() => {
            if (url.includes('maxres')) {
              this.naturalWidth = 1280;
              this.onload?.();
            } else {
              this.onerror?.();
            }
          });
        }
      }
    );

    await expect(resolveYoutubeThumbnailPosterUrl('w-JOJl7Qs6U')).resolves.toBe(
      'https://i.ytimg.com/vi/w-JOJl7Qs6U/maxresdefault.jpg'
    );
  });

  it('falls back to hq when maxres and sd are too small', async () => {
    vi.stubGlobal(
      'Image',
      class {
        set src(url) {
          queueMicrotask(() => {
            if (url.includes('hqdefault')) {
              this.naturalWidth = 480;
              this.onload?.();
            } else {
              this.naturalWidth = 120;
              this.onload?.();
            }
          });
        }
      }
    );

    await expect(resolveYoutubeThumbnailPosterUrl('testId')).resolves.toBe(
      'https://i.ytimg.com/vi/testId/hqdefault.jpg'
    );
  });
});
