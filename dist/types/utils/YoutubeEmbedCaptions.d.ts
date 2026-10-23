import type { EmbedCaptionTrack } from '../types/renderer.js';
/** Raw entry from `player.getOption('captions', 'tracklist')` (undocumented IFrame API). */
export interface YoutubeCaptionTrackRaw {
    languageCode?: string;
    languageName?: string;
    displayName?: string;
    kind?: string;
    name?: string;
    vssId?: string;
    vss_id?: string;
}
export interface YoutubeCaptionTrackEntry extends EmbedCaptionTrack {
    raw: YoutubeCaptionTrackRaw;
}
export declare function normalizeYoutubeVssId(track: YoutubeCaptionTrackRaw): string;
export declare function isYoutubeAsrTrack(track: YoutubeCaptionTrackRaw): boolean;
/**
 * Prefer uploaded captions per language; fall back to ASR with an explicit label.
 */
export declare function filterYoutubeCaptionTracklist(rawList: unknown): YoutubeCaptionTrackEntry[];
export declare function readYoutubeCaptionTracklist(youtube: {
    getOption?(module: string, option: string): unknown;
}): YoutubeCaptionTrackRaw[] | null;
/** Returns true when YouTube accepts programmatic track selection for this entry. */
export declare function probeYoutubeCaptionTrack(youtube: {
    setOption?(module: string, option: string, value: unknown): void;
}, track: YoutubeCaptionTrackRaw): boolean;
//# sourceMappingURL=YoutubeEmbedCaptions.d.ts.map