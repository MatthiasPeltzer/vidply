/**
 * VidPly - Universal Video Player
 * Main Player Class
 */
import { EventEmitter } from '../utils/EventEmitter.js';
import { ControlBar } from '../controls/ControlBar.js';
import { CaptionManager } from '../controls/CaptionManager.js';
import { KeyboardManager } from '../controls/KeyboardManager.js';
import { MediaSessionManager } from './MediaSessionManager.js';
import { StorageManager } from '../utils/StorageManager.js';
import { DraggableResizable } from '../utils/DraggableResizable.js';
import { type LazyHandle } from './LazyInit.js';
import { PseudoFullscreenController } from './PseudoFullscreen.js';
import { ThemeManager, type ThemeName } from './ThemeManager.js';
import { PosterManager } from './PosterManager.js';
import { ResumeManager } from './ResumeManager.js';
import { ResponsiveManager } from './ResponsiveManager.js';
import { LiveStreamManager } from './LiveStreamManager.js';
import { MetadataAlertsManager, type MetadataAlertConfig as _MetadataAlertConfig, type MetadataAlertOptions as _MetadataAlertOptions } from './MetadataAlertsManager.js';
export type MetadataAlertConfig = _MetadataAlertConfig;
export type MetadataAlertOptions = _MetadataAlertOptions;
import type { PlayerEventMap } from '../types/events.js';
import type { PlayerOptions } from '../types/options.js';
import type { PlayerState } from '../types/state.js';
import type { Renderer } from '../types/renderer.js';
import type { AudioDescriptionManager } from './AudioDescriptionManager.js';
import type { SignLanguageManager } from './SignLanguageManager.js';
import type { FloatingPlayerManager } from './FloatingPlayerManager.js';
import type { TranscriptManager } from '../controls/TranscriptManager.js';
import type { PlaylistManager } from '../features/PlaylistManager.js';
import { TrackInfoView } from './TrackInfoView.js';
import { KeyboardHelp } from '../controls/KeyboardHelp.js';
/** Configuration accepted by Player.load() when switching to new media. */
export interface PlayerLoadConfig {
    src: string;
    type?: string;
    poster?: string | null;
    tracks?: Array<{
        kind?: string;
        label?: string;
        src?: string;
        srclang?: string;
        default?: boolean;
        [key: string]: unknown;
    }>;
    audioDescriptionSrc?: string | null;
    signLanguageSrc?: string | null;
    signLanguageSources?: Record<string, string>;
    [key: string]: unknown;
}
export declare class Player extends EventEmitter<PlayerEventMap> {
    static instances: Player[];
    /**
     * Available theme names. Kept as a static field for backward
     * compatibility with external callers that used
     * `Player.THEMES.includes(x)`; the canonical source is
     * `PLAYER_THEMES` in `./ThemeManager.ts`.
     */
    static readonly THEMES: readonly ThemeName[];
    /**
     * Manually schedule a lazy-initialised player for `selector` /
     * `element`. The player is constructed the first time the element
     * scrolls within `margin` of the viewport; if `IntersectionObserver`
     * is unavailable the player is constructed immediately.
     *
     * Returns a handle whose `cancel()` method removes the pending
     * observation, or `null` if no observation was scheduled (element
     * missing or eager fallback took effect).
     *
     * Implemented as a real static method (rather than a post-construction
     * assignment from `index.ts`) so the API belongs to the `Player`
     * symbol itself — which makes it easier to tree-shake and reason about.
     */
    static observeLazy(selector: string | HTMLElement, options?: Partial<PlayerOptions>, margin?: string): LazyHandle;
    element: HTMLMediaElement;
    container: HTMLElement;
    /**
     * Runtime options. Includes a `[key: string]: unknown` index for
     * internal-only dynamic keys that have not yet been promoted into
     * the public {@link PlayerOptions} interface.
     */
    options: PlayerOptions & Record<string, unknown>;
    state: PlayerState & Record<string, unknown>;
    renderer: Renderer | null;
    controlBar: ControlBar | null;
    captionManager: CaptionManager | null;
    keyboardManager: KeyboardManager | null;
    mediaSessionManager: MediaSessionManager | null;
    transcriptManager: TranscriptManager | null;
    playlistManager: PlaylistManager | null;
    keyboardHelp: KeyboardHelp | null;
    audioDescriptionManager: AudioDescriptionManager | null;
    signLanguageManager: SignLanguageManager | null;
    floatingPlayerManager: FloatingPlayerManager | null;
    liveStreamManager: LiveStreamManager | null;
    storage: StorageManager;
    instanceId: number;
    _audioDescriptionDesiredState: boolean | undefined;
    _fallbackSources: Array<{
        src: string;
        type?: string;
        [key: string]: unknown;
    }> | null;
    _isAudioContent: boolean | undefined;
    _isFallingBack: boolean | undefined;
    _managersLoading: Promise<unknown> | null;
    _originalElement: HTMLElement;
    /** Lazily-created on first pseudo-fullscreen entry. Owns the scroll /
     *  inert / viewport bookkeeping that used to live as `_original*`
     *  fields directly on the player. */
    pseudoFullscreen: PseudoFullscreenController | null;
    /** Owns `applyTheme`/`setTheme`/`setThemeVariable`/`resetTheme`. Player
     *  keeps delegating public methods so the existing API is unchanged. */
    themeManager: ThemeManager;
    /** Owns poster resolution, canvas-capture, and overlay show/hide. */
    posterManager: PosterManager;
    /** Owns resume-playback prompt + progress persistence. Lazily
     *  created the first time `initResumePlayback` is called so sites
     *  that don't enable the feature don't pay the DOM / listener cost. */
    resumeManager: ResumeManager | null;
    /** Standalone track metadata header (single-item players without a playlist). */
    trackInfoView: TrackInfoView | null;
    /** Owns resize-observer, orientation matchMedia, and the
     *  cross-vendor fullscreenchange listeners. */
    responsiveManager: ResponsiveManager;
    /** Baseline `muted|volume` from page options; invalidates stale localStorage. */
    private _preferencesConfigKey;
    /** While true, HTML5 renderers ignore media `volumechange` sync. */
    private _isApplyingVolumeSettings;
    /** Owns `kind=metadata` text-track directives (PAUSE, FOCUS,
     *  #hashtag) + the per-selector alert UI. Lazily created on first
     *  `setupMetadataHandling()` call. */
    metadataAlertsManager: MetadataAlertsManager | null;
    _pendingSource: string | null;
    _sourceElementsCache: HTMLSourceElement[] | null;
    _sourceElementsDirty: boolean;
    _switchingRenderer: boolean | undefined;
    _trackElementsCache: HTMLTrackElement[] | null;
    _trackElementsDirty: boolean;
    _textTracksCache: TextTrack[] | null;
    _textTracksDirty: boolean | undefined;
    audioDescriptionCaptionTracks: unknown[];
    audioDescriptionSourceElement: HTMLSourceElement | null;
    audioDescriptionSrc: string | null;
    currentSignLanguage: string | null;
    currentSource: string | null;
    debouncedPositionPlayOverlay: ((...args: unknown[]) => void) | null;
    fullscreenChangeHandler: (() => void) | null;
    /** Mirrored from `MetadataAlertsManager` so the TextTrack cleanup
     *  path in `destroy()` can still find it by a fixed field name. */
    metadataCueChangeHandler: (() => void) | null;
    noticeElement: HTMLElement | null;
    noticeTimeout: ReturnType<typeof setTimeout> | null;
    orientationHandler: ((e: MediaQueryListEvent) => void) | null;
    orientationQuery: MediaQueryList | null;
    originalAudioDescriptionSource: string | null;
    originalSrc: string | null;
    playButtonOverlay: SVGSVGElement | null;
    /** Wrapper button for the audio play overlay. Video keeps the bare,
     *  presentational SVG because the video surface is itself clickable. */
    playButtonOverlayButton: HTMLButtonElement | null;
    resizeHandler: (() => void) | null;
    resizeObserver: ResizeObserver | null;
    resumePromptElement: HTMLElement | null;
    signLanguageDraggable: DraggableResizable | null;
    signLanguageHeader: HTMLElement | null;
    signLanguageSettingsButton: HTMLButtonElement | null;
    signLanguageSettingsMenu: HTMLElement | null;
    signLanguageSettingsMenuVisible: boolean;
    signLanguageSources: Record<string, string>;
    signLanguageSrc: string | null;
    signLanguageVideo: HTMLVideoElement | null;
    signLanguageWrapper: HTMLElement | null;
    timeouts: Set<ReturnType<typeof setTimeout>>;
    trackArtworkElement: HTMLElement | null;
    videoWrapper: HTMLElement | null;
    /** Centered buffering spinner (see `.vidply-loading` / `.vidply-buffering` in CSS) */
    loadingOverlayElement: HTMLElement | null;
    /** Native `playing` listener — must be removed in destroy() */
    _bufferingHideOnMediaPlaying: (() => void) | null;
    /** AbortController, whose signal feeds every window/document listener and
     *  every user-influenced fetch the Player creates. `destroy()` calls
     *  `abort()` so a torn-down player can never leak listeners or pending
     *  network calls. */
    private _lifecycleController;
    constructor(element: string | HTMLElement, options?: Record<string, unknown>);
    /** Convenience getter for subsystems that take an AbortSignal. */
    get lifecycleSignal(): AbortSignal;
    /**
     * Get cached text tracks array
     * @returns {Array} Array of text tracks
     */
    get textTracks(): TextTrack[];
    /**
     * Get cached source elements array
     * @returns {Array} Array of source elements
     */
    get sourceElements(): HTMLSourceElement[];
    /**
     * Get cached track elements array
     * @returns {Array} Array of track elements
     */
    get trackElements(): HTMLTrackElement[];
    /**
     * Show a small in-player notice (non-blocking), also announced to screen readers.
     */
    showNotice(message: string, { timeout, priority }?: {
        timeout?: number | undefined;
        priority?: "polite" | "assertive" | undefined;
    }): void;
    init(): Promise<void>;
    /**
     * Ensure the transcript manager is available, creating it on demand.
     * This keeps the initial load fast when transcripts are not needed.
     */
    ensureTranscriptManager(): Promise<TranscriptManager | null>;
    /**
     * Toggle transcript visibility, lazily creating the manager if necessary.
     */
    toggleTranscript(): Promise<void>;
    /**
     * Ensure the audio description manager is available, creating it on demand.
     * This keeps the initial load fast when an audio description is not needed.
     */
    ensureAudioDescriptionManager(): Promise<AudioDescriptionManager | null>;
    /**
     * True when the current media actually exposes audio-description content:
     * an explicit described-audio source, `<source>` elements carrying
     * `data-desc-src` / `data-orig-src`, or a `descriptions` text track.
     * Mirrors `ControlBar.hasAudioDescription()` so the chunk load and the
     * button visibility stay in lock-step.
     */
    hasAudioDescriptionContent(): boolean;
    /**
     * Ensure the sign language manager is available, creating it on demand.
     * This keeps the initial load fast when sign language is not needed.
     */
    ensureSignLanguageManager(): Promise<SignLanguageManager | null>;
    /**
     * True when a sign-language video source (single `signLanguageSrc` or a
     * `signLanguageSources` map) is configured. Mirrors
     * `ControlBar.hasSignLanguage()`.
     */
    hasSignLanguageContent(): boolean;
    private resolveSignLanguageSrc;
    private resolveSignLanguageSources;
    /**
     * Lazy-load and instantiate the floating (in-page PiP) manager. Only
     * created when `options.floating === true` and the media element is a
     * <video>. Audio-only players never float.
     */
    ensureFloatingPlayerManager(): Promise<FloatingPlayerManager | null>;
    /**
     * Initialize feature managers if needed (called during init)
     */
    initFeatureManagers(): Promise<void>;
    /**
     * Detect language from HTML lang attribute
     * @returns {string|null} Language code if available in translations or as built-in, null otherwise
     */
    detectHtmlLanguage(): string | null;
    /**
     * Initialise the resume-playback feature. Lazily constructs a
     * `ResumeManager` on first use so disabled pages don't pay the DOM
     * / listener cost. Repeat calls are safe — the manager's own
     * `init()` is idempotent.
     */
    initResumePlayback(): void;
    /**
     * Render track metadata above the media for single-item players. Skipped
     * when a playlist manager owns the track-info header instead.
     */
    initStandaloneTrackInfo(): void;
    private buildStandaloneTrackInfoData;
    /**
     * Get a unique identifier for the current video
     * Uses data-video-id attribute if available, otherwise hashes the source URL
     * @returns {string|null} Video ID or null if not available
     */
    getVideoId(): string | null;
    /**
     * Simple string hash function
     * @param {string} str - String to hash
     * @returns {string} Hash string
     */
    _hashString(str: string): string;
    saveProgress(): void;
    checkForResume(): void;
    showResumePrompt(savedTime: number): void;
    hideResumePrompt(): void;
    applyTheme(): void;
    setTheme(themeName: ThemeName, customVariables?: Record<string, string>): void;
    getTheme(): ThemeName | undefined;
    setThemeVariable(variableName: string, value: string): void;
    resetTheme(): void;
    createContainer(): void;
    /**
     * Whether the centered play overlay should be created for this player.
     * `playButtonOverlay: 'auto'` keeps it video-only.
     */
    isPlayButtonOverlayEnabled(): boolean;
    /** The node actually inserted into the DOM: the button on audio, the SVG on video. */
    getPlayButtonOverlayNode(): HTMLElement | SVGSVGElement | null;
    /**
     * (Re-)insert the overlay into its host. Audio players hang it on the track
     * artwork, which `PlaylistManager` may only create once a track is loaded —
     * hence the separate, idempotent mount step.
     */
    mountPlayButtonOverlay(host?: HTMLElement | null): void;
    createPlayButtonOverlay(): void;
    /**
     * Purely additive buffering spinner. Never touches play overlay or any other UI —
     * only toggles `vidply-buffering` on the container and manages its own `.vidply-loading` node.
     * Skipped for external providers (YouTube, Vimeo, SoundCloud) which have native loading UI.
     */
    createBufferingLoadingOverlay(): void;
    positionPlayOverlayOnMobile(): void;
    initializeRenderer(): Promise<void>;
    _detectRendererClass(src: string): Promise<new (player: Player) => Renderer>;
    _selectBestSource(sourceElements: HTMLSourceElement[]): {
        src: string;
        fallbacks: Array<{
            src: string;
            type: string;
        }>;
    };
    _fallbackToNextSource(): Promise<boolean>;
    /**
     * Invalidate DOM query cache (call when tracks/sources change)
     */
    invalidateTrackCache(): void;
    /**
     * Find a text track by kind and optionally language
     * @param {string} kind - Track kind (captions, subtitles, descriptions, chapters, metadata)
     * @param {string} [language] - Optional language code
     * @returns {TextTrack|null} Found track or null
     */
    findTextTrack(kind: string, language?: string | null): TextTrack | undefined;
    /**
     * Find a source element by attribute
     * @param {string} attribute - Attribute name (e.g., 'data-desc-src')
     * @param {string} [value] - Optional attribute value
     * @returns {Element|null} Found source element or null
     */
    findSourceElement(attribute: string, value?: string | null): HTMLSourceElement | undefined;
    /**
     * Find a track element by its associated TextTrack
     * @param {TextTrack} track - The TextTrack object
     * @returns {Element|null} Found track element or null
     */
    findTrackElement(track: TextTrack): HTMLTrackElement | undefined;
    resolvePosterPath(posterPath: string | null | undefined): string;
    generatePosterFromVideo(time?: number): Promise<string | null>;
    autoGeneratePoster(): Promise<void>;
    showPosterOverlay(): void;
    hidePosterOverlay(): void;
    /**
     * Set a managed timeout that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setManagedTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
    /**
     * Clear a managed timeout
     * @param {number} timeoutId - Timeout ID to clear
     */
    clearManagedTimeout(timeoutId: ReturnType<typeof setTimeout> | null | undefined): void;
    /**
     * Load new media source (for playlists)
     * @param {Object} config - Media configuration
     * @param {string} config.src - Media source URL
     * @param {string} config.type - Media MIME type
     * @param {string} [config.poster] - Poster image URL
     * @param {Array} [config.tracks] - Text tracks (captions, chapters, etc.)
     * @param {string} [config.audioDescriptionSrc] - Audio description video URL
     * @param {string} [config.signLanguageSrc] - Sign language video URL
     */
    /**
     * Check if a source URL requires an external renderer (YouTube, Vimeo, SoundCloud, HLS, DASH)
     * @param {string} src - Source URL
     * @returns {boolean}
     */
    isExternalRendererUrl(src: string | null | undefined): boolean;
    load(config: PlayerLoadConfig): Promise<void>;
    /**
     * Ensure the current renderer has started its initial load (metadata/manifest)
     * without starting playback. This is useful for playlists to behave like
     * single videos on selection, while still keeping autoplay off.
     */
    ensureLoaded(): void;
    /**
     * Check if we need to change renderer type
     * @param {string} src - New source URL
     * @returns {boolean}
     */
    /**
     * Update the control bar to refresh button visibility based on available features
     */
    updateControlBar(): void;
    shouldChangeRenderer(src: string): boolean;
    play(): void;
    pause(): void;
    stop(): void;
    toggle(): void;
    /**
     * Seek to a non-negative finite second offset. Non-finite or non-numeric
     * inputs are silently dropped instead of being forwarded to the renderer
     * where they would set `currentTime = NaN` on an HTMLMediaElement.
     */
    seek(time: number): void;
    seekForward(interval?: number): void;
    seekBackward(interval?: number): void;
    isLiveStream(): boolean;
    isBehindLive(): boolean;
    getSecondsBehindLive(): number;
    getLiveSeekRange(): {
        start: number;
        end: number;
    } | null;
    seekToLive(): void;
    /**
     * HTML5 renderers call this before syncing `media.volume` / `media.muted`
     * into player state so programmatic init is not overwritten (Chrome timing).
     */
    shouldSyncVolumeFromMedia(): boolean;
    /**
     * Apply the resolved options volume/mute to the renderer and player state.
     */
    applyVolumeAndMuteSettings(): void;
    /**
     * Set the volume to a finite number in [0, 1]. Non-numeric or NaN
     * input is silently ignored.
     */
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unmute(): void;
    toggleMute(): void;
    /**
     * Set playback speed in [0.25, 2]. Silently rejects non-finite input.
     */
    setPlaybackSpeed(speed: number): void;
    getPlaybackSpeed(): number;
    savePlayerPreferences(): void;
    enterFullscreen(): void;
    exitFullscreen(): void;
    toggleFullscreen(): void;
    _enablePseudoFullscreen(): void;
    _disablePseudoFullscreen(): void;
    enterPiP(): void;
    exitPiP(): void;
    togglePiP(): void;
    enableCaptions(): void;
    disableCaptions(): void;
    toggleCaptions(): void;
    /**
     * Check if a track file exists. Bounded by a 8s `AbortSignal.timeout`
     * and the player's lifecycle controller, so a slow / hung server cannot
     * keep a request alive past `destroy()`.
     */
    validateTrackExists(url: string): Promise<boolean>;
    /**
     * Strip VTT formatting tags from caption text
     * @param {string} text - Caption text with VTT formatting
     * @returns {string} Plain text without formatting
     */
    stripVTTFormatting(text: string | null | undefined): string;
    /**
     * Find matching caption time based on text content
     * Useful for syncing between videos of different lengths (e.g., with/without audio description)
     * @param {string} targetText - Caption text to search for
     * @param {Array} tracks - Array of caption tracks to search in
     * @returns {number|null} Start time of matching caption, or null if not found
     */
    findMatchingCaptionTime(targetText: string | null | undefined, tracks: Array<{
        kind?: string;
        track?: TextTrack | null;
    }> | null | undefined): number | null;
    enableAudioDescription(): Promise<void | undefined>;
    disableAudioDescription(): Promise<void | undefined>;
    toggleAudioDescription(): Promise<void>;
    enableSignLanguage(): Promise<void | undefined>;
    disableSignLanguage(): Promise<void | undefined>;
    toggleSignLanguage(): Promise<void>;
    toggleSignLanguageInMainView(): Promise<void>;
    setupSignLanguageInteraction(): void | undefined;
    switchSignLanguage(langCode: string): void | undefined;
    showSignLanguageSettingsMenu(): void | undefined;
    hideSignLanguageSettingsMenu({ focusButton }?: {
        focusButton?: boolean | undefined;
    }): void | undefined;
    constrainSignLanguagePosition(): void | undefined;
    saveSignLanguagePreferences(): void | undefined;
    cleanupSignLanguage(): void | undefined;
    showSettings(): void;
    hideSettings(): void;
    /**
     * Lazily build (on first use) and toggle the keyboard-shortcuts help
     * dialog. Reflects the live `keyboardShortcuts` bindings, including any
     * consumer overrides.
     */
    toggleKeyboardHelp(): void;
    showKeyboardHelp(): void;
    hideKeyboardHelp(): void;
    getCurrentTime(): number;
    getDuration(): number;
    isPlaying(): boolean;
    isPaused(): boolean;
    isEnded(): boolean;
    isMuted(): boolean;
    isFullscreen(): boolean;
    handleError(error: unknown): void;
    log(...messages: unknown[]): void;
    /**
     * Wire up resize / orientation / fullscreen listeners. Delegates to
     * `ResponsiveManager`; Player keeps the method name for backward
     * compatibility with external callers that start the feature
     * manually after swapping the container.
     */
    setupResponsiveHandlers(): void;
    destroy(): void;
    /**
     * Set up metadata track handling. Delegates to
     * `MetadataAlertsManager` — Player lazily constructs it so pages
     * without metadata tracks pay no cost.
     */
    setupMetadataHandling(): void;
    normalizeMetadataSelector(selector: unknown): string | null;
    resolveMetadataConfig(map: Record<string, unknown> | null | undefined, key: string | null | undefined): MetadataAlertConfig | null;
    cacheMetadataAlertContent(element: HTMLElement | null | undefined, config?: MetadataAlertConfig): void;
    restoreMetadataAlertContent(element: HTMLElement | null | undefined, config?: MetadataAlertConfig): void;
    focusMetadataTarget(target: string | null | undefined, fallbackElement?: HTMLElement | null): void;
    /** Internal helper: lazily creates the manager for external
     *  entry points that didn't come via `setupMetadataHandling`. */
    private _ensureMetadataManager;
    handleMetadataAlert(selector: string, options?: MetadataAlertOptions): HTMLElement | undefined;
    handleMetadataHashtags(hashtags: string[] | null | undefined): void;
    handleMetadataCue(cue: VTTCue | TextTrackCue): void;
}
//# sourceMappingURL=Player.d.ts.map