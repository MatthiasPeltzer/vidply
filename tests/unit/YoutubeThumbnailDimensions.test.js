import { describe, it, expect, vi, afterEach } from 'vitest';

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
