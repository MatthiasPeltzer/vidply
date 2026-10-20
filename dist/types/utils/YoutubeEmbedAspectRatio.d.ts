import type { Player } from '../core/Player.js';
/**
 * YouTube’s IFrame API does not expose video width/height (unlike Vimeo).
 * Thumbnail pixel size is the best no-key proxy for presentation aspect ratio.
 */
export declare function syncYoutubeEmbedAspectRatio(player: Player, videoId: string | null, host: HTMLDivElement | null): Promise<void>;
//# sourceMappingURL=YoutubeEmbedAspectRatio.d.ts.map