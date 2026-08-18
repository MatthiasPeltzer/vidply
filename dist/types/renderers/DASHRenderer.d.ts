import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
interface DashTextTrack {
    lang?: string;
    language?: string;
    srclang?: string;
    kind?: string;
    label?: string;
    labels?: string;
    isTTML?: boolean;
    codec?: string;
    mimeType?: string;
    [key: string]: unknown;
}
/**
 * Shape of payloads emitted by VidPly's `captionsenabled` event when
 * routed into a DASH renderer. These come from CaptionManager and carry
 * both the language and the underlying TextTrack reference.
 */
interface CaptionTrackSelection {
    language?: string;
    label?: string;
    track?: TextTrack;
}
type CaptionEnabledHandler = (track: CaptionTrackSelection) => void;
type CaptionDisabledHandler = () => void;
export declare class DASHRenderer implements Renderer {
    readonly rendererType: "dash";
    player: Player;
    media: HTMLMediaElement;
    dash: DashMediaPlayerInstance | null;
    readonly isStreaming = true;
    _dashSourceLoaded: boolean;
    _pendingSrc: string | null;
    _dashSubtitleTracksCount: number | undefined;
    _dashTextTracks: DashTextTrack[];
    _cueUpdateTimer: ReturnType<typeof setInterval> | null;
    _captionEnabledHandler: CaptionEnabledHandler | null;
    _captionDisabledHandler: CaptionDisabledHandler | null;
    _lastKnownCueCount: number;
    _lastKnownMaxCueStart: number;
    _dashTextIsTtml: boolean;
    _pendingTimeouts: ReturnType<typeof setTimeout>[];
    _ttmlDiv: HTMLElement | null;
    _manifestUrl: string | null;
    private _listenerController;
    private _pendingReadyHandler;
    constructor(player: Player);
    init(): Promise<void>;
    initDashJs(): Promise<void>;
    /**
     * Load dash.js. Pinned to an exact version (the previous default
     * `5.2.1` is preserved) and shipped with a matching Subresource
     * Integrity hash, so the default CDN script is verified out of the
     * box. Overridable via `options.dashScriptUrl` (URL) /
     * `options.dashScriptIntegrity` (SRI hash). The built-in hash only
     * applies to the pinned default URL. See HLSRenderer.loadHlsJs() for
     * the SRI computation command.
     */
    loadDashJs(): Promise<void>;
    _setTimeout(fn: () => void, delay: number): number;
    attachDashEvents(): void;
    /**
     * Count total cues across all subtitle/caption tracks (for WebVTT DASH).
     */
    _getTotalCueCount(): number;
    _getMaxCueStartTime(): number;
    _isLivePlayback(): boolean;
    _emitTextCuesUpdateIfChanged(): boolean;
    /**
     * Return true if `time` falls inside any TimeRange the SourceBuffer already
     * holds, with a small tolerance to absorb GOP boundaries. Used by the
     * seeking handler to decide whether to surface a 'waiting' event for the
     * spinner UI when the user scrubs while paused.
     */
    _isTimeBuffered(time: number): boolean;
    /**
     * Sync VidPly caption track switches with dash.js so it loads
     * subtitle segments for the selected language.
     */
    _setupCaptionSync(): void;
    /**
     * Map a VidPly caption track to the corresponding dash.js track index
     * and switch dash.js to load segments for that language.
     */
    _syncDashTextTrack(selectedTrack: CaptionTrackSelection): void;
    /**
     * Poll for new WebVTT cues being added by dash.js as subtitle segments load.
     * Emits events for transcript refresh when new cues arrive.
     */
    _startCueUpdatePolling(): void;
    _stopCueUpdatePolling(): void;
    _checkSubtitleTracks(): void;
    updateCaptionButtonsForDash(retryCount?: number): void;
    attachMediaEvents(): void;
    handleDashError(e: unknown): void;
    ensureLoaded(): void;
    play(): void;
    pause(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackSpeed(speed: number): void;
    switchQuality(qualityIndex: number): void;
    getQualities(): {
        index: number;
        height: number | undefined;
        width: number | undefined;
        bitrate: number | undefined;
        name: string;
    }[];
    getCurrentQuality(): number;
    handlesOwnCaptions(): boolean;
    /**
     * Tell dash.js to activate the text track for `lang` so it begins
     * downloading subtitle segments and populating cues for that language.
     */
    activateTextTrackForLanguage(lang: string): boolean;
    getTextTrackURLs(): {
        lang: string;
        url: string;
    }[];
    supportsAutoQuality(): boolean;
    isAutoQuality(): boolean;
    destroy(): void;
}
export {};
//# sourceMappingURL=DASHRenderer.d.ts.map