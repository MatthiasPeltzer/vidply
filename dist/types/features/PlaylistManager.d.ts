/**
 * VidPly Playlist Manager
 * Manages playlists for audio and video content
 */
import { TrackInfoView } from '../core/TrackInfoView.js';
import type { Player } from '../core/Player.js';
type PlaylistTextTrack = {
    src?: string;
    kind?: string;
    srclang?: string;
    label?: string;
    default?: boolean;
    describedSrc?: string;
    [key: string]: unknown;
};
type PlaylistTrack = {
    src?: string;
    type?: string;
    sources?: Array<{
        src?: string;
        type?: string;
        label?: string;
    }>;
    poster?: string;
    /** File this track offers for download (see `PlaylistTrack` in types/events.ts). */
    downloadUrl?: string;
    downloadFormat?: string;
    downloadFileSize?: number;
    tracks?: PlaylistTextTrack[];
    audioDescriptionSrc?: string | null;
    audioDescriptionDuration?: number | string | null;
    signLanguageSrc?: string | null;
    signLanguageSources?: Record<string, string>;
    duration?: number | string | null;
    title?: string;
    artist?: string;
    description?: string;
    /** Host-supplied RTE HTML for the collapsible long description. */
    longDescription?: string;
    /** Preformatted, already localised publish date (see `PlaylistTrack` in types/events.ts). */
    date?: string;
    [key: string]: unknown;
};
/**
 * Construction signature for the host Player class. The playlist
 * manager receives this via options so it can recreate players when
 * tracks of incompatible media types (e.g. audio after video) load.
 */
type PlayerConstructor = new (element: string | HTMLElement, options?: Record<string, unknown>) => Player;
/**
 * Internal options bag for the manager. Extra keys from the caller
 * (we accept `Record<string, unknown>`) are merged in via the
 * `[key: string]: unknown` index so consumers can pass through
 * additional player options without losing typing on the known ones.
 */
type PlaylistPanelPosition = 'below' | 'right';
interface PlaylistManagerOptions {
    autoAdvance: boolean;
    autoPlayFirst: boolean;
    loop: boolean;
    showPanel: boolean;
    panelPosition: PlaylistPanelPosition;
    recreatePlayers: boolean;
    hostElement?: HTMLElement | null;
    PlayerClass?: PlayerConstructor | null;
    tracks?: PlaylistTrack[];
    [key: string]: unknown;
}
export declare class PlaylistManager {
    player: Player;
    container: HTMLElement | null;
    currentIndex: number;
    hostElement: HTMLElement | null;
    initialTracks: PlaylistTrack[];
    instanceId: number;
    isChangingTrack: boolean;
    isPanelVisible: boolean;
    navigationFeedback: HTMLElement | null;
    options: PlaylistManagerOptions;
    PlayerClass: PlayerConstructor | null;
    playlistPanel: HTMLElement | null;
    playlistMainElement: HTMLElement | null;
    trackArtworkElement: HTMLElement | null;
    trackInfoView: TrackInfoView | null;
    tracks: PlaylistTrack[];
    uniqueId: string;
    private _timers;
    /** Set when the user taps play while {@link isChangingTrack} is still true. */
    private _pendingUserPlay;
    /** Supersedes in-flight {@link loadTrack} / {@link play} when the user picks another track. */
    private _trackLoadGeneration;
    /** Prefetch track 0 (src + renderer) before the first user tap. */
    private _trackPreparePromise;
    /** iOS: caption/chapter <track> nodes are attached after the media resource loads. */
    private _iosPendingTextTracks;
    constructor(player: Player, options?: Record<string, unknown>);
    /**
     * Determine the media type for a track
     * @param {Object} track - Track object
     * @returns {string} - 'audio', 'video', 'youtube', 'vimeo', 'soundcloud', 'hls', 'dash'
     */
    getTrackMediaType(track: PlaylistTrack): "video" | "audio" | "hls" | "dash" | "youtube" | "vimeo" | "soundcloud";
    /**
     * Recreate the player with the appropriate element type for the track
     * @param {Object} track - Track to load
     * @param {boolean} autoPlay - Whether to auto-play after creation
     */
    recreatePlayerForTrack(track: PlaylistTrack, autoPlay?: boolean): Promise<boolean>;
    init(): void;
    /**
     * Load playlist from data-playlist attribute if present
     */
    loadPlaylistFromAttribute(): void;
    /**
     * Load playlist options from data attributes
     * @param {HTMLElement} element - Element to read attributes from
     */
    loadOptionsFromAttributes(element: HTMLElement): void;
    /**
     * Normalize a caller-supplied panel position to a supported value.
     */
    private static normalizePanelPosition;
    /**
     * Apply or remove the layout modifier class on the player container.
     */
    private applyPanelPositionClass;
    /**
     * Group the media area (wrapper, track info, artwork) so the playlist can sit
     * beside it without stretching the video wrapper to the playlist height.
     */
    private ensurePlaylistMainLayout;
    /**
     * Left column order: artwork (optional) → video → controls (inside wrapper) → track info.
     */
    private orderPlaylistMainChildren;
    /**
     * Insert a node before the video wrapper regardless of whether the right-panel
     * layout wrapped the player chrome in `.vidply-playlist-main`.
     */
    private insertBeforeVideoWrapper;
    /**
     * Inline 100% heights on the media element stretch the wrapper in grid layouts.
     */
    private syncRightPanelMediaStyles;
    /**
     * Restore the default single-column DOM when the panel is below the player.
     */
    private teardownPlaylistMainLayout;
    /**
     * Update player controls to add playlist navigation buttons
     */
    updatePlayerControls(): void;
    /**
     * Move the control bar's download button to the selected track.
     *
     * Tracks may each offer their own file, and the control bar is not always
     * rebuilt on a track change (MSE renderers keep their controls), so the
     * button is refreshed explicitly.
     */
    refreshDownloadButton(): void;
    /** Normalize a manifest/element media URL for comparison. */
    private static resolveMediaUrl;
    private mediaSourcesMatch;
    /** Whether the `<video>` / `<audio>` element already points at `src`. */
    elementHasMediaSource(src: string | null | undefined): boolean;
    /** Pause → play on the same track without re-binding media (iOS playlist). */
    canResumeCurrentTrack(index: number): boolean;
    /**
     * The renderer is active and the media element points at this track's URL.
     * Does not require {@link HTMLMediaElement.readyState} — single-video players
     * call {@link Renderer.play} without that check (required for iPhone playlists).
     */
    isTrackSourceAttached(index: number): boolean;
    /**
     * User can start playback with {@link Renderer.play} only — skip {@link Player.load}.
     */
    canPlayTrackWithoutReload(srcToLoad: string | null | undefined): boolean;
    private isTrackSourceAttachedForSrc;
    /**
     * Track metadata and renderer are loaded for this index (media may still be paused).
     */
    isTrackMediaReady(index: number): boolean;
    /** Resolve `src` / `sources[]` the same way single-video `<source>` negotiation does. */
    resolveTrackPlaybackSource(track: PlaylistTrack, options?: {
        preferNativeElement?: boolean;
    }): {
        src: string;
        type?: string;
    };
    /** True when Safari can drive this URL via a plain `src` on the media element. */
    usesNativeElementPlayback(src: string | null | undefined): boolean;
    /** Safari/iOS inline video (same requirement as single-video players). */
    private ensureInlineVideoPlaybackAttributes;
    /**
     * Start playback from {@link Player.play} when the playlist is paused.
     */
    startUserPlayback(index: number): void;
    /**
     * iOS: call {@link HTMLMediaElement.play} in the current user-gesture turn while
     * {@link Player.initializeRenderer} is still running (deferLoad prefetch).
     */
    tryPrimeNativePlaybackDuringInit(index: number): boolean;
    /** Attach deferred VTT tracks once iOS has selected the media resource. */
    attachIosTextTracksAfterMediaLoad(): void;
    private completeNativeGesturePlayUi;
    /**
     * Stage `src` and init renderer at rest (deferLoad playlists — all platforms).
     */
    prepareTrack(index: number): Promise<void>;
    /**
     * Native MP4/HLS: {@link Renderer.play} in the user-gesture turn, then playlist UI.
     */
    private playNativeInUserGesture;
    /** User tapped play while a track was still loading — run play when load finishes. */
    queuePlayWhenTrackReady(): void;
    /** Called when {@link Player.load} / track selection finishes (desktop / iPad). */
    tryConsumePendingUserPlay(): void;
    private fulfillPendingUserPlay;
    /** Start playback after async {@link Player.load}; retry once on `canplay` if needed. */
    private startPlaybackAfterTrackLoad;
    /** Start or resume playback once a track (or recreated player) has loaded. */
    private beginPlaybackForLoadedTrack;
    private finishPlayAfterLoad;
    /**
     * Load a playlist
     * @param {Array} tracks - Array of track objects
     */
    loadPlaylist(tracks: PlaylistTrack[]): void;
    /**
     * Idle playlist: show a track's poster/artwork and header without playback or selection.
     */
    presentIdleTrack(index: number): void;
    /**
     * Load a track without playing
     * This is the playlist equivalent of a "single video initialized but not started yet":
     * it updates UI selection and loads the media into the player so metadata/manifests
     * and feature managers can be ready, but it does not start playback.
     * @param {number} index - Track index
     */
    loadTrack(index: number): Promise<void>;
    /**
     * Select a track (UI/selection only; does NOT set the media src / does NOT initialize renderer)
     *
     * In "B always" playlist mode, you typically want `loadTrack()` on selection so the
     * selected item behaves like a single video (metadata/manifest loaded, features ready)
     * without auto-playing.
     * @param {number} index - Track index
     */
    selectTrack(index: number): void;
    /**
     * Play a specific track
     * @param {number} index - Track index
     * @param {boolean} userInitiated - Whether this was triggered by user action (default: false)
     */
    play(index: number, userInitiated?: boolean): Promise<void>;
    /**
     * Play next track
     */
    next(): void;
    /**
     * Play previous track
     */
    previous(): void;
    /**
     * Handle track end
     */
    handleTrackEnd(): void;
    /**
     * Check if a source URL requires an external renderer
     * @param {string} src - Source URL
     * @returns {boolean}
     */
    isExternalRendererUrl(src: string | null | undefined): boolean;
    /**
     * Handle track error
     */
    handleTrackError(e: unknown): void;
    /**
     * Handle playback state changes (for fullscreen playlist visibility)
     */
    handlePlaybackStateChange(): void;
    /**
     * Handle fullscreen state changes
     */
    handleFullscreenChange(): void;
    /**
     * Handle audio description state changes
     * Updates duration displays to show audio-described version duration when AD is enabled
     */
    handleAudioDescriptionChange(): void;
    /**
     * Update the visual duration displays in the playlist panel
     * Called when audio description state changes
     */
    updatePlaylistDurations(): void;
    /**
     * Get the effective duration for a track based on audio description state
     * @param {Object} track - Track object
     * @returns {number|null} - Duration in seconds or null if not available
     */
    getEffectiveDuration(track: PlaylistTrack): string | number | null;
    /**
     * Update playlist visibility based on fullscreen and playback state
     * In fullscreen: show when paused/not started, hide when playing
     * Outside fullscreen: respect original panel visibility setting
     */
    updatePlaylistVisibilityInFullscreen(): void;
    /**
     * Create playlist UI
     */
    createUI(): void;
    /**
     * Apply a validated poster URL to a video element (playlists / idle preview).
     */
    /**
     * Idle playlist preview for YouTube/Vimeo/SoundCloud: poster + play overlay only.
     */
    private applyIdleExternalEmbedPreview;
    private clearIdleExternalEmbedPreview;
    private setPlaylistIdleEmbedPreview;
    private removeStaleExternalEmbedNodes;
    private applyVideoPosterForTrack;
    /**
     * Update track info display
     */
    updateTrackInfo(track: PlaylistTrack, options?: {
        listIndex?: number;
    }): void;
    /**
     * Resolve a track poster for CSS/artwork (absolute URL + allow-list).
     */
    private resolveTrackPosterForArtwork;
    /**
     * Locate an existing artwork node in the current player tree.
     */
    private findExistingTrackArtworkElement;
    /**
     * Keep a single artwork node — Player init and PlaylistManager can both create one.
     */
    private dedupeTrackArtworkElements;
    /**
     * Re-apply artwork after player recreation and right-panel layout settle.
     */
    private finalizeTrackArtworkForTrack;
    /**
     * Whether a playlist track uses an external embed renderer (not local HTML5 media).
     */
    private isExternalEmbedTrack;
    /**
     * Hide every track-artwork node in the current playlist layout.
     */
    private hideTrackArtworkElements;
    /**
     * Update track artwork display (for audio playlists)
     */
    updateTrackArtwork(track: PlaylistTrack): void;
    /**
     * Render playlist
     */
    renderPlaylist(): void;
    /**
     * Create playlist item element
     */
    createPlaylistItem(track: PlaylistTrack, index: number): HTMLLIElement;
    /**
     * Handle keyboard navigation in playlist items
     */
    handlePlaylistItemKeydown(e: KeyboardEvent, index: number): void;
    /**
     * Update playlist UI (highlight current track)
     */
    updatePlaylistUI(): void;
    /**
     * Get current track
     */
    getCurrentTrack(): PlaylistTrack | null;
    /**
     * Get playlist info
     */
    getPlaylistInfo(): {
        currentIndex: number;
        totalTracks: number;
        currentTrack: PlaylistTrack | null;
        hasNext: boolean;
        hasPrevious: boolean;
    };
    /**
     * Check if there is a next track
     */
    hasNext(): boolean;
    /**
     * Check if there is a previous track
     */
    hasPrevious(): boolean;
    /**
     * Add track to playlist
     */
    addTrack(track: PlaylistTrack): void;
    /**
     * Remove track from playlist
     */
    removeTrack(index: number): void;
    /**
     * Clear playlist
     */
    clear(): void;
    /**
     * Sync grid layout when the in-player playlist panel is toggled in the
     * right-column desktop layout (full width when collapsed).
     */
    private syncPanelCollapsedLayout;
    /**
     * Toggle playlist panel visibility
     * @param {boolean} show - Optional: force show (true) or hide (false)
     * @returns {boolean} - New visibility state
     */
    togglePanel(show?: boolean): boolean;
    /**
     * Show playlist panel
     */
    showPanel(): boolean;
    /**
     * Hide playlist panel
     */
    hidePanel(): boolean;
    /**
     * Destroy playlist manager
     */
    /**
     * setTimeout wrapper that tracks the handle so destroy() can cancel any
     * still-pending callback. Nested deferred work should also route through
     * this so it can't fire after teardown.
     */
    private setManagedTimeout;
    destroy(): void;
}
export default PlaylistManager;
//# sourceMappingURL=PlaylistManager.d.ts.map