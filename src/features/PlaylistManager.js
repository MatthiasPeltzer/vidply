/**
 * VidPly Playlist Manager
 * Manages playlists for audio and video content
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { TimeUtils } from '../utils/TimeUtils.js';

// Static counter for unique IDs
let playlistInstanceCounter = 0;

export class PlaylistManager {
  constructor(player, options = {}) {
    this.player = player;
    this.tracks = [];
    this.initialTracks = Array.isArray(options.tracks) ? options.tracks : [];
    this.currentIndex = -1;
    
    // Generate unique instance ID for this playlist
    this.instanceId = ++playlistInstanceCounter;
    this.uniqueId = `vidply-playlist-${this.instanceId}`;
    
    // Options
    this.options = {
      autoAdvance: options.autoAdvance !== false, // Default true
      autoPlayFirst: options.autoPlayFirst !== false, // Default true - auto-play first track on load
      loop: options.loop || false,
      showPanel: options.showPanel !== false, // Default true
      recreatePlayers: options.recreatePlayers || false, // New: recreate player for each track type
      ...options
    };
    
    // UI elements
    this.container = null;
    this.playlistPanel = null;
    this.trackInfoElement = null;
    this.navigationFeedback = null; // Live region for keyboard navigation feedback
    this.isPanelVisible = this.options.showPanel !== false;
    
    // Track change guard to prevent cascade of next() calls
    this.isChangingTrack = false;
    
    // Store the host element for player recreation
    this.hostElement = options.hostElement || null;
    this.PlayerClass = options.PlayerClass || null;
    
    // Bind methods
    this.handleTrackEnd = this.handleTrackEnd.bind(this);
    this.handleTrackError = this.handleTrackError.bind(this);
    
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
   * @returns {string} - 'audio', 'video', 'youtube', 'vimeo', 'soundcloud', 'hls'
   */
  getTrackMediaType(track) {
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
    if (src.includes('.m3u8')) {
      return 'hls';
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
  async recreatePlayerForTrack(track, autoPlay = false) {
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
    if (this.trackInfoElement && this.trackInfoElement.parentNode) {
      this.trackInfoElement.parentNode.removeChild(this.trackInfoElement);
    }
    if (this.navigationFeedback && this.navigationFeedback.parentNode) {
      this.navigationFeedback.parentNode.removeChild(this.navigationFeedback);
    }
    if (this.playlistPanel && this.playlistPanel.parentNode) {
      this.playlistPanel.parentNode.removeChild(this.playlistPanel);
    }
    
    // Preserve existing player options so recreated players behave consistently
    const preservedPlayerOptions = this.player?.options ? { ...this.player.options } : {};

    // Remove event listeners before destroying
    if (this.player) {
      this.player.off('ended', this.handleTrackEnd);
      this.player.off('error', this.handleTrackError);
      this.player.destroy();
    }
    
    // Clear the host element
    this.hostElement.innerHTML = '';
    
    // Create new media element with appropriate type
    const mediaElement = document.createElement(elementType);
    // Respect configured preload (playlists should behave like single videos even with deferLoad)
    const preloadValue = preservedPlayerOptions.preload || 'metadata';
    mediaElement.setAttribute('preload', preloadValue);
    
    // For video elements with local media, set poster
    if (elementType === 'video' && track.poster && 
        (mediaType === 'video' || mediaType === 'hls')) {
      mediaElement.setAttribute('poster', track.poster);
    }
    
    // For external renderers (YouTube, Vimeo, SoundCloud, HLS), don't add source
    // The renderer will handle the source directly
    const isExternalRenderer = ['youtube', 'vimeo', 'soundcloud', 'hls'].includes(mediaType);
    
    if (!isExternalRenderer) {
      // Add source for HTML5 media
      const source = document.createElement('source');
      source.src = track.src;
      if (track.type) {
        source.type = track.type;
      }
      mediaElement.appendChild(source);
      
      // Add tracks (captions, chapters, etc.)
      if (track.tracks && track.tracks.length > 0) {
        track.tracks.forEach(trackConfig => {
          const trackEl = document.createElement('track');
          trackEl.src = trackConfig.src;
          trackEl.kind = trackConfig.kind || 'captions';
          trackEl.srclang = trackConfig.srclang || 'en';
          trackEl.label = trackConfig.label || trackConfig.srclang;
          if (trackConfig.default) {
            trackEl.default = true;
          }
          mediaElement.appendChild(trackEl);
        });
      }
    }
    
    this.hostElement.appendChild(mediaElement);
    
    // Create new player with the media element
    // Pass the source for external renderers via options
    const playerOptions = {
      mediaType: elementType,
      poster: track.poster,
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      audioDescriptionDuration: track.audioDescriptionDuration || null,
      signLanguageSrc: track.signLanguageSrc || null
    };
    // Merge back preserved options (so deferLoad/preload/etc remain active)
    Object.assign(playerOptions, preservedPlayerOptions);
    
    this.player = new this.PlayerClass(mediaElement, playerOptions);
    
    // Re-register playlist manager
    this.player.playlistManager = this;
    
    // Wait for player to be ready
    await new Promise(resolve => {
      this.player.on('ready', resolve);
    });
    
    // Re-attach event listeners
    this.player.on('ended', this.handleTrackEnd);
    this.player.on('error', this.handleTrackError);
    
    // Re-attach all playlist UI elements to the new player's container
    if (this.player.container) {
      // Track artwork goes before video wrapper
      if (this.trackArtworkElement) {
        const videoWrapper = this.player.container.querySelector('.vidply-video-wrapper');
        if (videoWrapper) {
          this.player.container.insertBefore(this.trackArtworkElement, videoWrapper);
        } else {
          this.player.container.appendChild(this.trackArtworkElement);
        }
      }
      // Track info
      if (this.trackInfoElement) {
        this.player.container.appendChild(this.trackInfoElement);
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
    
    // Update container reference
    this.container = this.player.container;
    
    // Update controls (adds playlist prev/next buttons)
    this.updatePlayerControls();
    
    // Restore tracks data (we kept it during recreation)
    this.tracks = savedTracks;
    this.currentIndex = savedIndex;
    
    // Update playlist UI to reflect current state
    this.updatePlaylistUI();
    
    // Restore playlist panel visibility
    this.isPanelVisible = wasVisible;
    if (this.playlistPanel) {
      this.playlistPanel.style.display = wasVisible ? '' : 'none';
    }
    
    // For external renderers, load the track via player.load()
    // For HTML5, the source is already set on the element
    if (isExternalRenderer) {
      this.player.load({
        src: track.src,
        type: track.type,
        poster: track.poster,
        tracks: track.tracks || [],
        audioDescriptionSrc: track.audioDescriptionSrc || null,
        signLanguageSrc: track.signLanguageSrc || null
      });
    } else {
      // For HTML5 media, also load to set up accessibility features
      this.player.load({
        src: track.src,
        type: track.type,
        poster: track.poster,
        tracks: track.tracks || [],
        audioDescriptionSrc: track.audioDescriptionSrc || null,
        signLanguageSrc: track.signLanguageSrc || null
      });
    }
    
    // Auto-play if requested
    if (autoPlay) {
      setTimeout(() => {
        this.player.play();
      }, 100);
    }
    
    return true;
  }
  
  init() {
    // Listen for track end
    this.player.on('ended', this.handleTrackEnd);
    this.player.on('error', this.handleTrackError);
    
    // Listen for playback state changes to show/hide playlist in fullscreen
    this.player.on('play', this.handlePlaybackStateChange.bind(this));
    this.player.on('pause', this.handlePlaybackStateChange.bind(this));
    this.player.on('ended', this.handlePlaybackStateChange.bind(this));
    // Use fullscreenchange event which is what the player actually emits
    this.player.on('fullscreenchange', this.handleFullscreenChange.bind(this));
    
    // Listen for audio description state changes to update duration displays
    this.player.on('audiodescriptionenabled', this.handleAudioDescriptionChange.bind(this));
    this.player.on('audiodescriptiondisabled', this.handleAudioDescriptionChange.bind(this));
    
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
  loadOptionsFromAttributes(element) {
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
   * Load a playlist
   * @param {Array} tracks - Array of track objects
   */
  loadPlaylist(tracks) {
    this.tracks = tracks;
    this.currentIndex = -1;
    
    // Add playlist class to container
    if (this.container) {
      this.container.classList.add('vidply-has-playlist');
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
  async loadTrack(index) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }
    
    const track = this.tracks[index];
    
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
        setTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    
    // Load track into player (normal path)
    const loadPromise = this.player.load({
      src: track.src,
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
    setTimeout(() => {
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
  selectTrack(index) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }

    const track = this.tracks[index];
    this.currentIndex = index;

    // Apply per-track metadata without touching the media source.
    // This ensures poster + feature buttons (chapters/captions/transcript/sign-language)
    // can be updated instantly even before any media network activity happens.
    try {
      // Poster for video element
      if (this.player?.element?.tagName === 'VIDEO') {
        if (track.poster) {
          const posterUrl = typeof this.player.resolvePosterPath === 'function'
            ? this.player.resolvePosterPath(track.poster)
            : track.poster;
          this.player.element.poster = posterUrl;
          this.player.applyPosterAspectRatio?.(posterUrl);
        } else {
          this.player.element.removeAttribute('poster');
        }
      }

      // Update sign language / audio description sources (used for button visibility)
      this.player.audioDescriptionSrc = track.audioDescriptionSrc || null;
      this.player.signLanguageSrc = track.signLanguageSrc || null;
      this.player.signLanguageSources = track.signLanguageSources || {};

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
      const existing = Array.from(this.player.element.querySelectorAll('track'));
      existing.forEach(t => t.remove());

      if (Array.isArray(track.tracks)) {
        track.tracks.forEach(tc => {
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

      // Re-scan described-track metadata for AudioDescriptionManager
      if (this.player.audioDescriptionManager && typeof this.player.audioDescriptionManager.initFromSourceElements === 'function') {
        try {
          this.player.audioDescriptionManager.captionTracks = [];
          this.player.audioDescriptionManager.initFromSourceElements(this.player.sourceElements, this.player.trackElements);
        } catch (e) {
          // ignore
        }
      }

      // Refresh caption/transcript managers so menus reflect newly injected <track> elements
      // (important when we defer MP4/MP3 loading but still want VTT-based UI to work).
      if (this.player.captionManager && typeof this.player.captionManager.loadTracks === 'function') {
        try {
          this.player.captionManager.tracks = [];
          this.player.captionManager.currentTrack = null;
          this.player.captionManager.loadTracks();
        } catch (e) {
          // ignore
        }
      }

      // TranscriptManager reads from TextTracks too; it will be correct after media starts.
      // For now, we just ensure control bar is rebuilt so the button is present.

      // Rebuild controls so feature buttons appear immediately
      if (typeof this.player.updateControlBar === 'function') {
        this.player.updateControlBar();
      }
    } catch (e) {
      // ignore preview errors; selection should still work
    }

    this.updateTrackInfo(track);
    this.updatePlaylistUI();

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
  async play(index, userInitiated = false) {
    if (index < 0 || index >= this.tracks.length) {
      console.warn('VidPly Playlist: Invalid track index', index);
      return;
    }
    
    const track = this.tracks[index];
    
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
        
        // Emit event
        this.player.emit('playlisttrackchange', {
          index: index,
          item: track,
          total: this.tracks.length
        });
        
        // Clear guard flag
        setTimeout(() => {
          this.isChangingTrack = false;
        }, 150);
        return;
      }
    }
    
    // Load track into player (normal path)
    // If audio description was toggled before the first play, load the described source directly.
    let srcToLoad = track.src;
    if (this.player?.audioDescriptionManager?.desiredState && track.audioDescriptionSrc) {
      // Preserve original for later toggling back
      this.player.originalSrc = track.src;
      this.player.audioDescriptionManager.originalSource = track.src;
      this.player.audioDescriptionManager.src = track.audioDescriptionSrc;
      srcToLoad = track.audioDescriptionSrc;
    }

    this.player.load({
      src: srcToLoad,
      type: track.type,
      poster: track.poster,
      tracks: track.tracks || [],
      audioDescriptionSrc: track.audioDescriptionSrc || null,
      signLanguageSrc: track.signLanguageSrc || null,
      signLanguageSources: track.signLanguageSources || {}
    });
    
    // Update UI
    this.updateTrackInfo(track);
    this.updatePlaylistUI();
    
    // Emit event
    this.player.emit('playlisttrackchange', {
      index: index,
      item: track,
      total: this.tracks.length
    });
    
    // Auto-play and clear guard flag after playback starts
    setTimeout(() => {
      this.player.play();
      // Clear guard flag after a short delay to ensure track has started
      setTimeout(() => {
        this.isChangingTrack = false;
      }, 50);
    }, 100);
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
  isExternalRendererUrl(src) {
    if (!src) return false;
    return src.includes('youtube.com') || 
           src.includes('youtu.be') || 
           src.includes('vimeo.com') || 
           src.includes('soundcloud.com') || 
           src.includes('api.soundcloud.com') ||
           src.includes('.m3u8');
  }

  /**
   * Handle track error
   */
  handleTrackError(e) {
    // Don't auto-advance for external renderer tracks
    // External renderers (YouTube, Vimeo, SoundCloud, HLS) may trigger HTML5 errors
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
      setTimeout(() => {
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
    setTimeout(() => {
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
    
    items.forEach((item, index) => {
      const track = this.tracks[index];
      if (!track) return;
      
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : '';
      
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
  getEffectiveDuration(track) {
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
    if (!this.playlistPanel || !this.tracks.length) return;
    
    const isFullscreen = this.player.state.fullscreen;
    const isPlaying = this.player.state.playing;
    
    if (isFullscreen) {
      // In fullscreen: show only when not playing (paused or not started)
      // Check playing state explicitly since paused might not be set initially
      if (!isPlaying) {
        this.playlistPanel.classList.add('vidply-playlist-fullscreen-visible');
        this.playlistPanel.style.display = 'block';
      } else {
        this.playlistPanel.classList.remove('vidply-playlist-fullscreen-visible');
        // Add a smooth fade out with delay to match CSS transition
        setTimeout(() => {
          // Double-check state hasn't changed before hiding
          if (this.player.state.playing && this.player.state.fullscreen) {
            this.playlistPanel.style.display = 'none';
          }
        }, 300); // Match CSS transition duration
      }
    } else {
      // Outside fullscreen: restore original behavior
      this.playlistPanel.classList.remove('vidply-playlist-fullscreen-visible');
      if (this.isPanelVisible && this.tracks.length > 0) {
        this.playlistPanel.style.display = 'block';
      } else {
        this.playlistPanel.style.display = 'none';
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
    
    // Create track info element (shows current track)
    this.trackInfoElement = DOMUtils.createElement('div', {
      className: 'vidply-track-info',
      attributes: {
        role: 'status'
      }
    });
    this.trackInfoElement.style.display = 'none';
    
    this.container.appendChild(this.trackInfoElement);
    
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
  }
  
  /**
   * Update track info display
   */
  updateTrackInfo(track) {
    if (!this.trackInfoElement) return;
    
    const trackNumber = this.currentIndex + 1;
    const totalTracks = this.tracks.length;
    const trackTitle = track.title || i18n.t('playlist.untitled');
    const trackArtist = track.artist || '';
    
    // Use effective duration (audio description duration when AD is enabled)
    const effectiveDuration = this.getEffectiveDuration(track);
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : '';
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : '';
    
    // Screen reader announcement - include duration if available
    const artistPart = trackArtist ? i18n.t('playlist.by') + trackArtist : '';
    const durationPart = trackDurationReadable ? `. ${trackDurationReadable}` : '';
    const announcement = i18n.t('playlist.nowPlaying', {
      current: trackNumber,
      total: totalTracks,
      title: trackTitle,
      artist: artistPart
    }) + durationPart;
    
    const trackOfText = i18n.t('playlist.trackOf', {
      current: trackNumber,
      total: totalTracks
    });
    
    // Build duration HTML if available
    const durationHtml = trackDuration 
      ? `<span class="vidply-track-duration" aria-hidden="true">${DOMUtils.escapeHTML(trackDuration)}</span>` 
      : '';
    
    // Get description if available
    const trackDescription = track.description || '';
    
    this.trackInfoElement.innerHTML = `
      <span class="vidply-sr-only">${DOMUtils.escapeHTML(announcement)}</span>
      <div class="vidply-track-header" aria-hidden="true">
        <span class="vidply-track-number">${DOMUtils.escapeHTML(trackOfText)}</span>
        ${durationHtml}
      </div>
      <div class="vidply-track-title" aria-hidden="true">${DOMUtils.escapeHTML(trackTitle)}</div>
      ${trackArtist ? `<div class="vidply-track-artist" aria-hidden="true">${DOMUtils.escapeHTML(trackArtist)}</div>` : ''}
      ${trackDescription ? `<div class="vidply-track-description" aria-hidden="true">${DOMUtils.escapeHTML(trackDescription)}</div>` : ''}
    `;
    
    this.trackInfoElement.style.display = 'block';
    
    // Update track artwork if available (for audio playlists)
    this.updateTrackArtwork(track);
  }
  
  /**
   * Update track artwork display (for audio playlists)
   */
  updateTrackArtwork(track) {
    // Only show artwork for audio players.
    // In mixed playlists we may recreate from <video> -> <audio> later, so ensure the element exists lazily.
    if (this.player?.element?.tagName !== 'AUDIO') {
      if (this.trackArtworkElement) {
        this.trackArtworkElement.style.display = 'none';
      }
      return;
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
      const videoWrapper = this.container.querySelector('.vidply-video-wrapper');
      if (videoWrapper) {
        this.container.insertBefore(this.trackArtworkElement, videoWrapper);
      } else {
        this.container.appendChild(this.trackArtworkElement);
      }
    }

    if (!this.trackArtworkElement) return;
    
    // If track has a poster/artwork, show it
    if (track.poster) {
      this.trackArtworkElement.style.backgroundImage = `url(${track.poster})`;
      this.trackArtworkElement.style.display = 'block';
    } else {
      // No artwork available, hide the element
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
  }
  
  /**
   * Create playlist item element
   */
  createPlaylistItem(track, index) {
    const trackPosition = i18n.t('playlist.trackOf', {
      current: index + 1,
      total: this.tracks.length
    });
    const trackTitle = track.title || i18n.t('playlist.trackUntitled', { number: index + 1 });
    const trackArtist = track.artist ? i18n.t('playlist.by') + track.artist : '';
    
    // Use effective duration (audio description duration when AD is enabled)
    const effectiveDuration = this.getEffectiveDuration(track);
    const trackDuration = effectiveDuration ? TimeUtils.formatTime(effectiveDuration) : '';
    const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : '';
    const isActive = index === this.currentIndex;
    
    // Build accessible label for screen readers
    // With role="option" and aria-checked, screen reader will announce selection state
    // Position is already announced via aria-posinset/aria-setsize
    // Format: "Title by Artist. 3 minutes, 45 seconds."
    let ariaLabel = `${trackTitle}${trackArtist}`;
    if (trackDurationReadable) {
      ariaLabel += `. ${trackDurationReadable}`;
    }
    
    // Create list item container
    // role="none" removes the <li> from the accessibility tree so the button with
    // role="option" becomes the direct semantic child of the listbox (required by ARIA).
    const item = DOMUtils.createElement('li', {
      className: isActive ? 'vidply-playlist-item vidply-playlist-item-active' : 'vidply-playlist-item',
      attributes: {
        'data-playlist-index': index,
        role: 'none'
      }
    });
    
    // Create button wrapper for interactive content
    const button = DOMUtils.createElement('button', {
      className: 'vidply-playlist-item-button',
      attributes: {
        type: 'button',
        role: 'option',
        tabIndex: index === 0 ? 0 : -1, // Only first item is in tab order initially
        'aria-label': ariaLabel,
        'aria-posinset': index + 1,
        'aria-setsize': this.tracks.length,
        'aria-checked': isActive ? 'true' : 'false'
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
    
    if (track.poster) {
      thumbnail.style.backgroundImage = `url(${track.poster})`;
    } else {
      // Show music/speaker icon for audio tracks
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
        setTimeout(() => {
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
  handlePlaylistItemKeydown(e, index) {
    const buttons = Array.from(this.playlistPanel.querySelectorAll('.vidply-playlist-item-button'));
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
            setTimeout(() => {
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
      buttons[index].setAttribute('tabIndex', '-1');
      buttons[newIndex].setAttribute('tabIndex', '0');
      buttons[newIndex].focus({ preventScroll: false });
      
      // Scroll the focused item into view (same behavior as mouse interaction)
      const item = buttons[newIndex].closest('.vidply-playlist-item');
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    
    // Announce navigation feedback
    if (announcement && this.navigationFeedback) {
      this.navigationFeedback.textContent = announcement;
      // Clear after a short delay to allow for repeated announcements
      setTimeout(() => {
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
    
    items.forEach((item, index) => {
      const button = buttons[index];
      if (!button) return;
      
      const track = this.tracks[index];
      const trackPosition = i18n.t('playlist.trackOf', {
        current: index + 1,
        total: this.tracks.length
      });
      const trackTitle = track.title || i18n.t('playlist.trackUntitled', { number: index + 1 });
      const trackArtist = track.artist ? i18n.t('playlist.by') + track.artist : '';
      
      // Use effective duration (audio description duration when AD is enabled)
      const effectiveDuration = this.getEffectiveDuration(track);
      const trackDurationReadable = effectiveDuration ? TimeUtils.formatDuration(effectiveDuration) : '';
      
      if (index === this.currentIndex) {
        // Update list item styling
        item.classList.add('vidply-playlist-item-active');
        
        // Update button ARIA attributes
        button.setAttribute('aria-current', 'true');
        button.setAttribute('aria-checked', 'true');
        button.setAttribute('tabIndex', '0'); // Active item should be tabbable
        
        // Simplified aria-label - status and actions are announced via ARIA roles
        let ariaLabel = `${trackTitle}${trackArtist}`;
        if (trackDurationReadable) {
          ariaLabel += `. ${trackDurationReadable}`;
        }
        button.setAttribute('aria-label', ariaLabel);
        
        // Scroll into view within playlist panel (uses 'nearest' to minimize page scroll)
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        // Update list item styling
        item.classList.remove('vidply-playlist-item-active');
        
        // Update button ARIA attributes
        button.removeAttribute('aria-current');
        button.setAttribute('aria-checked', 'false');
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
  addTrack(track) {
    this.tracks.push(track);
    
    if (this.playlistPanel) {
      this.renderPlaylist();
    }
  }
  
  /**
   * Remove track from playlist
   */
  removeTrack(index) {
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
    
    if (this.trackInfoElement) {
      this.trackInfoElement.innerHTML = '';
      this.trackInfoElement.style.display = 'none';
    }
    
    if (this.trackArtworkElement) {
      this.trackArtworkElement.style.backgroundImage = '';
      this.trackArtworkElement.style.display = 'none';
    }
  }
  
  /**
   * Toggle playlist panel visibility
   * @param {boolean} show - Optional: force show (true) or hide (false)
   * @returns {boolean} - New visibility state
   */
  togglePanel(show) {
    if (!this.playlistPanel) return false;
    
    // Determine new state
    const shouldShow = show !== undefined ? show : this.playlistPanel.style.display === 'none';
    
    if (shouldShow) {
      this.playlistPanel.style.display = 'block';
      this.isPanelVisible = true;
      
      // Focus first item if playlist has tracks
      if (this.tracks.length > 0) {
        setTimeout(() => {
          const firstItem = this.playlistPanel.querySelector('.vidply-playlist-item[tabindex="0"]');
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
      this.playlistPanel.style.display = 'none';
      this.isPanelVisible = false;
      
      // Update toggle button state if it exists
      if (this.player.controlBar && this.player.controlBar.controls.playlistToggle) {
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-expanded', 'false');
        this.player.controlBar.controls.playlistToggle.setAttribute('aria-pressed', 'false');
        
        // Return focus to toggle button
        this.player.controlBar.controls.playlistToggle.focus({ preventScroll: true });
      }
    }
    
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
  destroy() {
    // Remove event listeners
    this.player.off('ended', this.handleTrackEnd);
    this.player.off('error', this.handleTrackError);
    
    // Remove UI
    if (this.trackArtworkElement) {
      this.trackArtworkElement.remove();
    }
    
    if (this.trackInfoElement) {
      this.trackInfoElement.remove();
    }
    
    if (this.playlistPanel) {
      this.playlistPanel.remove();
    }
    
    // Clear data
    this.clear();
  }
}

export default PlaylistManager;
