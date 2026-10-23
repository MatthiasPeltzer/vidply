import { describe, it, expect, vi, afterEach } from 'vitest';
import { syncYoutubeEmbedAspectRatio } from '../../src/utils/YoutubeEmbedAspectRatio.js';

vi.mock('../../src/utils/YoutubeThumbnailPoster.js', () => ({
  resolveYoutubeThumbnailDimensions: vi.fn()
}));

import { resolveYoutubeThumbnailDimensions } from '../../src/utils/YoutubeThumbnailPoster.js';

describe('YoutubeEmbedAspectRatio', () => {
  afterEach(() => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockReset();
  });

  it('sets aspect ratio from 16:9 thumbnails', async () => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockResolvedValue({ width: 1920, height: 1080 });
    const player = {
      options: { classPrefix: 'vidply' },
      setEmbedAspectRatio: vi.fn()
    };

    await syncYoutubeEmbedAspectRatio(player, 'abc123');

    expect(player.setEmbedAspectRatio).toHaveBeenCalledWith(1920, 1080);
  });

  it('sets aspect ratio from portrait (Shorts-style) thumbnails', async () => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockResolvedValue({ width: 1080, height: 1920 });
    const player = {
      options: { classPrefix: 'vidply' },
      setEmbedAspectRatio: vi.fn()
    };

    await syncYoutubeEmbedAspectRatio(player, 'shorts');

    expect(player.setEmbedAspectRatio).toHaveBeenCalledWith(1080, 1920);
  });

  it('does nothing when thumbnail dimensions are unavailable', async () => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockResolvedValue(null);
    const player = {
      options: { classPrefix: 'vidply' },
      setEmbedAspectRatio: vi.fn()
    };

    await syncYoutubeEmbedAspectRatio(player, 'abc123');

    expect(player.setEmbedAspectRatio).not.toHaveBeenCalled();
  });
});
