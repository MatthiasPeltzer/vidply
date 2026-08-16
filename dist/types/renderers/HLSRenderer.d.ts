import type { Renderer, QualityLevel } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
export declare class HLSRenderer implements Renderer {
    readonly rendererType: "hls";
    player: Player;
    media: HTMLMediaElement;
    hls: HlsInstance | null;
    get isStreaming(): boolean;
    _hlsSourceLoaded: boolean;
    _pendingSrc: string | null;
    _hlsSubtitleTracksCount: number | undefined;
    _cueUpdateTimer: ReturnType<typeof setInterval> | null;
    _lastKnownCueCount: number;
    _lastKnownMaxCueStart: number;
    _nativeTrackListenersDestroyed?: boolean;
    _didDeferredLoad?: boolean;
    _manifestUrl: string | null;
    /**
     * True when the most recent startLoad() call was triggered by a seek on a
     * paused media element (not by play()). The FRAG_BUFFERED handler uses this
     * to call stopLoad() once the seek target is buffered, so hls.js does not
     * keep pre-fetching subsequent segments while the user is still paused.
     */
    _loadingForSeekOnly?: boolean;
    _cleanupNativeTextTrackListeners: () => void;
    private _listenerController;
    private _timers;
    private _pendingReadyHandler;
    constructor(player: Player);
    /**
     * Schedule a timeout that is automatically cancelled by destroy(). Prevents
     * caption-retry / error-recovery callbacks from running after teardown.
     */
    private _setTimeout;
    private _clearTimers;
    init(): Promise<void>;
    canPlayNatively(): boolean;
    initNative(): Promise<void>;
    /**
     * Listen for HLS-exposed text tracks so captions/transcript buttons appear on native HLS.
     * Debounces rapid addtrack bursts (one per subtitle rendition in the manifest).
     */
    _attachNativeTextTrackListeners(): void;
    initHlsJs(): Promise<void>;
    /**
     * Load hls.js. Pinned to an exact version by default (no more `@latest`) and
     * shipped with a matching Subresource Integrity hash, so the default CDN
     * script is verified out of the box. Embedders who self-host can override via:
     *   - `options.hlsScriptUrl` (URL to load from)
     *   - `options.hlsScriptIntegrity` (Subresource Integrity hash, e.g.
     *     `sha384-XXXX`)
     *
     * The built-in hash only applies to the pinned default URL. A custom URL
     * without an explicit integrity gets none — we can't know its hash. Generate
     * a hash for a new pin/URL with:
     *   curl -sSL <url> | openssl dgst -sha384 -binary | openssl base64 -A
     * and prefix with `sha384-`.
     */
    loadHlsJs(): Promise<void>;
    attachHlsEvents(): void;
    _getTotalCueCount(): number;
    _getMaxCueStartTime(): number;
    _isLivePlayback(): boolean;
    /**
     * Live HLS keeps a rolling TextTrack window — cue count plateaus while
     * content keeps changing. Emit when count or latest cue time advances.
     */
    _emitTextCuesUpdateIfChanged(): boolean;
    /**
     * Return true if `time` falls inside any TimeRange the SourceBuffer already
     * holds, with a small tolerance to absorb GOP boundaries. Used by the
     * seeking handler to decide whether to surface a 'waiting' event for the
     * spinner UI.
     */
    _isTimeBuffered(time: number): boolean;
    _startCueUpdatePolling(): void;
    _stopCueUpdatePolling(): void;
    /**
     * Update caption buttons based on HLS subtitle tracks
     * Handles the case where control bar may not exist yet
     */
    updateCaptionButtonsForHls(retryCount?: number): void;
    attachMediaEvents(): void;
    handleHlsError(data: HlsErrorData): void;
    /**
     * Begin fetching media fragments without starting playback. Used by the
     * playlist manager when a track is selected so playback can start quickly
     * once the user hits play. The manifest was already loaded in initHlsJs();
     * this call is just the equivalent of "press play without playing".
     */
    ensureLoaded(): void;
    play(): void;
    pause(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackSpeed(speed: number): void;
    switchQuality(levelIndex: number): void;
    getQualities(): QualityLevel[];
    getCurrentQuality(): number;
    activateTextTrackForLanguage(lang: string): boolean;
    /**
     * hls.js does not download subtitle segments until a subtitle rendition is
     * selected. Activate the default (or first) track when captions/transcript
     * should be on so live streams receive rolling WebVTT cues.
     */
    _ensureHlsSubtitleTrackActive(): void;
    getTextTrackURLs(): {
        lang: string;
        url: string;
    }[];
    supportsAutoQuality(): boolean;
    isAutoQuality(): boolean;
    destroy(): void;
}
//# sourceMappingURL=HLSRenderer.d.ts.map