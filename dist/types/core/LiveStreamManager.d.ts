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
    /** Called by HLSRenderer when the manifest or buffer state indicates live. */
    evaluateHls(hls: HlsInstance | null): void;
    /** Called by DASHRenderer after the MPD is loaded. */
    evaluateDash(dash: DashMediaPlayerInstance | null): void;
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