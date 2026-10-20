import { describe, it, expect, vi, afterEach } from 'vitest';
import { syncYoutubeEmbedAspectRatio } from '../../src/utils/YoutubeEmbedAspectRatio.js';

vi.mock('../../src/utils/YoutubeThumbnailPoster.js', () => ({
  resolveYoutubeThumbnailDimensions: vi.fn(),
  youtubeChromelessCropRecommended: vi.fn((w, h) => w / h > 1.55 && w / h < 1.85)
}));

import { resolveYoutubeThumbnailDimensions } from '../../src/utils/YoutubeThumbnailPoster.js';

describe('YoutubeEmbedAspectRatio', () => {
  afterEach(() => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockReset();
  });

  it('sets aspect ratio and enables crop for 16:9 thumbnails', async () => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockResolvedValue({ width: 1920, height: 1080 });
    const player = {
      options: { classPrefix: 'vidply' },
      setEmbedAspectRatio: vi.fn()
    };
    const host = document.createElement('div');

    await syncYoutubeEmbedAspectRatio(player, 'abc123', host);

    expect(player.setEmbedAspectRatio).toHaveBeenCalledWith(1920, 1080);
    expect(host.classList.contains('vidply-youtube-chromeless-crop')).toBe(true);
  });

  it('disables crop for portrait (Shorts-style) thumbnails', async () => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockResolvedValue({ width: 1080, height: 1920 });
    const player = {
      options: { classPrefix: 'vidply' },
      setEmbedAspectRatio: vi.fn()
    };
    const host = document.createElement('div');
    host.classList.add('vidply-youtube-chromeless-crop');

    await syncYoutubeEmbedAspectRatio(player, 'shorts', host);

    expect(host.classList.contains('vidply-youtube-chromeless-crop')).toBe(false);
  });

  it('does nothing when thumbnail dimensions are unavailable', async () => {
    vi.mocked(resolveYoutubeThumbnailDimensions).mockResolvedValue(null);
    const player = {
      options: { classPrefix: 'vidply' },
      setEmbedAspectRatio: vi.fn()
    };
    const host = document.createElement('div');

    await syncYoutubeEmbedAspectRatio(player, 'abc123', host);

    expect(player.setEmbedAspectRatio).not.toHaveBeenCalled();
    expect(host.classList.contains('vidply-youtube-chromeless-crop')).toBe(false);
  });
});
