import { describe, it, expect, vi } from 'vitest';
import { syncVimeoEmbedAspectRatio } from '../../src/utils/VimeoEmbedAspectRatio.js';

describe('VimeoEmbedAspectRatio', () => {
  it('sets embed aspect ratio on the player from Vimeo SDK dimensions', async () => {
    const player = {
      setEmbedAspectRatio: vi.fn()
    };
    const vimeo = {
      getVideoWidth: vi.fn().mockResolvedValue(2560),
      getVideoHeight: vi.fn().mockResolvedValue(1080)
    };

    await syncVimeoEmbedAspectRatio(player, vimeo);

    expect(player.setEmbedAspectRatio).toHaveBeenCalledWith(2560, 1080);
  });

  it('ignores missing SDK dimension methods', async () => {
    const player = { setEmbedAspectRatio: vi.fn() };

    await syncVimeoEmbedAspectRatio(player, {});

    expect(player.setEmbedAspectRatio).not.toHaveBeenCalled();
  });
});
