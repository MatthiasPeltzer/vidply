/**
 * Caption/Subtitle Manager
 */
import { StorageManager } from '../utils/StorageManager.js';
import type { Player } from '../core/Player.js';
/**
 * Deduplicated subtitle/captions entry shown in the captions menu. Native HLS
 * on Safari can expose the same language as both `SUBTITLES` (WebVTT sidecar)
 * and `CLOSED-CAPTIONS` (inband CEA-608) groups; the duplicates are kept in
 * `alternatives` so we can listen on all of them and use whichever delivers
 * cues first.
 */
export type CaptionTrackEntry = {
    track: TextTrack | null;
    /** Provider embed caption id (Vimeo lang|kind). */
    embedCaptionId?: string | null;
    language: string;
    label: string;
    kind: string;
    index: number;
    isDefault: boolean;
    alternatives: TextTrack[];
};
type CueChangeHandler = () => void;
export declare class CaptionManager {
    player: Player;
    _altCueChangeHandler: CueChangeHandler | null;
    cueChangeHandler: CueChangeHandler | null;
    currentCue: VTTCue | null;
    currentTrack: CaptionTrackEntry | null;
    debouncedPositionCaptions: () => void;
    element: HTMLElement;
    storage: StorageManager;
    tracks: CaptionTrackEntry[];
    constructor(player: Player);
    loadSavedPreferences(): void;
    saveCaptionPreferences(): void;
    init(): void;
    createElement(): void;
    loadTracks(): void;
    private loadEmbedCaptionTracks;
    /**
     * Sync hls.js subtitle rendition to match the given language.
     * Matches by lang, language, or falls back to name/label.
     */
    private _syncHlsSubtitleTrack;
    attachEvents(): void;
    enable(trackIndex?: number): void;
    _cleanupTrackListeners(): void;
    disable(): void;
    updateCaptions(): void;
    /**
     * YouTube/Vimeo/SoundCloud play inside an iframe: the `<video>`/`<audio>`
     * element holding sidecar `<track>`s never advances, so the browser's
     * `activeCues` stay pinned to 0 s. Match cues against the player clock.
     */
    private resolveActiveCues;
    positionCaptionsOnMobile(): void;
    updateStyles(): void;
    hexToRgba(hex: string, alpha: number): string;
    setCaptionStyle(property: string, value: string | number): void;
    getAvailableTracks(): {
        index: number;
        language: string;
        label: string;
        kind: string;
    }[];
    /**
     * Refresh tracks list - useful when HLS adds subtitle tracks dynamically
     */
    refreshTracks(): Promise<number>;
    switchTrack(trackIndex: number): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=CaptionManager.d.ts.map