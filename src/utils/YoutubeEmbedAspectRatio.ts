import type { Player } from '../core/Player.js';
import { resolveYoutubeThumbnailDimensions } from './YoutubeThumbnailPoster.js';

/**
 * YouTube’s IFrame API does not expose video width/height (unlike Vimeo).
 * Thumbnail pixel size is the best no-key proxy for presentation aspect ratio.
 */
export async function syncYoutubeEmbedAspectRatio(
  player: Player,
  videoId: string | null
): Promise<void> {
  if (!videoId) {
    return;
  }

  const dimensions = await resolveYoutubeThumbnailDimensions(videoId);
  if (!dimensions) {
    return;
  }

  player.setEmbedAspectRatio(dimensions.width, dimensions.height);
}
