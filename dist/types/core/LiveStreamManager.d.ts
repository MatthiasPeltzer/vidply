import type { Player } from './Player.js';
/**
 * Detects live streams, tracks the live edge, and exposes seek clamping /
 * "behind live" state for the control bar and keyboard shortcuts.
 */
export declare class LiveStreamManager {
    private readonly player;
    private readonly boundRefresh;
    private readonly boundReset;
    /** Set by renderers when the manifest reports a dynamic/live playlist. */
    private sourceReportsLive;
    constructor(player: Player);
    destroy(): void;
    /**
     * hls.js exposes `liveSyncPosition` for VOD too (edge minus target latency).
     * Only trust the playlist `live` flag once the level manifest is loaded.
     */
    private hlsPlaylistIsLive;
    /** Called by HLSRenderer when the manifest or buffer state indicates live. */
    evaluateHls(hls: HlsInstance | null): void;
    /** Called by DASHRenderer after the MPD is loaded. */
    evaluateDash(dash: DashMediaPlayerInstance | null): void;
    /** Current manifest/playlist live hint from the active renderer, if known. */
    getSourceReportsLive(): boolean | null;
    /** Called when a renderer learns live/VOD from a fetched level/media playlist. */
    reportSourceLive(isLive: boolean): void;
    /**
     * Infer live/VOD from a fetched HLS media playlist before hls.js loads level details.
     * Returns null when the text is not a usable media playlist.
     */
    parseHlsMediaPlaylistLive(m3u8Text: string): boolean | null;
    /** True once the source is confidently VOD (not merely "not live yet"). */
    isConfirmedVod(): boolean;
    /** VOD skip-forward, or live catch-up when behind the edge. */
    shouldShowForwardSkip(): boolean;
    /** Restart is a VOD-only affordance once the source is confirmed VOD. */
    shouldShowRestart(): boolean;
    resolveIsLive(): boolean;
    detectFromMedia(): boolean;
    getLiveEdge(): number | null;
    getSeekableStart(): number;
    getSeekRange(): {
        start: number;
        end: number;
    } | null;
    getBehindThreshold(): number;
    isBehindLive(): boolean;
    getSecondsBehindLive(): number;
    clampSeekTime(time: number): number;
    seekToLive(): void;
    refresh(): void;
}
//# sourceMappingURL=LiveStreamManager.d.ts.map