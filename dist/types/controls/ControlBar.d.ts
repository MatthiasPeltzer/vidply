/**
 * Control Bar Component
 */
import type { Player } from '../core/Player.js';
type TimerHandle = ReturnType<typeof setTimeout>;
export declare class ControlBar {
    player: Player;
    _overflowMenuItemRef: HTMLElement | null;
    controls: Record<string, HTMLElement>;
    currentPreviewTime: number | null;
    element: HTMLElement;
    hideTimeout: TimerHandle | undefined;
    isDraggingProgress: boolean;
    isDraggingVolume: boolean;
    openMenu: HTMLElement | null;
    openMenuButton: HTMLElement | null;
    overflowResizeObserver: ResizeObserver | null;
    /** Player-event subscriptions grouped by the method that registered them,
     *  so rebuilds can detach-and-re-add per group without leaking. */
    private _playerSubscriptions;
    /** Guards the one-time auto-hide DOM/player listener binding so control
     *  rebuilds (which re-call setupAutoHide) don't stack duplicate handlers. */
    private _autoHideBound;
    /** Guards the one-time window-resize/fullscreen overflow listeners so
     *  control rebuilds (which re-call setupOverflowDetection) don't stack them.
     *  The ResizeObserver is still recreated each call for the new rightButtons. */
    private _overflowGlobalBound;
    previewSupported: boolean;
    previewThumbnailCache: Map<number, string>;
    previewThumbnailTimeout: TimerHandle | null;
    previewUsingMainVideo: boolean;
    previewVideo: HTMLVideoElement | null;
    previewVideoInitialized: boolean;
    previewVideoReady: boolean;
    rightButtons: HTMLElement;
    overflowMenuButton: HTMLElement | null;
    /** Track of the currently open volume slider so a single pair of
     *  document listeners (installed once in {@link init}) can update the
     *  right element while dragging without being re-registered per open. */
    _activeVolumeTrack: HTMLElement | null;
    /** Track of the currently rendered progress bar so document-level
     *  mousemove/mouseup handlers installed once in {@link init} can resolve
     *  the geometry without re-registering per drag. */
    _progressBarRect: DOMRect | null;
    constructor(player: Player);
    init(): void;
    /**
     * Register a player-event listener tagged with a lifecycle `group` so it
     * can be detached before the owning method re-runs on a control rebuild.
     */
    private subscribe;
    /**
     * Detach player-event listeners. With a `group`, only that group's
     * listeners are removed (and re-added by the method that owns it);
     * without one, every ControlBar subscription is removed (destroy path).
     */
    private detachPlayerEvents;
    /**
     * Install a single pair of document-level mousemove/mouseup handlers
     * that both the progress bar drag and the volume slider drag reuse.
     *
     * This replaces the previous pattern where {@link showVolumeSlider}
     * and {@link setupProgressBarEvents} each attached their own
     * `document.addEventListener` calls on every call — the volume variant
     * in particular accumulated two extra document listeners on every menu
     * open for the life of the page. All listeners here are tied to the
     * Player's lifecycle AbortController so `destroy()` removes them.
     */
    setupGlobalDragListeners(): void;
    isTouchDevice(): boolean;
    positionMenu(menu: HTMLElement, button: HTMLElement, immediate?: boolean): void;
    insertMenuIntoDOM(menu: HTMLElement, button: HTMLElement): void;
    attachMenuCloseHandler(menu: HTMLElement, button: HTMLElement, preventCloseOnInteraction?: boolean): void;
    closeMenuAndReturnFocus(menu: HTMLElement | null, button: HTMLElement | null, returnFocus?: boolean): void;
    closeOpenMenu(): void;
    attachMenuKeyboardNavigation(menu: HTMLElement, button: HTMLElement): void;
    createElement(): void;
    createControls(): void;
    /**
     * Ensure all buttons in the controls have title attributes
     * Uses aria-label as title if title is not present
     */
    ensureButtonTooltips(container: HTMLElement): void;
    hasChapterTracks(): boolean;
    hasCaptionTracks(): boolean;
    hasQualityLevels(): boolean;
    hasAudioDescription(): boolean;
    hasSignLanguage(): boolean;
    createProgressBar(): void;
    /**
     * Initialize preview thumbnail functionality for HTML5 video
     */
    initPreviewThumbnail(): void;
    /**
     * Lazily create the hidden preview video (only after playback started once)
     * Supports HTML5, HLS, and DASH renderers
     */
    ensurePreviewVideoInitialized(): void;
    /**
     * Pre-generate thumbnails during browser idle time
     * Uses requestIdleCallback to avoid impacting UI performance
     */
    pregenerateThumbnails(): void;
    /**
     * Generate preview thumbnail for a specific time
     * @param {number} time - Time in seconds
     * @returns {Promise<string>} Data URL of the thumbnail
     */
    generatePreviewThumbnail(time: number): Promise<string | null | undefined>;
    /**
     * Update preview thumbnail display
     * @param {number} time - Time in seconds
     */
    updatePreviewThumbnail(time: number): Promise<void>;
    setupProgressBarEvents(): void;
    createPlayPauseButton(): HTMLButtonElement;
    createRestartButton(): HTMLButtonElement;
    createPreviousButton(): HTMLButtonElement;
    createNextButton(): HTMLButtonElement;
    createPlaylistToggleButton(): HTMLButtonElement;
    createRewindButton(): HTMLButtonElement;
    createForwardButton(): HTMLButtonElement;
    createMuteButton(): HTMLButtonElement;
    createVolumeControl(): HTMLButtonElement;
    showVolumeSlider(button: HTMLElement): void;
    createTimeDisplay(): HTMLDivElement;
    createChaptersButton(): HTMLButtonElement;
    showChaptersMenu(button: HTMLElement): void;
    createQualityButton(): HTMLButtonElement;
    showQualityMenu(button: HTMLElement): void;
    createCaptionStyleButton(): HTMLButtonElement;
    showCaptionStyleMenu(button: HTMLElement): void;
    createSpeedButton(): HTMLButtonElement;
    formatSpeedLabel(speed: number): string;
    showSpeedMenu(button: HTMLElement): void;
    createCaptionsButton(): HTMLButtonElement;
    showCaptionsMenu(button: HTMLElement): void;
    updateCaptionsButton(): void;
    createTranscriptButton(): HTMLButtonElement;
    updateTranscriptButton(): void;
    createHelpButton(): HTMLButtonElement;
    createAudioDescriptionButton(): HTMLButtonElement;
    updateAudioDescriptionButton(): void;
    createSignLanguageButton(): HTMLButtonElement;
    updateSignLanguageButton(): void;
    /**
     * Create sign language in main view button (src swap, like audio description)
     */
    createSignLanguageInMainViewButton(): HTMLButtonElement;
    /**
     * Update sign language in main view button state
     */
    updateSignLanguageInMainViewButton(): void;
    /**
     * Update accessibility buttons visibility based on current track data.
     * Called when loading a new playlist track to show/hide buttons accordingly.
     */
    updateAccessibilityButtons(): void;
    createPipButton(): HTMLButtonElement;
    createDownloadButton(downloadUrl: string): HTMLButtonElement;
    /**
     * Resolve the human-readable file format (e.g. "MP4") for the download
     * button from options, data attributes, the matching <source type>, or
     * the URL extension. Returns null when nothing can be determined.
     */
    resolveDownloadFormat(downloadUrl: string): string | null;
    /**
     * Resolve a known file size from options or data attributes (in bytes).
     * Returns null if no value was provided and a HEAD request should run.
     */
    resolveInitialDownloadSize(): number | null;
    /**
     * Update both aria-label and the visible tooltip text for the download button.
     */
    updateDownloadButtonLabel(button: HTMLButtonElement, label: string): void;
    createFullscreenButton(): HTMLButtonElement;
    attachEvents(): void;
    updatePlayPauseButton(): void;
    updateProgress(): void;
    updateDuration(): void;
    updateVolumeDisplay(): void;
    updateBuffered(): void;
    updateSpeedDisplay(): void;
    updateFullscreenButton(): void;
    /**
     * Ensure quality button exists if qualities are available
     * This is called after renderer initialization to dynamically add the button
     */
    ensureQualityButton(): void;
    /**
     * Dynamically add captions button if HLS subtitle tracks become available
     * Button order: Chapters, Captions, Caption Style, Speed, AD, Transcript, Playlist, Sign, Quality, PiP, Fullscreen
     */
    ensureCaptionsButton(): void;
    /**
     * Dynamically add caption style button if HLS subtitle tracks become available
     */
    ensureCaptionStyleButton(): void;
    /**
     * Dynamically add transcript button if HLS subtitle tracks become available
     */
    ensureTranscriptButton(): void;
    /**
     * Remove caption-related buttons if no HLS subtitle tracks are available
     * and no native caption tracks exist. Called when switching to a stream
     * without subtitles.
     * @param {boolean} force - If true, skip the native captions check and force removal
     */
    removeHlsCaptionButtons(force?: boolean): void;
    /**
     * Disable all caption/subtitle tracks and clear the captions display
     */
    disableAllCaptions(): void;
    updateQualityIndicator(): void;
    setupAutoHide(): void;
    createOverflowMenuButton(): HTMLButtonElement;
    showOverflowMenu(button: HTMLElement): void;
    /**
     * Re-evaluate which buttons fit in the right-side area and which need to
     * be moved into the overflow ("more options") menu. Safe to call any
     * number of times — extracted from `setupOverflowDetection` so dynamic
     * button insertions (audio-description / sign-language) can request a
     * recheck without re-attaching observers.
     */
    checkOverflow(): void;
    setupOverflowDetection(): void;
    show(): void;
    hide(): void;
    /**
     * Update preview video source when player source changes (for playlists)
     * Also re-initializes if preview wasn't set up initially
     */
    updatePreviewVideoSource(): void;
    /**
     * Cleanup preview thumbnail resources
     */
    cleanupPreviewThumbnail(): void;
    destroy(): void;
}
export {};
//# sourceMappingURL=ControlBar.d.ts.map