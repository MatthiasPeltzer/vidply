/**
 * VidPly Playlist Manager
 * Manages playlists for audio and video content
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { sanitizePosterUrl, toCssBackgroundImage } from '../utils/UrlSafe.js';
import { reducedMotionScrollOptions } from '../utils/PerformanceUtils.js';
import { isPlaylistPanelRightDesktopViewport } from '../constants/layoutBreakpoints.js';
import { TrackInfoView } from '../core/TrackInfoView.js';
import type { TrackInfoData } from '../core/TrackInfoView.js';
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
type PlayerConstructor = new (
  element: string | HTMLElement,
  options?: Record<string, unknown>
) => Player;

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

// Static counter for unique IDs
let playlistInstanceCounter = 0;

export class PlaylistManager {
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
  // Timers owned by this manager. Tracked so destroy() can cancel any pending
  // deferred callback (auto-play, guard-flag resets, live-region clears,
  // focus moves) that would otherwise run against a torn-down player.
  private _timers: Set<ReturnType<typeof setTimeout>> = new Set();

  constructor(player: Player, options: Record<string, unknown> = {}) {
    this.player = player;
    this.tracks = [];
    this.initialTracks = Array.isArray(options.tracks) ? (options.tracks as PlaylistTrack[]) : [];
    this.currentIndex = -1;

    // Generate unique instance ID for this playlist
    this.instanceId = ++playlistInstanceCounter;
    this.uniqueId = `vidply-playlist-${this.instanceId}`;

    // Options. Spread the caller's bag last so we still support arbitrary
    // pass-through keys, but defaults stay typed.
    this.options = {
      ...options,
      autoAdvance: options.autoAdvance !== false, // Default true
      autoPlayFirst: options.autoPlayFirst !== false, // Default true - auto-play first track on load
      loop: Boolean(options.loop) || false,
      showPanel: options.showPanel !== false, // Default true
      panelPosition: PlaylistManager.normalizePanelPosition(options.panelPosition),
      recreatePlayers: Boolean(options.recreatePlayers) || false,
    };

    // UI elements
    this.container = null;
    this.playlistPanel = null;
    this.playlistMainElement = null;
    this.trackInfoView = null;
    this.trackArtworkElement = null;
    this.navigationFeedback = null; // Live region for keyboard navigation feedback
    this.isPanelVisible = this.options.showPanel !== false;

    // Track change guard to prevent cascade of next() calls
    this.isChangingTrack = false;

    // Store the host element for player recreation
    this.hostElement = (options.hostElement as HTMLElement | null | undefined) ?? null;
    this.PlayerClass = (options.PlayerClass as PlayerConstructor | null | undefined) ?? null;
    
    // Bind methods once so the same reference is used for both on() and off().
    // Binding inline at registration time (e.g. `.bind(this)` in init()) would
    // create a fresh function each call that off() can never match, leaking the
    // listener after destroy().
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
    this.handlePlaybackStateChange = this.handlePlaybackStateChange.bind(this);
    this.handleFullscreenChange = this.handleFullscreenChange.bind(this);
    this.handleAudioDescriptionChange = this.handleAudioDescriptionChange.bind(this);
    
    // Register this playlist manager with the player
    this.player.playlistManager = this;
    
    // Initialize
    this.init();
    
    // Update controls to add playlist buttons
    this.updatePlayerControls();
    
    // Load tracks if provided in options (after UI is ready)
    if (this.initialTracks.length > 0) {
      this.loadPlaylist(this.initialTracks);
    }
  }
  
  /**
   * Determine the media type for a track
   * @param {Object} track - Track object
   * @returns {string} - 'audio', 'video', 'youtube', 'vimeo', 'soundcloud', 'hls', 'dash'
   */
  getTrackMediaType(track: PlaylistTrack) {
    const src = track.src || '';
    
    if (src.includes('youtube.com') || src.includes('youtu.be')) {
      return 'youtube';
    }
    if (src.includes('vimeo.com')) {
      return 'vimeo';
    }
    if (src.includes('soundcloud.com') || src.includes('api.soundcloud.com')) {
      return 'soundcloud';
    }
    const normalizedType = (track.type || '').toLowerCase();
    if (normalizedType === 'youtube' || normalizedType === 'vimeo' || normalizedType === 'soundcloud') {
      return normalizedType;
    }
    if (src.includes('.m3u8')) {
      return 'hls';
    }
    if (src.includes('.mpd')) {
      return 'dash';
    }
    if (track.type && track.type.startsWith('audio/')) {
      return 'audio';
    }
    // Default to video for video types or unknown
    return 'video';
  }
  
  /**
   * Recreate the player with the appropriate element type for the track
   * @param {Object} track - Track to load
   * @param {boolean} autoPlay - Whether to auto-play after creation
   */
  async recreatePlayerForTrack(track: PlaylistTrack, autoPlay = false) {
    if (!this.hostElement || !this.PlayerClass) {
      console.warn('VidPly Playlist: Cannot recreate player - missing hostElement or PlayerClass');
      return false;
    }
    
    const mediaType = this.getTrackMediaType(track);
    // SoundCloud uses an iframe widget, so it doesn't need an audio element
    // Only local audio files need an actual <audio> element
    const elementType = (mediaType === 'audio') ? 'audio' : 'video';
    
    // Store playlist panel state
    const wasVisible = this.isPanelVisible;
    const savedTracks = [...this.tracks]; // Keep track data
    const savedIndex = this.currentIndex;
    
    // Detach all playlist UI elements from DOM (keep references)
    // These will be reattached to the new player container
    if (this.trackArtworkElement && this.trackArtworkElement.parentNode) {
      this.trackArtworkElement.parentNode.removeChild(this.trackArtworkElement);
    }
    // Always drop the reference — Player.init() creates a fresh node asynchronously
    // and reusing a detached/hidden element from a prior track leaves mixed playlists
    // without visible artwork after video → audio switches.
    this.trackArtworkElement = null;
    if (this.trackInfoView?.element.parentNode) {
      this.trackInfoView.element.parentNode.removeChild(this.trackInfoView.element);
    }
    if (this.navigationFeedback && this.navigationFeedback.parentNode) {
      this.navigationFeedback.parentNode.removeChild(this.navigationFeedback);
    }
    if (this.playlistPanel && this.playlistPanel.parentNode) {
      this.playlistPanel.parentNode.removeChild(this.playlistPanel);
    }
    
    // Preserve existing player options so recreated players behave
    // consistently. We use a loose `Record<string, unknown>` because
    // PlayerOptions includes optional fields and an open string-indexed
    // bag of pass-through values that the spread flattens.
    const preservedPlayerOptions: Record<string, unknown> =
      this.player?.options ? { ...this.player.options } : {};

    // Remove event listeners before destroying
    if (this.player) {
      this.player.off('ended', this.handleTrackEnd);
      this.player.off('error', this.handleTrackError);
      // Detach the back-reference *before* destroying the player.
      // Player.destroy() cascade-destroys its `playlistManager`, but here
      // we're swapping the player out and the PlaylistManager owns a UI
      // (panel, track info, artwork) that must survive the swap. Without
      // this detach, the cascade would clear() the panel and the playlist
      // visually disappears when the user clicks an audio track in a
      // mixed playlist.
      this.player.playlistManager = null;
      this.player.destroy();
    }
    
    // Clear the host element
    this.hostElement.innerHTML = '';
    
    // Create new media element with appropriate type
    const mediaElement = document.createElement(elementType);
    // Respect configured preload (playlists should behave like single videos even with deferLoad)
    const preloadValue = (preservedPlayerOptions.preload as string | undefined) || 'metadata';
    mediaElement.setAttribute('preload', preloadValue);
    
    // For video elements with local media, set poster
    if (elementType === 'video' && track.poster && 
        (mediaType === 'video' || mediaType === 'hls' || mediaType === 'dash')) {
      mediaElement.setAttribute('poster', track.poster);
    }
    
    // For external renderers (YouTube, Vimeo, SoundCloud, HLS, DASH), don't add source
    // The renderer will handle the source directly
    const isExternalRenderer = ['youtube', 'vimeo', 'soundcloud', 'hls', 'dash'].includes(mediaType);
    
    if (!isExternalRenderer) {
      // Add source for HTML5 media
      const source = document.createElement('source');
      source.src = track.src || '';
      if (track.type) {
        source.type = track.type;
      }
      mediaElement.appendChild(source);
      
      // Add tracks (captions, chapters, etc.)
      if (track.tracks && track.tracks.length > 0) {
        track.tracks.forEach((trackConfig: PlaylistTextTrack) => {
          const trackEl = document.createElement('track');
          trackEl.src = trackConfig.src || '';
          trackEl.kind = trackConfig.kind || 'captions';
          trackEl.srclang = trackConfig.srclang || 'en';
          trackEl.label = trackConfig.label || trackConfig.srclang || '';
          if (trackConfig.default) {
            trackEl.default = true;
          }
          mediaElement.appendChild(trackEl);
        });
      }
    }
    
    this.hostElement.appendChild(mediaElement);
    
    // Create new player with the media element — track-specific fields must
    // win over preserved options (e.g. poster from the previous video track).
    const playerOptions = Object.assign({}, preservedPlayerOptions, {
      mediaType: elementType,
      poster: track.poster,
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      audioDescriptionDuration: track.audioDescriptionDuration || null,
      signLanguageSrc: track.signLanguageSrc || null,
    });
    
    this.player = new this.PlayerClass(mediaElement, playerOptions);
    
    // Re-register playlist manager
    this.player.playlistManager = this;
    
    // Wait for player to be ready. Resolve immediately if the freshly created
    // player already flipped its ready state during construction — otherwise a
    // late on('ready') listener would miss the event and hang forever. A
    // managed timeout is a safety valve if 'ready' never fires (e.g. init error).
    await new Promise<void>(resolve => {
      if (this.player.state?.ready) {
        resolve();
        return;
      }
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      this.player.once('ready', done);
      this.setManagedTimeout(done, 5000);
    });
    
    // Re-attach event listeners
    this.player.on('ended', this.handleTrackEnd);
    this.player.on('error', this.handleTrackError);
    
    // Re-attach all playlist UI elements to the new player's container
    if (this.player.container) {
      // Track info
      if (this.trackInfoView) {
        this.player.container.appendChild(this.trackInfoView.element);
      }
      // Navigation feedback (screen reader only)
      if (this.navigationFeedback) {
        this.player.container.appendChild(this.navigationFeedback);
      }
      // Playlist panel
      if (this.playlistPanel) {
        this.player.container.appendChild(this.playlistPanel);
      }
    }
    
    // Update container reference and restore playlist state before re-applying layout.
    this.tracks = savedTracks;
    this.currentIndex = savedIndex;
    this.container = this.player.container;
    this.playlistMainElement = null;
    if (this.container) {
      this.container.classList.add('vidply-has-playlist');
    }
    this.applyPanelPositionClass();

    // Update controls (adds playlist prev/next buttons)
    this.updatePlayerControls();
    this.applyPanelPositionClass();
    
    // Update playlist UI to reflect current state
    this.updatePlaylistUI();
    
    // Restore playlist panel visibility
    this.isPanelVisible = wasVisible;
    if (this.playlistPanel) {
      this.playlistPanel.style.display = wasVisible ? '' : 'none';
    }
    
    const loadConfig = {
      src: track.src ?? '',
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || [],
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      signLanguageSrc: track.signLanguageSrc || null
    };

    // Await load so embed renderers (YouTube/Vimeo/SoundCloud) finish init
    // before we call play(). While load() runs the renderer is null; an early
    // play() would fall back into PlaylistManager.play() and load again.
    await this.player.load(loadConfig);

    if (autoPlay) {
      this.player.play();
    }

    // Keep TYPO3 host reference in sync (PlaylistInit caches player on the DIV).
    if (this.hostElement) {
      (this.hostElement as HTMLElement & { _vidplyPlayer?: Player })._vidplyPlayer = this.player;
    }

    this.updateTrackInfo(track);
    this.finalizeTrackArtworkForTrack(track);
    
    return true;
  }
  
  init() {
    // Listen for track end
    this.player.on('ended', this.handleTrackEnd);
    this.player.on('error', this.handleTrackError);
    
    // Listen for playback state changes to show/hide playlist in fullscreen.
    // Handlers are pre-bound in the constructor so destroy() can detach them.
    this.player.on('play', this.handlePlaybackStateChange);
    this.player.on('pause', this.handlePlaybackStateChange);
    this.player.on('ended', this.handlePlaybackStateChange);
    // Use fullscreenchange event which is what the player actually emits
    this.player.on('fullscreenchange', this.handleFullscreenChange);
    
    // Listen for audio description state changes to update duration displays
    this.player.on('audiodescriptionenabled', this.handleAudioDescriptionChange);
    this.player.on('audiodescriptiondisabled', this.handleAudioDescriptionChange);
    
    // Create UI if needed
    if (this.options.showPanel) {
      this.createUI();
    }
    
    // Check for data-playlist attribute on player container (only if tracks weren't provided in options)
    if (this.tracks.length === 0 && this.initialTracks.length === 0) {
      this.loadPlaylistFromAttribute();
    }
  }
  
  /**
   * Load playlist from data-playlist attribute if present
   */
  loadPlaylistFromAttribute() {
    // Check the original wrapper element for data-playlist
    // Structure: #audio-player -> .vidply-player -> .vidply-video-wrapper -> <audio>
    // So we need to go up 3 levels
    if (!this.player.element || !this.player.element.parentElement) {
      return;
    }
    
    const videoWrapper = this.player.element.parentElement; // .vidply-video-wrapper
    const playerContainer = videoWrapper.parentElement; // .vidply-player
    const originalElement = playerContainer ? playerContainer.parentElement : null; // #audio-player (original div)
    
    if (!originalElement) {
      return;
    }
    
    // Load playlist options from data attributes
    this.loadOptionsFromAttributes(originalElement);
    
    const playlistData = originalElement.getAttribute('data-playlist');
    if (!playlistData) {
      return;
    }
    
    try {
      const tracks = JSON.parse(playlistData);
      if (Array.isArray(tracks) && tracks.length > 0) {
        this.loadPlaylist(tracks);
      } else {
        console.warn('VidPly Playlist: data-playlist is not a valid array or is empty');
      }
    } catch (error) {
      console.error('VidPly Playlist: Failed to parse data-playlist attribute', error);
    }
  }
  
  /**
   * Load playlist options from data attributes
   * @param {HTMLElement} element - Element to read attributes from
   */
  loadOptionsFromAttributes(element: HTMLElement) {
    // data-playlist-auto-advance
    const autoAdvance = element.getAttribute('data-playlist-auto-advance');
    if (autoAdvance !== null) {
      this.options.autoAdvance = autoAdvance === 'true';
    }
    
    // data-playlist-auto-play-first
    const autoPlayFirst = element.getAttribute('data-playlist-auto-play-first');
    if (autoPlayFirst !== null) {
      this.options.autoPlayFirst = autoPlayFirst === 'true';
    }
    
    // data-playlist-loop
    const loop = element.getAttribute('data-playlist-loop');
    if (loop !== null) {
      this.options.loop = loop === 'true';
    }
    
    // data-playlist-show-panel
    const showPanel = element.getAttribute('data-playlist-show-panel');
    if (showPanel !== null) {
      this.options.showPanel = showPanel === 'true';
    }

    // data-playlist-panel-position
    const panelPosition = element.getAttribute('data-playlist-panel-position');
    if (panelPosition !== null) {
      this.options.panelPosition = PlaylistManager.normalizePanelPosition(panelPosition);
    }

    this.applyPanelPositionClass();
  }

  /**
   * Normalize a caller-supplied panel position to a supported value.
   */
  private static normalizePanelPosition(value: unknown): PlaylistPanelPosition {
    return value === 'right' ? 'right' : 'below';
  }

  /**
   * Apply or remove the layout modifier class on the player container.
   */
  private applyPanelPositionClass(): void {
    if (!this.container) {
      return;
    }

    // Player recreation replaces the container node. Re-apply the playlist marker
    // so layout CSS (`.vidply-has-playlist`) keeps matching after mixed-media swaps.
    if (this.tracks.length > 0 || this.playlistPanel) {
      this.container.classList.add('vidply-has-playlist');
    }

    // Player recreation replaces the container node; drop a wrapper that belonged
    // to the previous tree so ensurePlaylistMainLayout() can rebuild it.
    if (this.playlistMainElement && this.playlistMainElement.parentElement !== this.container) {
      this.playlistMainElement = null;
    }

    const isRight = this.options.panelPosition === 'right';
    this.container.classList.toggle('vidply-playlist-panel-right', isRight);

    if (isRight) {
      this.ensurePlaylistMainLayout();
      this.syncRightPanelMediaStyles();
    } else {
      this.teardownPlaylistMainLayout();
    }
  }

  /**
   * Group the media area (wrapper, track info, artwork) so the playlist can sit
   * beside it without stretching the video wrapper to the playlist height.
   */
  private ensurePlaylistMainLayout(): void {
    if (!this.container || this.playlistMainElement) {
      return;
    }

    const main = DOMUtils.createElement('div', {
      className: 'vidply-playlist-main',
    });
    const panel = this.playlistPanel;
    const children = Array.from(this.container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child !== panel
    );

    if (panel && panel.parentElement === this.container) {
      this.container.insertBefore(main, panel);
    } else {
      this.container.appendChild(main);
    }

    children.forEach(child => main.appendChild(child));
    this.orderPlaylistMainChildren(main);
    this.playlistMainElement = main;
  }

  /**
   * Left column order: artwork (optional) → video → controls (inside wrapper) → track info.
   */
  private orderPlaylistMainChildren(main: HTMLElement): void {
    const orderedSelectors = [
      '.vidply-track-artwork',
      '.vidply-video-wrapper',
      '.vidply-track-info',
    ];

    orderedSelectors.forEach(selector => {
      const node = main.querySelector(selector);
      if (node) {
        main.appendChild(node);
      }
    });

    // Keep screen-reader live regions after the visible column content.
    Array.from(main.children).forEach(child => {
      if (child.classList.contains('vidply-sr-only')) {
        main.appendChild(child);
      }
    });
  }

  /**
   * Insert a node before the video wrapper regardless of whether the right-panel
   * layout wrapped the player chrome in `.vidply-playlist-main`.
   */
  private insertBeforeVideoWrapper(element: HTMLElement): void {
    if (!this.container) {
      return;
    }

    const videoWrapper = this.playlistMainElement?.querySelector('.vidply-video-wrapper')
      ?? this.container.querySelector('.vidply-video-wrapper');
    if (videoWrapper?.parentElement) {
      videoWrapper.parentElement.insertBefore(element, videoWrapper);
      if (this.playlistMainElement && videoWrapper.parentElement === this.playlistMainElement) {
        this.orderPlaylistMainChildren(this.playlistMainElement);
      }
      return;
    }

    const host = this.playlistMainElement ?? this.container;
    host.appendChild(element);
  }

  /**
   * Inline 100% heights on the media element stretch the wrapper in grid layouts.
   */
  private syncRightPanelMediaStyles(): void {
    if (!this.container || this.options.panelPosition !== 'right') {
      return;
    }

    this.container.querySelectorAll('.vidply-video-wrapper > video, .vidply-video-wrapper > audio').forEach(node => {
      if (node instanceof HTMLElement) {
        node.style.height = 'auto';
      }
    });

    requestAnimationFrame(() => {
      this.player.positionPlayOverlayOnMobile();
    });
  }

  /**
   * Restore the default single-column DOM when the panel is below the player.
   */
  private teardownPlaylistMainLayout(): void {
    if (!this.container || !this.playlistMainElement) {
      return;
    }

    const main = this.playlistMainElement;
    while (main.firstChild) {
      if (this.playlistPanel) {
        this.container.insertBefore(main.firstChild, this.playlistPanel);
      } else {
        this.container.appendChild(main.firstChild);
      }
    }

    main.remove();
    this.playlistMainElement = null;
  }
  
  /**
   * Update player controls to add playlist navigation buttons
   */
  updatePlayerControls() {
    if (!this.player.controlBar) return;
    
    const controlBar = this.player.controlBar;
    
    // Clear existing controls content (except the element itself)
    controlBar.element.innerHTML = '';
    
    // Recreate controls with playlist buttons now available
    controlBar.createControls();
    
    // Reattach events for the new controls
    controlBar.attachEvents();
    controlBar.setupAutoHide();
  }

  /**
   * Move the control bar's download button to the selected track.
   *
   * Tracks may each offer their own file, and the control bar is not always
   * rebuilt on a track change (MSE renderers keep their controls), so the
   * button is refreshed explicitly.
   */
  refreshDownloadButton() {
    if (typeof this.player.controlBar?.updateDownloadButton === 'function') {
      this.player.controlBar.updateDownloadButton();
    }
  }
  
  /**
   * Load a playlist
   * @param {Array} tracks - Array of track objects
   */
  loadPlaylist(tracks: PlaylistTrack[]) {
    this.tracks = tracks;
    this.currentIndex = -1;
    
    // Add playlist class to container
    if (this.container) {
      this.container.classList.add('vidply-has-playlist');
      this.applyPanelPositionClass();
    }
    
    // Update UI
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
    
    // Auto-play first track (if enabled)
    if (tracks.length > 0) {
      if (this.options.autoPlayFirst) {
        this.play(0);
      } else {
        // Behave like a single video: load the first track (metadata/manifest)
        // but do not start playback.
        void this.loadTrack(0).catch(() => {
          // ignore
        });
      }
    }
    
    // Update visibility based on current state
    this.updatePlaylistVisibilityInFullscreen();
  }
  
  /**
   * Load a track without playing
   * This is the playlist equivalent of a "single video initialized but not started yet":
   * it updates UI selection and loads the media into the player so metadata/manifests
   * and feature managers can be ready, but it does not start playback.
   * @param {number} index - Track index
   */
  async loadTrack(index: number) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }
    
    const track = this.tracks[index];
    if (!track) return;
    
    // Always update UI immediately (poster, buttons, duration, etc.).
    // Note: this is UI-only; actual media loading is performed by player.load() below.
    this.selectTrack(index);
    
    // Set guard flag to prevent cascade of next() calls during track change
    this.isChangingTrack = true;
    
    // Check if we should recreate the player for this track type
    if (this.options.recreatePlayers && this.hostElement && this.PlayerClass) {
      const currentMediaType = this.player ? 
        (this.player.element.tagName === 'AUDIO' ? 'audio' : 'video') : null;
      const newMediaType = this.getTrackMediaType(track);
      const newElementType = (newMediaType === 'audio' || newMediaType === 'soundcloud') ? 'audio' : 'video';
      
      // Recreate if element type is different
      if (currentMediaType !== newElementType) {
        await this.recreatePlayerForTrack(track, false);
        // Re-apply selection to the newly created player (poster/tracks/buttons)
        this.selectTrack(index);
        
        // Emit event
        this.player.emit('playlisttrackchange', {
          index: index,
          item: track,
          total: this.tracks.length
        });
        
        // Clear guard flag
        this.setManagedTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    
    const loadPromise = this.player.load({
      src: track.src ?? '',
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || [],
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      signLanguageSrc: track.signLanguageSrc || null,
      signLanguageSources: track.signLanguageSources || {}
    });

    // For playlist UX parity with single videos: fetch metadata/manifest now,
    // but do not start playback.
    if (this.player?.options?.deferLoad && typeof this.player.ensureLoaded === 'function') {
      Promise.resolve(loadPromise)
        .then(() => this.player?.ensureLoaded?.())
        .catch(() => {
          // ignore
        });
    }
    
    // Emit event
    this.player.emit('playlisttrackchange', {
      index: index,
      item: track,
      total: this.tracks.length
    });
    
    // Clear guard flag after a short delay to ensure track is loaded
    this.setManagedTimeout(() => {
      this.isChangingTrack = false;
    }, 150);
  }

  /**
   * Select a track (UI/selection only; does NOT set the media src / does NOT initialize renderer)
   *
   * In "B always" playlist mode, you typically want `loadTrack()` on selection so the
   * selected item behaves like a single video (metadata/manifest loaded, features ready)
   * without auto-playing.
   * @param {number} index - Track index
   */
  selectTrack(index: number) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }

    const track = this.tracks[index];
    if (!track) return;
    this.currentIndex = index;

    // Apply per-track metadata without touching the media source.
    // This ensures poster + feature buttons (chapters/captions/transcript/sign-language)
    // can be updated instantly even before any media network activity happens.
    try {
      // Poster for video element — validate the URL from the manifest
      // before we hand it to `<video>.poster`. Without the allow-list an
      // attacker-controlled `javascript:` or `data:text/html` value could
      // reach the attribute.
      if (this.player?.element?.tagName === 'VIDEO') {
        if (track.poster) {
          const resolved: string = typeof this.player.resolvePosterPath === 'function'
            ? this.player.resolvePosterPath(track.poster)
            : track.poster;
          const posterUrl = sanitizePosterUrl(resolved);
          if (posterUrl) {
            (this.player.element as HTMLVideoElement).poster = posterUrl;
            (this.player as Player & { applyPosterAspectRatio?: (url: string) => void }).applyPosterAspectRatio?.(posterUrl);
          } else {
            this.player.element.removeAttribute('poster');
          }
        } else {
          this.player.element.removeAttribute('poster');
        }
      }

      // Update sign language / audio description sources (used for button visibility)
      this.player.audioDescriptionSrc = track.audioDescriptionSrc || null;
      this.player.signLanguageSrc = track.signLanguageSrc || null;
      this.player.signLanguageSources = track.signLanguageSources || {};
      this.player.options.signLanguageSrc = track.signLanguageSrc || null;
      this.player.options.signLanguageSources = track.signLanguageSources || {};

      // Fill duration early for UI (progress/time display) without loading media
      if (track.duration && Number(track.duration) > 0) {
        this.player.state.duration = Number(track.duration);
      }
      // Also sync feature managers (they keep their own copy of sources)
      if (this.player.audioDescriptionManager) {
        this.player.audioDescriptionManager.src = track.audioDescriptionSrc || null;
        // Remember original (non-described) source for switching back later
        this.player.audioDescriptionManager.originalSource = track.src || this.player.originalSrc || null;
      }
      if (this.player.signLanguageManager) {
        this.player.signLanguageManager.src = track.signLanguageSrc || null;
        this.player.signLanguageManager.sources = track.signLanguageSources || {};
        this.player.signLanguageManager.currentLanguage = null;
      }

      // For audio description switching, remember original source even before first play
      if (track.src && !this.player.originalSrc) {
        this.player.originalSrc = track.src;
      }

      // Replace <track> elements so captions/chapters/transcript can be detected/loaded
      const existing: HTMLElement[] = Array.from(this.player.element.querySelectorAll('track'));
      existing.forEach(t => t.remove());

      if (Array.isArray(track.tracks)) {
        track.tracks.forEach((tc: PlaylistTextTrack) => {
          if (!tc?.src) return;
          const el = document.createElement('track');
          el.src = tc.src;
          el.kind = tc.kind || 'captions';
          el.srclang = tc.srclang || 'en';
          el.label = tc.label || tc.srclang || 'Track';
          if (tc.default) el.default = true;
          if (tc.describedSrc) {
            el.setAttribute('data-desc-src', tc.describedSrc);
          }
          this.player.element.appendChild(el);
        });
      }

      if (typeof this.player.invalidateTrackCache === 'function') {
        this.player.invalidateTrackCache();
      }

      // Re-scan described-track metadata for the AudioDescriptionManager. The
      // manager is no longer eagerly loaded on content-less players, so if this
      // track is the first to introduce described content, pull the chunk in
      // lazily before re-scanning.
      const reinitAudioDescription = (adm: Player['audioDescriptionManager']) => {
        if (!adm || typeof adm.initFromSourceElements !== 'function') return;
        try {
          adm.captionTracks = [];
          adm.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
        } catch {
          // ignore
        }
      };
      if (this.player.audioDescriptionManager) {
        reinitAudioDescription(this.player.audioDescriptionManager);
      } else if (this.player.hasAudioDescriptionContent?.()) {
        void this.player.ensureAudioDescriptionManager()
          .then(reinitAudioDescription)
          .catch(() => { /* ignore */ });
      }

      // Refresh caption/transcript managers so menus reflect newly injected <track> elements
      // (important when we defer MP4/MP3 loading but still want VTT-based UI to work).
      if (this.player.captionManager && typeof this.player.captionManager.loadTracks === 'function') {
        try {
          this.player.captionManager.tracks = [];
          this.player.captionManager.currentTrack = null;
          this.player.captionManager.loadTracks();
        } catch {
          // ignore
        }
      }

      // TranscriptManager reads from TextTracks too; it will be correct after media starts.
      // For now, we just ensure control bar is rebuilt so the button is present.

      // Rebuild controls so feature buttons appear immediately
      if (typeof this.player.updateControlBar === 'function') {
        this.player.updateControlBar();
      }
    } catch {
      // ignore preview errors; selection should still work
    }

    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    this.refreshDownloadButton();

    this.player.emit('playlisttrackselect', {
      index,
      item: track,
      total: this.tracks.length
    });
  }
  
  /**
   * Play a specific track
   * @param {number} index - Track index
   * @param {boolean} userInitiated - Whether this was triggered by user action (default: false)
   */
  async play(index: number, _userInitiated = false) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }
    
    const track = this.tracks[index];
    if (!track) return;
    
    // Set guard flag to prevent cascade of next() calls during track change
    this.isChangingTrack = true;
    
    // Update current index
    this.currentIndex = index;
    
    // Check if we should recreate the player for this track type
    if (this.options.recreatePlayers && this.hostElement && this.PlayerClass) {
      const currentMediaType = this.player ? 
        (this.player.element.tagName === 'AUDIO' ? 'audio' : 'video') : null;
      const newMediaType = this.getTrackMediaType(track);
      const newElementType = (newMediaType === 'audio' || newMediaType === 'soundcloud') ? 'audio' : 'video';
      
      // Recreate if element type is different
      if (currentMediaType !== newElementType) {
        await this.recreatePlayerForTrack(track, true); // true = autoPlay
        // Update UI after recreation
        this.updateTrackInfo(track);
        this.updatePlaylistUI();
        this.refreshDownloadButton();
        
        // Emit event
        this.player.emit('playlisttrackchange', {
          index: index,
          item: track,
          total: this.tracks.length
        });
        
        // Clear guard flag
        this.setManagedTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    
    // Load track into player (normal path)
    // If audio description was toggled before the first play, load the described source directly.
    let srcToLoad = track.src;
    if (this.player?.audioDescriptionManager?.desiredState && track.audioDescriptionSrc) {
      this.player.originalSrc = track.src ?? null;
      this.player.audioDescriptionManager.originalSource = track.src ?? null;
      this.player.audioDescriptionManager.src = track.audioDescriptionSrc;
      srcToLoad = track.audioDescriptionSrc;
    }

    try {
      await this.player.load({
        src: srcToLoad ?? '',
        type: track.type,
        poster: track.poster,
        tracks: track.tracks || [],
        audioDescriptionSrc: track.audioDescriptionSrc || null,
        signLanguageSrc: track.signLanguageSrc || null,
        signLanguageSources: track.signLanguageSources || {}
      });
    } catch {
      this.isChangingTrack = false;
      return;
    }

    // Update UI
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    this.refreshDownloadButton();
    
    // Emit event
    this.player.emit('playlisttrackchange', {
      index: index,
      item: track,
      total: this.tracks.length
    });
    
    // Start playback only after load() resolved — embed renderers keep
    // `renderer` null until init finishes; a timed play() fired too early
    // re-entered this method and loaded the same track again (often 2–3×).
    this.player.play();

    this.setManagedTimeout(() => {
      this.isChangingTrack = false;
    }, 50);
  }
  
  /**
   * Play next track
   */
  next() {
    let nextIndex = this.currentIndex + 1;
    
    if (nextIndex >= this.tracks.length) {
      if (this.options.loop) {
        nextIndex = 0;
      } else {
        return;
      }
    }
    
    this.play(nextIndex);
  }
  
  /**
   * Play previous track
   */
  previous() {
    let prevIndex = this.currentIndex - 1;
    
    if (prevIndex < 0) {
      if (this.options.loop) {
        prevIndex = this.tracks.length - 1;
      } else {
        return;
      }
    }
    
    this.play(prevIndex);
  }
  
  /**
   * Handle track end
   */
  handleTrackEnd() {
    // Don't auto-advance if we're already in the process of changing tracks
    // This prevents a cascade of next() calls when loading a new track triggers an 'ended' event
    if (this.isChangingTrack) {
      return;
    }
    
    if (this.options.autoAdvance) {
      this.next();
    }
  }
  
  /**
   * Check if a source URL requires an external renderer
   * @param {string} src - Source URL
   * @returns {boolean}
   */
  isExternalRendererUrl(src: string | null | undefined) {
    if (!src) return false;
    return src.includes('youtube.com') || 
           src.includes('youtu.be') || 
           src.includes('vimeo.com') || 
           src.includes('soundcloud.com') || 
           src.includes('api.soundcloud.com') ||
           src.includes('.m3u8') ||
           src.includes('.mpd');
  }

  /**
   * Handle track error
   */
  handleTrackError(e: unknown) {
    // Don't auto-advance for external renderer tracks
    // External renderers (YouTube, Vimeo, SoundCloud, HLS, DASH) may trigger HTML5 errors
    // that should be ignored since the external renderer handles playback
    const currentTrack = this.getCurrentTrack();
    if (currentTrack && currentTrack.src && this.isExternalRendererUrl(currentTrack.src)) {
      // Silently ignore errors for external renderer tracks
      return;
    }
    
    // Don't auto-advance if we're in the process of changing tracks
    // This prevents a cascade of next() calls when switching between renderer types
    if (this.isChangingTrack) {
      return;
    }
    
    console.error('VidPly Playlist: Track error', e);
    
    // Try next track
    if (this.options.autoAdvance) {
      this.setManagedTimeout(() => {
        this.next();
      }, 1000);
    }
  }
  
  /**
   * Handle playback state changes (for fullscreen playlist visibility)
   */
  handlePlaybackStateChange() {
    this.updatePlaylistVisibilityInFullscreen();
  }
  
  /**
   * Handle fullscreen state changes
   */
  handleFullscreenChange() {
    // Use a small delay to ensure fullscreen state is fully applied
    this.setManagedTimeout(() => {
      this.updatePlaylistVisibilityInFullscreen();
    }, 50);
  }
  
  /**
   * Handle audio description state changes
   * Updates duration displays to show audio-described version duration when AD is enabled
   */
  handleAudioDescriptionChange() {
    const currentTrack = this.getCurrentTrack();
    if (!currentTrack) return;
    
    // Update the track info display with the appropriate duration
    this.updateTrackInfo(currentTrack);
    
    // Update the playlist UI to reflect duration changes (aria-labels)
    this.updatePlaylistUI();
    
    // Update visual duration elements in playlist panel
    this.updatePlaylistDurations();
  }
  
  /**
   * Update the visual duration displays in the playlist panel
   * Called when audio description state changes
   */
  updatePlaylistDurations() {
    if (!this.playlistPanel) return;
    
    const items = this.playlistPanel.querySelectorAll('.vidply-playlist-item');
    
    items.forEach((item: Element, index: number) => {
      const track = this.tracks[index];
      if (!track) return;
      
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration as number) : '';
      
      // Update duration badge on thumbnail (if exists)
      const durationBadge = item.querySelector('.vidply-playlist-duration-badge');
      if (durationBadge) {
        durationBadge.textContent = trackDuration;
      }
      
      // Update inline duration (if exists)
      const inlineDuration = item.querySelector('.vidply-playlist-item-duration');
      if (inlineDuration) {
        inlineDuration.textContent = trackDuration;
      }
    });
  }
  
  /**
   * Get the effective duration for a track based on audio description state
   * @param {Object} track - Track object
   * @returns {number|null} - Duration in seconds or null if not available
   */
  getEffectiveDuration(track: PlaylistTrack) {
    if (!track) return null;
    
    const isAudioDescriptionEnabled = this.player.state.audioDescriptionEnabled;
    
    // If audio description is enabled and track has audioDescriptionDuration, use it
    if (isAudioDescriptionEnabled && track.audioDescriptionDuration) {
      return track.audioDescriptionDuration;
    }
    
    // Otherwise use regular duration
    return track.duration || null;
  }
  
  /**
   * Update playlist visibility based on fullscreen and playback state
   * In fullscreen: show when paused/not started, hide when playing
   * Outside fullscreen: respect original panel visibility setting
   */
  updatePlaylistVisibilityInFullscreen() {
    const playlistPanel = this.playlistPanel;
    if (!playlistPanel || !this.tracks.length) return;

    const isFullscreen = this.player.state.fullscreen;
    const isPlaying = this.player.state.playing;

    if (isFullscreen) {
      // In fullscreen: show only when not playing (paused or not started)
      // Check playing state explicitly since paused might not be set initially
      if (!isPlaying) {
        playlistPanel.classList.add('vidply-playlist-fullscreen-visible');
        playlistPanel.style.display = 'block';
      } else {
        playlistPanel.classList.remove('vidply-playlist-fullscreen-visible');
        // Add a smooth fade out with delay to match CSS transition
        this.setManagedTimeout(() => {
          // Double-check state hasn't changed before hiding
          if (this.player.state.playing && this.player.state.fullscreen) {
            playlistPanel.style.display = 'none';
          }
        }, 300); // Match CSS transition duration
      }
    } else {
      // Outside fullscreen: restore original behavior
      playlistPanel.classList.remove('vidply-playlist-fullscreen-visible');
      if (this.isPanelVisible && this.tracks.length > 0) {
        playlistPanel.style.display = 'block';
      } else {
        playlistPanel.style.display = 'none';
      }
    }
  }
  
  /**
   * Create playlist UI
   */
  createUI() {
    // Find player container
    this.container = this.player.container;
    
    if (!this.container) {
      console.warn('VidPly Playlist: No container found');
      return;
    }
    
    // Track artwork element (shows album art/poster for audio tracks).
    // Important: in mixed playlists the player may start as <video> and later recreate to <audio>,
    // so we create this lazily in `updateTrackArtwork()` when we actually have an audio element.
    
    // Track metadata header above the media element.
    this.trackInfoView = new TrackInfoView(this.player.options.classPrefix);
    this.trackInfoView.mount(this.container);
    
    // Create navigation feedback live region
    this.navigationFeedback = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      attributes: {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });
    this.container.appendChild(this.navigationFeedback);
    
    // Create playlist panel with proper landmark
    this.playlistPanel = DOMUtils.createElement('div', {
      className: 'vidply-playlist-panel',
      attributes: {
        id: `${this.uniqueId}-panel`,
        role: 'region',
        'aria-label': i18n.t('playlist.title'),
        'aria-labelledby': `${this.uniqueId}-heading`
      }
    });
    this.playlistPanel.style.display = this.isPanelVisible ? 'none' : 'none'; // Will be shown when playlist is loaded
    
    this.container.appendChild(this.playlistPanel);
    this.applyPanelPositionClass();
  }
  
  /**
   * Update track info display
   */
  updateTrackInfo(track: PlaylistTrack) {
    if (this.trackInfoView) {
      const effectiveDuration = this.getEffectiveDuration(track);
      const data: TrackInfoData = {
        title: track.title,
        artist: track.artist,
        description: track.description,
        longDescription: typeof track.longDescription === 'string' ? track.longDescription : undefined,
        date: typeof track.date === 'string' ? track.date : undefined,
        duration: effectiveDuration ? Number(effectiveDuration) : undefined,
        trackNumber: this.currentIndex + 1,
        totalTracks: this.tracks.length
      };

      this.trackInfoView.render(data);
    }

    // Artwork is independent of the metadata header (must survive player recreation).
    this.updateTrackArtwork(track);
    this.syncRightPanelMediaStyles();
  }
  
  /**
   * Resolve a track poster for CSS/artwork (absolute URL + allow-list).
   */
  private resolveTrackPosterForArtwork(poster: string | undefined): string | null {
    if (!poster) {
      return null;
    }
    const resolved = typeof this.player?.resolvePosterPath === 'function'
      ? this.player.resolvePosterPath(poster)
      : poster;
    return toCssBackgroundImage(resolved);
  }

  /**
   * Locate an existing artwork node in the current player tree.
   */
  private findExistingTrackArtworkElement(): HTMLElement | null {
    const candidates: (HTMLElement | null | undefined)[] = [
      this.player?.trackArtworkElement ?? null,
      this.playlistMainElement,
      this.container,
      this.hostElement,
    ];

    for (const root of candidates) {
      if (!root) {
        continue;
      }
      if (root.classList.contains('vidply-track-artwork')) {
        return root;
      }
      const nested = root.querySelector('.vidply-track-artwork');
      if (nested instanceof HTMLElement) {
        return nested;
      }
    }

    return null;
  }

  /**
   * Keep a single artwork node — Player init and PlaylistManager can both create one.
   */
  private dedupeTrackArtworkElements(keep: HTMLElement): void {
    const roots = [this.playlistMainElement, this.container, this.hostElement].filter(
      (root): root is HTMLElement => root instanceof HTMLElement
    );

    roots.forEach(root => {
      root.querySelectorAll('.vidply-track-artwork').forEach((el) => {
        if (el !== keep) {
          el.remove();
        }
      });
    });

    if (this.player) {
      this.player.trackArtworkElement = keep;
    }
  }

  /**
   * Re-apply artwork after player recreation and right-panel layout settle.
   */
  private finalizeTrackArtworkForTrack(track: PlaylistTrack): void {
    this.updateTrackArtwork(track);
    requestAnimationFrame(() => {
      this.updateTrackArtwork(track);
    });
  }

  /**
   * Whether a playlist track uses an external embed renderer (not local HTML5 media).
   */
  private isExternalEmbedTrack(track: PlaylistTrack): boolean {
    const mediaType = this.getTrackMediaType(track);
    return mediaType === 'youtube' || mediaType === 'vimeo' || mediaType === 'soundcloud';
  }

  /**
   * Hide every track-artwork node in the current playlist layout.
   */
  private hideTrackArtworkElements(clearBackground = false): void {
    const roots = [this.playlistMainElement, this.container, this.hostElement].filter(
      (root): root is HTMLElement => root instanceof HTMLElement
    );

    roots.forEach((root) => {
      root.querySelectorAll('.vidply-track-artwork').forEach((el) => {
        if (!(el instanceof HTMLElement)) {
          return;
        }
        if (clearBackground) {
          el.style.backgroundImage = '';
        }
        el.style.display = 'none';
      });
    });

    if (this.trackArtworkElement) {
      if (clearBackground) {
        this.trackArtworkElement.style.backgroundImage = '';
      }
      this.trackArtworkElement.style.display = 'none';
    }
  }

  /**
   * Update track artwork display (for audio playlists)
   */
  updateTrackArtwork(track: PlaylistTrack) {
    // External embeds use the privacy overlay poster — never duplicate it in track artwork.
    if (this.isExternalEmbedTrack(track)) {
      this.hideTrackArtworkElements(true);
      return;
    }

    // Privacy consent may force-hide artwork while the overlay is visible.
    const forcedHidden = this.trackArtworkElement?.getAttribute('data-vidply-artwork-forced-hidden') === 'true'
      || this.container?.querySelector('.vidply-track-artwork[data-vidply-artwork-forced-hidden="true"]') instanceof HTMLElement
      || this.playlistMainElement?.querySelector('.vidply-track-artwork[data-vidply-artwork-forced-hidden="true"]') instanceof HTMLElement;
    if (forcedHidden) {
      return;
    }

    // Only show artwork for audio players.
    // In mixed playlists we may recreate from <video> -> <audio> later, so ensure the element exists lazily.
    if (this.player?.element?.tagName !== 'AUDIO') {
      this.hideTrackArtworkElements();
      return;
    }

    // Reuse artwork from Player init or a prior track switch (mixed playlists recreate the player).
    if (!this.trackArtworkElement) {
      const existing = this.findExistingTrackArtworkElement();
      if (existing) {
        this.trackArtworkElement = existing;
      }
    }

    // Lazily create artwork element once we have an audio element/container.
    if (!this.trackArtworkElement && this.container) {
      this.trackArtworkElement = DOMUtils.createElement('div', {
        className: 'vidply-track-artwork',
        attributes: {
          'aria-hidden': 'true'
        }
      });
      this.trackArtworkElement.style.display = 'none';

      // Insert before video wrapper (if present) for consistent layout.
      this.insertBeforeVideoWrapper(this.trackArtworkElement);
    }

    if (!this.trackArtworkElement) return;

    this.dedupeTrackArtworkElements(this.trackArtworkElement);
    
    // A track manifest is attacker-influenced data — a value like
    // `x); background: url(evil.svg` must not be allowed to break out
    // of the declaration. `toCssBackgroundImage` returns null when the
    // URL fails validation, so we leave the element hidden instead of
    // assigning a dangerous value.
    const safeBackground = this.resolveTrackPosterForArtwork(track.poster);
    if (safeBackground) {
      this.trackArtworkElement.style.backgroundImage = safeBackground;
      this.trackArtworkElement.removeAttribute('data-vidply-hidden');
      this.trackArtworkElement.style.removeProperty('display');
      this.trackArtworkElement.style.display = 'block';
      // Layout may wrap the media column after recreation — always re-home the node.
      this.insertBeforeVideoWrapper(this.trackArtworkElement);
      // The player may have created its play overlay before any artwork
      // existed (playlists resolve the poster per track).
      this.player?.mountPlayButtonOverlay(this.trackArtworkElement);
    } else {
      this.trackArtworkElement.style.backgroundImage = '';
      this.trackArtworkElement.style.display = 'none';
    }
  }
  
  /**
   * Render playlist
   */
  renderPlaylist() {
    if (!this.playlistPanel) return;
    
    // Clear existing
    this.playlistPanel.innerHTML = '';
    
    // Create header
    const header = DOMUtils.createElement('h2', {
      className: 'vidply-playlist-header',
      attributes: {
        id: `${this.uniqueId}-heading`
      }
    });
    header.textContent = `${i18n.t('playlist.title')} (${this.tracks.length})`;
    this.playlistPanel.appendChild(header);
    
    // Add keyboard instructions (visually hidden)
    const instructions = DOMUtils.createElement('div', {
      className: 'vidply-sr-only',
      attributes: {
        id: `${this.uniqueId}-keyboard-instructions`
      }
    });
    instructions.textContent = i18n.t('playlist.keyboardInstructions');
    this.playlistPanel.appendChild(instructions);
    
    // Create list (proper ul element)
    // Note: role="listbox" requires option children. We use role="none" on <li> elements
    // so the buttons with role="option" become the semantic children of the listbox.
    const list = DOMUtils.createElement('ul', {
      className: 'vidply-playlist-list',
      attributes: {
        role: 'listbox',
        'aria-labelledby': `${this.uniqueId}-heading`,
        'aria-describedby': `${this.uniqueId}-keyboard-instructions`
      }
    });
    
    this.tracks.forEach((track, index) => {
      const item = this.createPlaylistItem(track, index);
      list.appendChild(item);
    });
    
    this.playlistPanel.appendChild(list);
    
    // Show panel if it should be visible
    if (this.isPanelVisible) {
      this.playlistPanel.style.display = 'block';
    }

    this.syncPanelCollapsedLayout();
  }
  
  /**
   * Create playlist item element
   */
  createPlaylistItem(track: PlaylistTrack, index: number) {
    const trackTitle = track.title || i18n.t('playlist.trackUntitled', { number: index + 1 });
    const trackArtist = track.artist ? i18n.t('playlist.by') + track.artist : '';
    
    // Use effective duration (audio description duration when AD is enabled)
    const effectiveDuration = this.getEffectiveDuration(track);
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration as number) : '';
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration as number) : '';
    const isActive = index === this.currentIndex;
    
    // Build accessible label for screen readers
    // With role="option" and aria-selected, screen reader will announce selection state
    // Position is already announced via aria-posinset/aria-setsize
    // Format: "Title by Artist. 3 minutes, 45 seconds."
    const trackDate = typeof track.date === 'string' ? track.date : '';
    
    let ariaLabel = `${trackTitle}${trackArtist}`;
    if (trackDate) {
      ariaLabel += `. ${trackDate}`;
    }
    if (trackDurationReadable) {
      ariaLabel += `. ${trackDurationReadable}`;
    }
    
    // Create list item container
    // role="none" removes the <li> from the accessibility tree so the button with
    // role="option" becomes the direct semantic child of the listbox (required by ARIA).
    const item = DOMUtils.createElement('li', {
      className: isActive ? 'vidply-playlist-item vidply-playlist-item-active' : 'vidply-playlist-item',
      attributes: {
        'data-playlist-index': String(index),
        role: 'none'
      }
    });
    
    // Create button wrapper for interactive content
    const button = DOMUtils.createElement('button', {
      className: 'vidply-playlist-item-button',
      attributes: {
        type: 'button',
        role: 'option',
        tabIndex: index === 0 ? '0' : '-1',
        'aria-label': ariaLabel,
        'aria-posinset': String(index + 1),
        'aria-setsize': String(this.tracks.length),
        'aria-selected': isActive ? 'true' : 'false'
      }
    });
    
    // Add aria-current if active
    if (isActive) {
      button.setAttribute('aria-current', 'true');
      button.setAttribute('tabIndex', '0'); // Active item should always be tabbable
    }
    
    // Thumbnail container with optional duration badge
    const thumbnailContainer = DOMUtils.createElement('span', {
      className: 'vidply-playlist-thumbnail-container',
      attributes: {
        'aria-hidden': 'true'
      }
    });
    
    // Thumbnail or icon
    const thumbnail = DOMUtils.createElement('span', {
      className: 'vidply-playlist-thumbnail'
    });
    
    // Same rule as trackArtworkElement below: only set backgroundImage
    // when the manifest URL passes the allow-list so a hostile feed
    // cannot break out of the CSS `url(...)` declaration.
    const safeThumbnail = track.poster ? toCssBackgroundImage(track.poster) : null;
    if (safeThumbnail) {
      thumbnail.style.backgroundImage = safeThumbnail;
    } else {
      const icon = createIconElement('music');
      icon.classList.add('vidply-playlist-thumbnail-icon');
      thumbnail.appendChild(icon);
    }
    
    thumbnailContainer.appendChild(thumbnail);
    
    // Duration badge on thumbnail (like YouTube) - only show if there's a poster
    if (trackDuration && track.poster) {
      const durationBadge = DOMUtils.createElement('span', {
        className: 'vidply-playlist-duration-badge'
      });
      durationBadge.textContent = trackDuration;
      thumbnailContainer.appendChild(durationBadge);
    }
    
    button.appendChild(thumbnailContainer);
    
    // Info section (title, artist, description)
    const info = DOMUtils.createElement('span', {
      className: 'vidply-playlist-item-info',
      attributes: {
        'aria-hidden': 'true'
      }
    });
    
    // Title row with optional inline duration (for when no thumbnail)
    const titleRow = DOMUtils.createElement('span', {
      className: 'vidply-playlist-item-title-row'
    });
    
    const title = DOMUtils.createElement('span', {
      className: 'vidply-playlist-item-title'
    });
    title.textContent = trackTitle;
    titleRow.appendChild(title);
    
    // Inline duration (shown when no poster/thumbnail)
    if (trackDuration && !track.poster) {
      const inlineDuration = DOMUtils.createElement('span', {
        className: 'vidply-playlist-item-duration'
      });
      inlineDuration.textContent = trackDuration;
      titleRow.appendChild(inlineDuration);
    }
    
    info.appendChild(titleRow);
    
    // Artist
    if (track.artist) {
      const artist = DOMUtils.createElement('span', {
        className: 'vidply-playlist-item-artist'
      });
      artist.textContent = track.artist;
      info.appendChild(artist);
    }
    
    // Publish date (preformatted by the host application)
    if (trackDate) {
      const date = DOMUtils.createElement('span', {
        className: 'vidply-playlist-item-date'
      });
      date.textContent = trackDate;
      info.appendChild(date);
    }
    
    // Description (truncated)
    if (track.description) {
      const description = DOMUtils.createElement('span', {
        className: 'vidply-playlist-item-description'
      });
      description.textContent = track.description;
      info.appendChild(description);
    }
    
    button.appendChild(info);
    
    // Play icon
    const playIcon = createIconElement('play');
    playIcon.classList.add('vidply-playlist-item-icon');
    playIcon.setAttribute('aria-hidden', 'true');
    button.appendChild(playIcon);
    
    // Click handler
    button.addEventListener('click', () => {
      const track = this.tracks[index];
      const isExternalRenderer = this.isExternalRendererUrl(track?.src);
      
      // Exit fullscreen for external renderer tracks (YouTube, Vimeo, SoundCloud)
      // These have their own native controls that work better outside vidply's fullscreen
      if (isExternalRenderer && this.player.state.fullscreen) {
        this.player.exitFullscreen();
        // Small delay to let fullscreen exit before loading
        this.setManagedTimeout(() => {
          this.play(index, true);
        }, 100);
      } else {
        this.play(index, true); // User-initiated
      }
    });
    
    // Keyboard handler
    button.addEventListener('keydown', (e) => {
      this.handlePlaylistItemKeydown(e, index);
    });
    
    // Append button to list item
    item.appendChild(button);
    
    return item;
  }
  
  /**
   * Handle keyboard navigation in playlist items
   */
  handlePlaylistItemKeydown(e: KeyboardEvent, index: number) {
    if (!this.playlistPanel) return;
    const buttons: HTMLElement[] = Array.from(this.playlistPanel.querySelectorAll('.vidply-playlist-item-button'));
    let newIndex = -1;
    let announcement = '';
    
    switch(e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        e.stopPropagation();
        {
          const track = this.tracks[index];
          const isExternalRenderer = this.isExternalRendererUrl(track?.src);
          
          // Exit fullscreen for external renderer tracks (YouTube, Vimeo, SoundCloud)
          if (isExternalRenderer && this.player.state.fullscreen) {
            this.player.exitFullscreen();
            this.setManagedTimeout(() => {
              this.play(index, true);
            }, 100);
          } else {
            this.play(index, true); // User-initiated
          }
        }
        return; // No need to move focus
        
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        // Move to next item
        if (index < buttons.length - 1) {
          newIndex = index + 1;
        } else {
          // At the end, announce boundary
          announcement = i18n.t('playlist.endOfPlaylist', { current: buttons.length, total: buttons.length });
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        // Move to previous item
        if (index > 0) {
          newIndex = index - 1;
        } else {
          // At the beginning, announce boundary
          announcement = i18n.t('playlist.beginningOfPlaylist', { total: buttons.length });
        }
        break;

      case 'PageDown':
        e.preventDefault();
        e.stopPropagation();
        // Move 5 items down (or to end)
        newIndex = Math.min(index + 5, buttons.length - 1);
        if (newIndex === buttons.length - 1 && index !== newIndex) {
          announcement = i18n.t('playlist.jumpedToLastTrack', { current: newIndex + 1, total: buttons.length });
        }
        break;

      case 'PageUp':
        e.preventDefault();
        e.stopPropagation();
        // Move 5 items up (or to beginning)
        newIndex = Math.max(index - 5, 0);
        if (newIndex === 0 && index !== newIndex) {
          announcement = i18n.t('playlist.jumpedToFirstTrack', { total: buttons.length });
        }
        break;

      case 'Home':
        e.preventDefault();
        e.stopPropagation();
        // Move to first item
        newIndex = 0;
        if (index !== 0) {
          announcement = i18n.t('playlist.firstTrack', { total: buttons.length });
        }
        break;

      case 'End':
        e.preventDefault();
        e.stopPropagation();
        // Move to last item
        newIndex = buttons.length - 1;
        if (index !== buttons.length - 1) {
          announcement = i18n.t('playlist.lastTrack', { current: buttons.length, total: buttons.length });
        }
        break;
    }
    
    // Update tab indices for roving tabindex pattern
    if (newIndex !== -1 && newIndex !== index) {
      const currentButton = buttons[index];
      const newButton = buttons[newIndex];
      if (currentButton && newButton) {
        currentButton.setAttribute('tabIndex', '-1');
        newButton.setAttribute('tabIndex', '0');
        newButton.focus({ preventScroll: false });

        // Scroll the focused item into view (same behavior as mouse interaction)
        const item = newButton.closest('.vidply-playlist-item');
        if (item) {
          item.scrollIntoView(reducedMotionScrollOptions('nearest'));
        }
      }
    }
    
    // Announce navigation feedback
    if (announcement && this.navigationFeedback) {
      this.navigationFeedback.textContent = announcement;
      // Clear after a short delay to allow for repeated announcements
      this.setManagedTimeout(() => {
        if (this.navigationFeedback) {
          this.navigationFeedback.textContent = '';
        }
      }, 1000);
    }
  }
  
  /**
   * Update playlist UI (highlight current track)
   */
  updatePlaylistUI() {
    if (!this.playlistPanel) return;
    
    const items = this.playlistPanel.querySelectorAll('.vidply-playlist-item');
    const buttons = this.playlistPanel.querySelectorAll('.vidply-playlist-item-button');
    
    items.forEach((item: Element, index: number) => {
      const button = buttons[index];
      if (!button) return;
      
      const track = this.tracks[index];
      if (!track) return;
      const trackTitle = track.title || i18n.t('playlist.trackUntitled', { number: index + 1 });
      const trackArtist = track.artist ? i18n.t('playlist.by') + track.artist : '';
      
      // Use effective duration (audio description duration when AD is enabled)
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration as number) : '';
      
      if (index === this.currentIndex) {
        // Update list item styling
        item.classList.add('vidply-playlist-item-active');
        
        // Update button ARIA attributes
        button.setAttribute('aria-current', 'true');
        button.setAttribute('aria-selected', 'true');
        button.setAttribute('tabIndex', '0'); // Active item should be tabbable
        
        // Simplified aria-label - status and actions are announced via ARIA roles
        let ariaLabel = `${trackTitle}${trackArtist}`;
        if (trackDurationReadable) {
          ariaLabel += `. ${trackDurationReadable}`;
        }
        button.setAttribute('aria-label', ariaLabel);
        
        // Scroll into view within playlist panel (uses 'nearest' to minimize page scroll)
        item.scrollIntoView(reducedMotionScrollOptions('nearest'));
      } else {
        // Update list item styling
        item.classList.remove('vidply-playlist-item-active');
        
        // Update button ARIA attributes
        button.removeAttribute('aria-current');
        button.setAttribute('aria-selected', 'false');
        button.setAttribute('tabIndex', '-1'); // Remove from tab order (use arrow keys)
        
        // Simplified aria-label - status and actions are announced via ARIA roles
        let ariaLabel = `${trackTitle}${trackArtist}`;
        if (trackDurationReadable) {
          ariaLabel += `. ${trackDurationReadable}`;
        }
        button.setAttribute('aria-label', ariaLabel);
      }
    });
  }
  
  /**
   * Get current track
   */
  getCurrentTrack() {
    return this.tracks[this.currentIndex] || null;
  }
  
  /**
   * Get playlist info
   */
  getPlaylistInfo() {
    return {
      currentIndex: this.currentIndex,
      totalTracks: this.tracks.length,
      currentTrack: this.getCurrentTrack(),
      hasNext: this.hasNext(),
      hasPrevious: this.hasPrevious()
    };
  }
  
  /**
   * Check if there is a next track
   */
  hasNext() {
    if (this.options.loop) return true;
    return this.currentIndex < this.tracks.length - 1;
  }
  
  /**
   * Check if there is a previous track
   */
  hasPrevious() {
    if (this.options.loop) return true;
    return this.currentIndex > 0;
  }
  
  /**
   * Add track to playlist
   */
  addTrack(track: PlaylistTrack) {
    this.tracks.push(track);
    
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  
  /**
   * Remove track from playlist
   */
  removeTrack(index: number) {
    if (index < 0 || index >= this.tracks.length) return;
    
    this.tracks.splice(index, 1);
    
    // Adjust current index if needed
    if (index < this.currentIndex) {
      this.currentIndex--;
    } else if (index === this.currentIndex) {
      // Current track was removed, play next or stop
      if (this.currentIndex >= this.tracks.length) {
        this.currentIndex = this.tracks.length - 1;
      }
      
      if (this.currentIndex >= 0) {
        this.play(this.currentIndex);
      }
    }
    
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  
  /**
   * Clear playlist
   */
  clear() {
    this.tracks = [];
    this.currentIndex = -1;
    
    if (this.playlistPanel) {
      this.playlistPanel.innerHTML = '';
      this.playlistPanel.style.display = 'none';
    }
    
    if (this.trackInfoView) {
      this.trackInfoView.hide();
    }
    
    if (this.trackArtworkElement) {
      this.trackArtworkElement.style.backgroundImage = '';
      this.trackArtworkElement.style.display = 'none';
    }
  }
  
  /**
   * Sync grid layout when the in-player playlist panel is toggled in the
   * right-column desktop layout (full width when collapsed).
   */
  private syncPanelCollapsedLayout(): void {
    if (!this.container) {
      return;
    }

    const isRightDesktop =
      this.options.panelPosition === 'right'
      && isPlaylistPanelRightDesktopViewport();

    this.container.classList.toggle(
      'vidply-playlist-panel-collapsed',
      isRightDesktop && !this.isPanelVisible
    );

    requestAnimationFrame(() => {
      this.player.controlBar?.checkOverflow();
      this.player.positionPlayOverlayOnMobile();
    });
  }

  /**
   * Toggle playlist panel visibility
   * @param {boolean} show - Optional: force show (true) or hide (false)
   * @returns {boolean} - New visibility state
   */
  togglePanel(show?: boolean) {
    const playlistPanel = this.playlistPanel;
    if (!playlistPanel) return false;

    // Determine new state
    const shouldShow = show !== undefined ? show : playlistPanel.style.display === 'none';

    if (shouldShow) {
      playlistPanel.style.display = 'block';
      this.isPanelVisible = true;

      // Focus first item if playlist has tracks
      if (this.tracks.length > 0) {
        this.setManagedTimeout(() => {
          const firstItem = playlistPanel.querySelector<HTMLElement>('.vidply-playlist-item[tabindex="0"]');
          if (firstItem) {
            firstItem.focus({ preventScroll: true });
          }
        }, 100);
      }
      
      // Update toggle button state if it exists
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-expanded', 'true');
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-pressed', 'true');
      }
    } else {
      playlistPanel.style.display = 'none';
      this.isPanelVisible = false;
      
      // Update toggle button state if it exists
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-expanded', 'false');
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-pressed', 'false');
        
        // Return focus to toggle button
        this.player.controlBar.controls.playlistToggle.focus({ preventScroll: true });
      }
    }

    this.syncPanelCollapsedLayout();
    
    return this.isPanelVisible;
  }
  
  /**
   * Show playlist panel
   */
  showPanel() {
    return this.togglePanel(true);
  }
  
  /**
   * Hide playlist panel
   */
  hidePanel() {
    return this.togglePanel(false);
  }
  
  /**
   * Destroy playlist manager
   */
  /**
   * setTimeout wrapper that tracks the handle so destroy() can cancel any
   * still-pending callback. Nested deferred work should also route through
   * this so it can't fire after teardown.
   */
  private setManagedTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    const id = setTimeout(() => {
      this._timers.delete(id);
      callback();
    }, delay);
    this._timers.add(id);
    return id;
  }

  destroy() {
    // Cancel any pending deferred callbacks (auto-play, guard resets,
    // announcement clears, focus moves) before tearing the manager down.
    this._timers.forEach(id => clearTimeout(id));
    this._timers.clear();

    // Remove every listener registered in init(). All handlers are pre-bound
    // in the constructor, so these references match what on() registered.
    this.player.off('ended', this.handleTrackEnd);
    this.player.off('error', this.handleTrackError);
    this.player.off('play', this.handlePlaybackStateChange);
    this.player.off('pause', this.handlePlaybackStateChange);
    this.player.off('ended', this.handlePlaybackStateChange);
    this.player.off('fullscreenchange', this.handleFullscreenChange);
    this.player.off('audiodescriptionenabled', this.handleAudioDescriptionChange);
    this.player.off('audiodescriptiondisabled', this.handleAudioDescriptionChange);
    
    // Remove UI
    if (this.trackArtworkElement) {
      this.trackArtworkElement.remove();
    }
    
    if (this.trackInfoView) {
      this.trackInfoView.destroy();
      this.trackInfoView = null;
    }

    this.teardownPlaylistMainLayout();
    
    if (this.playlistPanel) {
      this.playlistPanel.remove();
    }

    if (this.container) {
      this.container.classList.remove('vidply-has-playlist', 'vidply-playlist-panel-right');
    }
    
    // Clear data
    this.clear();
  }
}

export default PlaylistManager;
