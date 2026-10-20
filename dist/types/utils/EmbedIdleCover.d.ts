import type { Player } from '../core/Player.js';
export declare function applyPosterImageToVideoWrapper(player: Player, resolvedUrl: string): void;
/** Apply `poster` / options poster on the video wrapper for chromeless embed idle state. */
export declare function applyChromelessIdlePosterFromElement(player: Player): void;
/** Poster + large play overlay until playback starts (YouTube/Vimeo chromeless). */
export declare function setEmbedIdleCover(player: Player, active: boolean): void;
export declare function clearEmbedIdleCover(player: Player): void;
//# sourceMappingURL=EmbedIdleCover.d.ts.map