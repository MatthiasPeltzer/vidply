import type { Player } from '../core/Player.js';

/** Apply Vimeo’s native width/height to `--vidply-embed-aspect-ratio` on the video wrapper. */
export async function syncVimeoEmbedAspectRatio(
  player: Player,
  vimeo: VimeoPlayer
): Promise<void> {
  if (typeof vimeo.getVideoWidth !== 'function' || typeof vimeo.getVideoHeight !== 'function') {
    return;
  }

  try {
    const [width, height] = await Promise.all([
      vimeo.getVideoWidth(),
      vimeo.getVideoHeight()
    ]);
    player.setEmbedAspectRatio(width, height);
  } catch {
    // Dimensions are optional; 16:9 CSS fallback remains.
  }
}
