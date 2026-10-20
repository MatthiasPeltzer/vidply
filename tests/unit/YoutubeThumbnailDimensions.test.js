import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  youtubeChromelessCropRecommended
} from '../../src/utils/YoutubeThumbnailPoster.js';

describe('youtubeChromelessCropRecommended', () => {
  it('recommends crop near 16:9', () => {
    expect(youtubeChromelessCropRecommended(1920, 1080)).toBe(true);
  });

  it('skips crop for portrait', () => {
    expect(youtubeChromelessCropRecommended(1080, 1920)).toBe(false);
  });
});

describe('resolveYoutubeThumbnailDimensions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns natural dimensions from the loaded thumbnail', async () => {
    const { resolveYoutubeThumbnailDimensions } = await import('../../src/utils/YoutubeThumbnailPoster.js');

    vi.stubGlobal('Image', class {
      set src(value) {
        this.onload?.();
      }
      naturalWidth = 1280;
      naturalHeight = 720;
    });

    const dims = await resolveYoutubeThumbnailDimensions('test-id');
    expect(dims).toEqual({ width: 1280, height: 720 });
  });
});
