/**
 * VidPly Playlist Manager
 * Manages playlists for audio and video content
 */
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
    poster?: string;
    tracks?: PlaylistTextTrack[];
    audioDescriptionSrc?: string | null;
    audioDescriptionDuration?: number | string | null;
    signLanguageSrc?: string | null;
    signLanguageSources?: Record<string, string>;
    duration?: number | string | null;
    title?: string;
    artist?: string;
    description?: string;
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
interface PlaylistManagerOptions {
    autoAdvance: boolean;
    autoPlayFirst: boolean;
    loop: boolean;
    showPanel: boolean;
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
    trackArtworkElement: HTMLElement | null;
    trackInfoElement: HTMLElement | null;
    tracks: PlaylistTrack[];
    uniqueId: string;
    private _timers;
    constructor(player: Player, options?: Record<string, unknown>);
    /**
     * Determine the media type for a track
     * @param {Object} track - Track object
     * @returns {string} - 'audio', 'video', 'youtube', 'vimeo', 'soundcloud', 'hls', 'dash'
     */
    getTrackMediaType(track: PlaylistTrack): "audio" | "hls" | "dash" | "youtube" | "vimeo" | "soundcloud" | "video";
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
     * Update player controls to add playlist navigation buttons
     */
    updatePlayerControls(): void;
    /**
     * Load a playlist
     * @param {Array} tracks - Array of track objects
     */
    loadPlaylist(tracks: PlaylistTrack[]): void;
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
    play(index: number, _userInitiated?: boolean): Promise<void>;
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
     * Update track info display
     */
    updateTrackInfo(track: PlaylistTrack): void;
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