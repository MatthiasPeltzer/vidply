/**
 * VidPly - Universal Video Player
 * Main Player Class
 */

import {EventEmitter} from '../utils/EventEmitter.js';
import {DOMUtils} from '../utils/DOMUtils.js';
import {ControlBar} from '../controls/ControlBar.js';
import {CaptionManager} from '../controls/CaptionManager.js';
import {KeyboardManager} from '../controls/KeyboardManager.js';
import {MediaSessionManager} from './MediaSessionManager.js';
import {HTML5Renderer} from '../renderers/HTML5Renderer.js';
import {createPlayOverlay} from '../icons/Icons.js';
import {i18n} from '../i18n/i18n.js';
import {StorageManager} from '../utils/StorageManager.js';
import {DraggableResizable} from '../utils/DraggableResizable.js';
import {debounce, isMobile, rafWithTimeout} from '../utils/PerformanceUtils.js';
import {sanitizePosterUrl, cssEscapeUrl} from '../utils/UrlSafe.js';
import {classifyRendererType} from '../utils/RendererType.js';
import {observeForLazyInit, cancelLazyInit, type LazyHandle} from './LazyInit.js';
import {PseudoFullscreenController} from './PseudoFullscreen.js';
import {ThemeManager, PLAYER_THEMES, type ThemeName} from './ThemeManager.js';
import {PosterManager} from './PosterManager.js';
import {ResumeManager} from './ResumeManager.js';
import {ResponsiveManager} from './ResponsiveManager.js';
import {
  MetadataAlertsManager,
  type MetadataAlertConfig as _MetadataAlertConfig,
  type MetadataAlertOptions as _MetadataAlertOptions
} from './MetadataAlertsManager.js';

// Re-export the interfaces so external users who imported them from
// `core/Player.js` keep working.
export type MetadataAlertConfig = _MetadataAlertConfig;
export type MetadataAlertOptions = _MetadataAlertOptions;
import type {PlayerEventMap} from '../types/events.js';
import type {PlayerOptions} from '../types/options.js';
import type {PlayerState} from '../types/state.js';
import type {Renderer} from '../types/renderer.js';
import type {AudioDescriptionManager} from './AudioDescriptionManager.js';
import type {SignLanguageManager} from './SignLanguageManager.js';
import type {FloatingPlayerManager} from './FloatingPlayerManager.js';
import type {TranscriptManager} from '../controls/TranscriptManager.js';
import type {PlaylistManager} from '../features/PlaylistManager.js';
import {TrackInfoView} from './TrackInfoView.js';
import type {TrackInfoData} from './TrackInfoView.js';
import {KeyboardHelp} from '../controls/KeyboardHelp.js';

// Typed dynamic loaders. Each loader returns the constructor for the
// lazily imported manager, so call sites get full IntelliSense and
// `noImplicitAny` is satisfied.
type AudioDescriptionManagerCtor = typeof AudioDescriptionManager;
type SignLanguageManagerCtor = typeof SignLanguageManager;
type FloatingPlayerManagerCtor = typeof FloatingPlayerManager;

let AudioDescriptionManagerModule: AudioDescriptionManagerCtor | null = null;
let SignLanguageManagerModule: SignLanguageManagerCtor | null = null;
let FloatingPlayerManagerModule: FloatingPlayerManagerCtor | null = null;

async function loadAudioDescriptionManager(): Promise<AudioDescriptionManagerCtor> {
  if (!AudioDescriptionManagerModule) {
    const module = await import('./AudioDescriptionManager.js');
    AudioDescriptionManagerModule = module.AudioDescriptionManager;
  }
  return AudioDescriptionManagerModule;
}

async function loadSignLanguageManager(): Promise<SignLanguageManagerCtor> {
  if (!SignLanguageManagerModule) {
    const module = await import('./SignLanguageManager.js');
    SignLanguageManagerModule = module.SignLanguageManager;
  }
  return SignLanguageManagerModule;
}

async function loadFloatingPlayerManager(): Promise<FloatingPlayerManagerCtor> {
  if (!FloatingPlayerManagerModule) {
    const module = await import('./FloatingPlayerManager.js');
    FloatingPlayerManagerModule = module.FloatingPlayerManager;
  }
  return FloatingPlayerManagerModule;
}

const ALLOWED_MEDIA_TYPES = ['video', 'audio'] as const;
type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

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

// Static counter for unique player instances
let playerInstanceCounter = 0;

export class Player extends EventEmitter<PlayerEventMap> {
  static instances: Player[] = [];
  /**
   * Available theme names. Kept as a static field for backward
   * compatibility with external callers that used
   * `Player.THEMES.includes(x)`; the canonical source is
   * `PLAYER_THEMES` in `./ThemeManager.ts`.
   */
  static readonly THEMES: readonly ThemeName[] = PLAYER_THEMES;

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
  static observeLazy(
    selector: string | HTMLElement,
    options: Partial<PlayerOptions> = {},
    margin = '200px'
  ): LazyHandle {
    const element =
      typeof selector === 'string'
        ? (document.querySelector(selector) as HTMLElement | null)
        : selector;

    if (!element) {
      console.warn('VidPly: Element not found for lazy observation');
      return null;
    }

    if ('IntersectionObserver' in window) {
      observeForLazyInit<Partial<PlayerOptions>>(
        element,
        options,
        margin,
        (target, opts) => { new Player(target, opts); }
      );
      return { cancel: () => cancelLazyInit(element) };
    }
    new Player(element, options);
    return null;
  }
  element: HTMLMediaElement;
  container!: HTMLElement;
  /**
   * Runtime options. Includes a `[key: string]: unknown` index for
   * internal-only dynamic keys that have not yet been promoted into
   * the public {@link PlayerOptions} interface.
   */
  options: PlayerOptions & Record<string, unknown>;
  state: PlayerState & Record<string, unknown>;
  renderer: Renderer | null = null;
  controlBar: ControlBar | null = null;
  captionManager: CaptionManager | null = null;
  keyboardManager: KeyboardManager | null = null;
  mediaSessionManager: MediaSessionManager | null = null;
  transcriptManager: TranscriptManager | null = null;
  playlistManager: PlaylistManager | null = null;
  keyboardHelp: KeyboardHelp | null = null;
  audioDescriptionManager: AudioDescriptionManager | null = null;
  signLanguageManager: SignLanguageManager | null = null;
  floatingPlayerManager: FloatingPlayerManager | null = null;
  storage: StorageManager;
  instanceId: number;
  _audioDescriptionDesiredState: boolean | undefined;
  _fallbackSources: Array<{ src: string; type?: string; [key: string]: unknown }> | null = null;
  _isAudioContent: boolean | undefined;
  _isFallingBack: boolean | undefined;
  _managersLoading: Promise<unknown> | null = null;
  _originalElement!: HTMLElement;
  /** Lazily-created on first pseudo-fullscreen entry. Owns the scroll /
   *  inert / viewport bookkeeping that used to live as `_original*`
   *  fields directly on the player. */
  pseudoFullscreen: PseudoFullscreenController | null = null;
  /** Owns `applyTheme`/`setTheme`/`setThemeVariable`/`resetTheme`. Player
   *  keeps delegating public methods so the existing API is unchanged. */
  themeManager!: ThemeManager;
  /** Owns poster resolution, canvas-capture, and overlay show/hide. */
  posterManager!: PosterManager;
  /** Owns resume-playback prompt + progress persistence. Lazily
   *  created the first time `initResumePlayback` is called so sites
   *  that don't enable the feature don't pay the DOM / listener cost. */
  resumeManager: ResumeManager | null = null;
  /** Standalone track metadata header (single-item players without a playlist). */
  trackInfoView: TrackInfoView | null = null;
  /** Owns resize-observer, orientation matchMedia, and the
   *  cross-vendor fullscreenchange listeners. */
  responsiveManager!: ResponsiveManager;
  /** Owns `kind=metadata` text-track directives (PAUSE, FOCUS,
   *  #hashtag) + the per-selector alert UI. Lazily created on first
   *  `setupMetadataHandling()` call. */
  metadataAlertsManager: MetadataAlertsManager | null = null;
  _pendingSource: string | null = null;
  _sourceElementsCache: HTMLSourceElement[] | null = null;
  _sourceElementsDirty: boolean = true;
  _switchingRenderer: boolean | undefined;
  _trackElementsCache: HTMLTrackElement[] | null = null;
  _trackElementsDirty: boolean = true;
  _textTracksCache: TextTrack[] | null = null;
  _textTracksDirty: boolean | undefined;
  audioDescriptionCaptionTracks: unknown[] = [];
  audioDescriptionSourceElement: HTMLSourceElement | null = null;
  audioDescriptionSrc: string | null = null;
  currentSignLanguage: string | null = null;
  currentSource: string | null = null;
  debouncedPositionPlayOverlay: ((...args: unknown[]) => void) | null = null;
  fullscreenChangeHandler: (() => void) | null = null;
  /** Mirrored from `MetadataAlertsManager` so the TextTrack cleanup
   *  path in `destroy()` can still find it by a fixed field name. */
  metadataCueChangeHandler: (() => void) | null = null;
  noticeElement: HTMLElement | null = null;
  noticeTimeout: ReturnType<typeof setTimeout> | null = null;
  orientationHandler: ((e: MediaQueryListEvent) => void) | null = null;
  orientationQuery: MediaQueryList | null = null;
  originalAudioDescriptionSource: string | null = null;
  originalSrc: string | null = null;
  playButtonOverlay: SVGSVGElement | null = null;
  /** Wrapper button for the audio play overlay. Video keeps the bare,
   *  presentational SVG because the video surface is itself clickable. */
  playButtonOverlayButton: HTMLButtonElement | null = null;
  resizeHandler: (() => void) | null = null;
  resizeObserver: ResizeObserver | null = null;
  resumePromptElement: HTMLElement | null = null;
  signLanguageDraggable: DraggableResizable | null = null;
  signLanguageHeader: HTMLElement | null = null;
  signLanguageSettingsButton: HTMLButtonElement | null = null;
  signLanguageSettingsMenu: HTMLElement | null = null;
  signLanguageSettingsMenuVisible: boolean = false;
  signLanguageSources: Record<string, string> = {};
  signLanguageSrc: string | null = null;
  signLanguageVideo: HTMLVideoElement | null = null;
  signLanguageWrapper: HTMLElement | null = null;
  timeouts: Set<ReturnType<typeof setTimeout>> = new Set();
  trackArtworkElement: HTMLElement | null = null;
  videoWrapper: HTMLElement | null = null;
  /** Centered buffering spinner (see `.vidply-loading` / `.vidply-buffering` in CSS) */
  loadingOverlayElement: HTMLElement | null = null;
  /** Native `playing` listener — must be removed in destroy() */
  _bufferingHideOnMediaPlaying: (() => void) | null = null;
  /** AbortController, whose signal feeds every window/document listener and
   *  every user-influenced fetch the Player creates. `destroy()` calls
   *  `abort()` so a torn-down player can never leak listeners or pending
   *  network calls. */
  private _lifecycleController: AbortController = new AbortController();

  constructor(element: string | HTMLElement, options: Record<string, unknown> = {}) {
    super();

    this.element = (typeof element === 'string' ? document.querySelector(element) : element) as HTMLMediaElement;
    if (!this.element) {
      throw new Error('VidPly: Element not found');
    }

    // Assign unique instance ID
    playerInstanceCounter++;
    this.instanceId = playerInstanceCounter;

    // Auto-creates a media element if a non-media element is provided.
    // mediaType is restricted to a hard-coded allowlist so an attacker
    // cannot smuggle, say, `script` or `object` via a `data-vidply-options`
    // attribute they control.
    if (this.element.tagName !== 'VIDEO' && this.element.tagName !== 'AUDIO') {
      const requested = typeof options.mediaType === 'string' ? options.mediaType.toLowerCase() : 'video';
      const mediaType: AllowedMediaType = (ALLOWED_MEDIA_TYPES as readonly string[]).includes(requested)
        ? (requested as AllowedMediaType)
        : 'video';
      if (mediaType !== requested) {
        console.warn(`[VidPly] Ignoring unsafe mediaType "${requested}", falling back to "video"`);
      }
      const mediaElement = document.createElement(mediaType);

      // Copy attributes from the div to the media element
      Array.from(this.element.attributes).forEach(attr => {
        if (attr.name !== 'id' && attr.name !== 'class' && !attr.name.startsWith('data-')) {
          mediaElement.setAttribute(attr.name, attr.value);
        }
      });

      // Copy any track elements from the div
      const tracks = this.element.querySelectorAll('track');
      tracks.forEach((track: HTMLTrackElement) => {
        mediaElement.appendChild(track.cloneNode(true));
      });

      // Clear the div and insert the media element
      this.element.replaceChildren(mediaElement);

      // Update element reference to the actual media element
      this.element = mediaElement as HTMLMediaElement;
    }

    // Store original element reference for mixed media swapping
    // This allows us to swap between video and audio elements in mixed playlists
    this._originalElement = this.element;

    // Default options
    this.options = {
      // Display
      width: null,
      height: null,
      poster: null,
      responsive: true,
      fillContainer: false,

      // Media metadata + OS media controls (Media Session API)
      title: null,
      artist: null,
      album: null,
      mediaSession: true,

      // Playback
      autoplay: false,
      loop: false,
      muted: false,
      volume: 0.8,
      playbackSpeed: 1.0,
      preload: 'metadata',
      // Optional initial duration (seconds) so UI can show duration
      // before media metadata is loaded (useful with deferLoad/preload=none).
      initialDuration: 0,
      // When enabled, VidPly will not start network loading during init().
      // - HTML5: does not call element.load() until the first user-initiated play()
      // - HLS (hls.js): does not load manifest/segments until the first play()
      // - DASH (dash.js): does not attach a source until the first play()
      // This is useful for pages with many players to avoid high initial bandwidth.
      deferLoad: false,
      // When enabled, clicking Audio Description / Sign Language before playback will show
      // a notice instead of implicitly starting playback/loading.
      requirePlaybackForAccessibilityToggles: false,
      startTime: 0,
      playsInline: true, // Enable inline playback on iOS (prevents native fullscreen)

      // Controls
      controls: true,
      hideControlsDelay: 3000,
      playPauseButton: true,
      // 'auto' = video only. Set to true to also show the centered play
      // button on audio players (rendered on top of the track artwork).
      playButtonOverlay: 'auto',
      progressBar: true,
      currentTime: true,
      duration: true,
      volumeControl: true,
      muteButton: true,
      chaptersButton: true,
      qualityButton: true,
      captionStyleButton: true,
      speedButton: true,
      // When enabled, the playback speed UI is suppressed for ALL HLS streams (audio + video).
      hideSpeedForHls: false,
      // When enabled, the playback speed UI is suppressed for HLS *video* streams only.
      // This is useful for live streams where speed controls don't make sense.
      hideSpeedForHlsVideo: false,
      // When enabled, the playback speed UI is suppressed for ALL DASH streams (audio + video).
      hideSpeedForDash: false,
      // When enabled, the playback speed UI is suppressed for DASH *video* streams only.
      hideSpeedForDashVideo: false,
      captionsButton: true,
      transcriptButton: true,
      fullscreenButton: true,
      helpButton: true,
      pipButton: false,
      floating: false,
      floatingPosition: 'bottom-right',
      floatingMinViewportWidth: 768,
      downloadButton: false,
      downloadUrl: null,
      downloadFormat: null,
      downloadFileSize: null,
      downloadFetchSize: true,

      // Seeking
      seekInterval: 10,
      seekIntervalLarge: 30,

      // Captions
      captions: true,
      captionsDefault: false,
      captionsFontSize: '100%',
      captionsFontFamily: 'sans-serif',
      captionsColor: '#FFFFFF',
      captionsBackgroundColor: '#000000',
      captionsOpacity: 0.8,

      // Audio Description
      audioDescription: true,
      audioDescriptionSrc: null, // URL to audio-described version
      audioDescriptionButton: true,
      audioDescriptionMode: 'auto',
      audioDescriptionSpeech: true,
      audioDescriptionExtended: true,

      // Sign Language
      signLanguage: true,
      signLanguageSrc: null, // URL to sign language video
      signLanguageButton: true,
      signLanguagePosition: 'bottom-right', // Position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'
      signLanguageDisplayMode: 'both', // Display mode: 'pip' (overlay), 'main' (source swap), 'both'

      // Transcripts
      transcript: false,
      transcriptPosition: 'external',
      transcriptContainer: null,

      // Keyboard
      keyboard: true,
      keyboardShortcuts: {
        'play-pause': [' ', 'p', 'k'],
        'volume-up': ['ArrowUp'],
        'volume-down': ['ArrowDown'],
        'seek-forward': ['ArrowRight'],
        'seek-backward': ['ArrowLeft'],
        'mute': ['m'],
        'fullscreen': ['f'],
        'captions': ['c'],
        'caption-style-menu': ['a'],
        'speed-up': ['>'],
        'speed-down': ['<'],
        'speed-menu': ['s'],
        'quality-menu': ['q'],
        'chapters-menu': ['j'],
        'transcript-toggle': ['t'],
        'help': ['?']
      },

      // Accessibility
      ariaLabels: {},
      screenReaderAnnouncements: true,
      highContrast: false,
      focusHighlight: true,
      metadataAlerts: {},
      metadataHashtags: {},

      // Languages
      language: 'en',
      languages: ['en'],

      // Resume Playback
      resumePlayback: false,      // Enable saving and resuming playback position
      resumeThreshold: 10,        // Don't resume if < threshold seconds watched
      resumePrompt: true,         // Show prompt to resume (false = auto-resume silently)

      // Thumbnail Preview
      thumbnailPreview: true,          // Enable/disable thumbnail preview on seek bar
      thumbnailCacheSize: 50,          // Max cached thumbnails (default increased from 20)
      thumbnailPregenerate: true,      // Pre-generate thumbnails during idle time
      thumbnailInterval: 10,           // Pre-generation interval in seconds
      thumbnailWidth: 160,             // Thumbnail width
      thumbnailHeight: 90,             // Thumbnail height
      thumbnailQuality: 0.8,           // Thumbnail JPEG quality

      // Lazy Loading (primarily used by index.js auto-init)
      lazyInit: true,                  // Enable lazy initialization via IntersectionObserver
      lazyMargin: '200px',             // Root margin for IntersectionObserver

      // Theming
      theme: 'dark',                   // Theme: 'dark', 'light', 'minimal', 'high-contrast'
      themeVariables: {},              // Custom CSS variable overrides (e.g., { 'primary': '#ff0000' })

      // Advanced
      debug: false,
      classPrefix: 'vidply',
      iconType: 'svg',
      pauseOthersOnPlay: true,

      // Callbacks
      onReady: null,
      onPlay: null,
      onPause: null,
      onEnded: null,
      onTimeUpdate: null,
      onVolumeChange: null,
      onError: null,

      ...options
    };

    this.options.metadataAlerts = this.options.metadataAlerts || {};
    this.options.metadataHashtags = this.options.metadataHashtags || {};

    // Notice UI
    this.noticeElement = null;
    this.noticeTimeout = null;

    // Storage manager
    this.storage = new StorageManager('vidply');

    // Theme manager — cheap to construct (no DOM work in ctor) so we
    // wire it up immediately. `applyTheme()` is called later once the
    // container exists.
    this.themeManager = new ThemeManager(this);
    this.posterManager = new PosterManager(this);
    this.responsiveManager = new ResponsiveManager(this);

    // Load saved player preferences
    const savedPrefs = this.storage.getPlayerPreferences();
    if (savedPrefs) {
      if (typeof savedPrefs.volume === 'number') this.options.volume = savedPrefs.volume;
      if (typeof savedPrefs.playbackSpeed === 'number') this.options.playbackSpeed = savedPrefs.playbackSpeed;
      if (typeof savedPrefs.muted === 'boolean') this.options.muted = savedPrefs.muted;
    }

    // State
    this.state = {
      ready: false,
      playing: false,
      paused: true,
      ended: false,
      buffering: false,
      seeking: false,
      hasStartedPlayback: false,
      muted: this.options.muted,
      volume: this.options.volume,
      currentTime: 0,
      duration: Number(this.options.initialDuration) > 0 ? Number(this.options.initialDuration) : 0,
      playbackSpeed: this.options.playbackSpeed,
      fullscreen: false,
      pip: false,
      floating: null,
      captionsEnabled: this.options.captionsDefault,
      currentCaption: null,
      controlsVisible: true,
      audioDescriptionEnabled: false,
      signLanguageEnabled: false,
      signLanguageInMainView: false,
      resumePromptVisible: false
    };

    // Resume playback: prompt DOM element lives here so
    // `ResumeManager` can attach/detach it without leaking container
    // state back into the manager.
    this.resumePromptElement = null;

    // Store original source for toggling
    this.originalSrc = null;
    this.audioDescriptionSrc = this.options.audioDescriptionSrc;
    this.signLanguageSrc = this.options.signLanguageSrc;
    this.signLanguageSources = this.options.signLanguageSources || {}; // Map of lang codes to video URLs
    this.currentSignLanguage = null; // Current selected sign language code
    this.signLanguageVideo = null;
    // Store references to source elements with audio description attributes
    this.audioDescriptionSourceElement = null;
    this.originalAudioDescriptionSource = null;
    // Store caption tracks that should be swapped for audio description
    this.audioDescriptionCaptionTracks = [];
    this._audioDescriptionDesiredState = false;

    // DOM query cache (for performance optimization)
    this._textTracksCache = null;
    this._textTracksDirty = true;
    this._sourceElementsCache = null;
    this._sourceElementsDirty = true;
    this._trackElementsCache = null;
    this._trackElementsDirty = true;

    // Timeout management (for cleanup)
    this.timeouts = new Set();

    // Components
    this.container = document.createElement('div');
    this.renderer = null;
    this.controlBar = null;
    this.captionManager = null;
    this.keyboardManager = null;

    // Metadata handling
    this.metadataCueChangeHandler = null;

    // Feature managers (lazy-loaded)
    this.audioDescriptionManager = null;
    this.signLanguageManager = null;
    this._managersLoading = null; // Promise for loading managers

    // Backward-compatible property aliases for SignLanguageManager
    // These allow existing code to reference this.signLanguageWrapper, etc.
    Object.defineProperties(this, {
      signLanguageWrapper: {
        get: () => this.signLanguageManager?.wrapper,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.wrapper = v;
        }
      },
      signLanguageVideo: {
        get: () => this.signLanguageManager?.video,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.video = v;
        }
      },
      signLanguageHeader: {
        get: () => this.signLanguageManager?.header,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.header = v;
        }
      },
      signLanguageSettingsButton: {
        get: () => this.signLanguageManager?.settingsButton,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.settingsButton = v;
        }
      },
      signLanguageSettingsMenu: {
        get: () => this.signLanguageManager?.settingsMenu,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.settingsMenu = v;
        }
      },
      signLanguageSettingsMenuVisible: {
        get: () => this.signLanguageManager?.settingsMenuVisible,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.settingsMenuVisible = v;
        }
      },
      signLanguageDraggable: {
        get: () => this.signLanguageManager?.draggable,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.draggable = v;
        }
      },
      currentSignLanguage: {
        get: () => this.signLanguageManager?.currentLanguage,
        set: (v) => {
          if (this.signLanguageManager) this.signLanguageManager.currentLanguage = v;
        }
      }
    });

    // Initialize
    this.init();
  }

  /** Convenience getter for subsystems that take an AbortSignal. */
  get lifecycleSignal(): AbortSignal {
    return this._lifecycleController.signal;
  }

  /**
   * Get cached text tracks array
   * @returns {Array} Array of text tracks
   */
  get textTracks() {
    if (!this._textTracksCache || this._textTracksDirty) {
      this._textTracksCache = Array.from(this.element.textTracks || []);
      this._textTracksDirty = false;
    }
    return this._textTracksCache;
  }

  /**
   * Get cached source elements array
   * @returns {Array} Array of source elements
   */
  get sourceElements() {
    if (!this._sourceElementsCache || this._sourceElementsDirty) {
      this._sourceElementsCache = Array.from(this.element.querySelectorAll('source'));
      this._sourceElementsDirty = false;
    }
    return this._sourceElementsCache;
  }

  /**
   * Get cached track elements array
   * @returns {Array} Array of track elements
   */
  get trackElements() {
    if (!this._trackElementsCache || this._trackElementsDirty) {
      this._trackElementsCache = Array.from(this.element.querySelectorAll('track'));
      this._trackElementsDirty = false;
    }
    return this._trackElementsCache;
  }

  /**
   * Show a small in-player notice (non-blocking), also announced to screen readers.
   */
  showNotice(message: string, {timeout = 2500, priority = 'polite' as 'polite' | 'assertive'} = {}) {
    try {
      if (!message) return;
      if (!this.container) return;

      if (this.keyboardManager?.announce) {
        this.keyboardManager.announce(message, priority);
      }

      if (!this.noticeElement) {
        const el = document.createElement('div');
        el.className = `${this.options.classPrefix}-notice`;
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', priority);
        el.setAttribute('aria-atomic', 'true');
        el.style.position = 'absolute';
        el.style.left = '0.75rem';
        el.style.right = '0.75rem';
        el.style.top = '0.75rem';
        el.style.zIndex = '9999';
        el.style.padding = '0.5rem 0.75rem';
        el.style.borderRadius = '0.5rem';
        el.style.background = 'rgba(0, 0, 0, 0.75)';
        el.style.color = '#fff';
        el.style.fontSize = '0.875rem';
        el.style.lineHeight = '1.3';
        el.style.pointerEvents = 'none';
        this.noticeElement = el;
        this.container.appendChild(el);
      }

      const noticeElement = this.noticeElement;
      noticeElement.textContent = message;
      noticeElement.style.display = 'block';

      if (this.noticeTimeout) {
        clearTimeout(this.noticeTimeout);
        this.noticeTimeout = null;
      }
      this.noticeTimeout = setTimeout(() => {
        if (this.noticeElement) {
          this.noticeElement.style.display = 'none';
        }
      }, timeout);
    } catch {
      // ignore
    }
  }

  async init() {
    try {
      this.log('Initializing VidPly player');

      // Load custom language files if specified
      if (this.options.languageFiles) {
        try {
          await i18n.loadLanguagesFromUrls(this.options.languageFiles);
        } catch (error: unknown) {
          console.warn('Failed to load some language files:', error);
        }
      }

      if (this.options.languageFile && this.options.languageFileUrl) {
        try {
          await i18n.loadLanguageFromUrl(this.options.languageFile, this.options.languageFileUrl);
          this.log(`Custom language file loaded for ${this.options.languageFile}`);
        } catch (error: unknown) {
          console.warn(`Failed to load language file for ${this.options.languageFile}:`, error);
        }
      }

      // Auto-detect language from HTML lang attribute if not explicitly set
      if (!this.options.language || this.options.language === 'en') {
        const htmlLang = this.detectHtmlLanguage();
        if (htmlLang) {
          this.options.language = htmlLang;
          this.log(`Auto-detected language from HTML: ${htmlLang}`);
        }
      }

      // Ensure we have a language set (default to 'en' if not set)
      if (!this.options.language) {
        this.options.language = 'en';
      }

      // Ensure requested language is available (loads built-ins on demand)
      await i18n.ensureLanguage(this.options.language);

      // Set language
      i18n.setLanguage(this.options.language);

      // Create container
      this.createContainer();
      this.initStandaloneTrackInfo();

      // Suppress native Picture-in-Picture when the custom floating
      // player is enabled. This removes Chrome's hover PiP button and
      // the "Picture in Picture" entry in the video context menu and
      // prevents the remote playback indicator from hijacking playback.
      if (this.options.floating && this.element && this.element.tagName === 'VIDEO') {
        try {
          const mediaEl = this.element as HTMLMediaElement & {
            disablePictureInPicture?: boolean;
            disableRemotePlayback?: boolean
          };
          mediaEl.disablePictureInPicture = true;
          mediaEl.disableRemotePlayback = true;
          this.element.setAttribute('disablepictureinpicture', '');
          this.element.setAttribute('disableremoteplayback', '');
        } catch (err) {
          this.log(`Failed to disable native PiP: ${err}`, 'warn');
        }
      }

      const src: string | undefined = this.element.src || this.element.querySelector('source')?.src;
      if (src) {
        await this.initializeRenderer();
      } else {
        this.log('No initial source - waiting for playlist or manual load');
      }

      // Initialize feature managers (lazy-loaded based on options)
      await this.initFeatureManagers();

      // Create controls
      if (this.options.controls) {
        this.controlBar = new ControlBar(this);
        this.videoWrapper?.appendChild(this.controlBar.element);
      }

      // Initialize captions
      if (this.options.captions) {
        this.captionManager = new CaptionManager(this);
      }

      // Initialize transcript lazily unless explicitly requested
      if (this.options.transcript) {
        await this.ensureTranscriptManager();
      }

      // Always set up metadata track handling (independent of transcript)
      this.setupMetadataHandling();

      // Initialize keyboard controls
      if (this.options.keyboard) {
        this.keyboardManager = new KeyboardManager(this);
      }

      // Integrate with OS media controls (Media Session API)
      if (this.options.mediaSession) {
        this.mediaSessionManager = new MediaSessionManager(this);
      }

      // Set up responsive handlers
      this.setupResponsiveHandlers();

      // Set initial state
      if (this.options.startTime > 0) {
        this.seek(this.options.startTime);
      }

      // Apply volume and mute settings after renderer is initialized
      // Use requestAnimationFrame to ensure renderer is fully ready
      requestAnimationFrame(() => {
        if (this.options.muted) {
          this.mute();
        } else if (this.renderer && this.renderer.media) {
          // Ensure media element is not muted if options say it shouldn't be
          this.renderer.setMuted(false);
        }

        if (this.options.volume !== 0.8) {
          this.setVolume(this.options.volume);
        } else if (this.renderer && this.renderer.media) {
          // Ensure volume is set even if it's the default
          this.renderer.setVolume(this.options.volume);
        }
      });

      // Initialize resume playback feature
      if (this.options.resumePlayback) {
        this.initResumePlayback();
      }

      // Mark as ready
      this.state.ready = true;
      this._originalElement.classList.add('vidply-initialized');
      this.emit('ready');

      if (this.options.onReady) {
        this.options.onReady.call(this);
      }

      // Autoplay if enabled
      if (this.options.autoplay) {
        this.play();
      }

      this.log('Player initialized successfully');
    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  /**
   * Ensure the transcript manager is available, creating it on demand.
   * This keeps the initial load fast when transcripts are not needed.
   */
  async ensureTranscriptManager() {
    if (this.transcriptManager) {
      return this.transcriptManager;
    }

    if (!this.options.transcript && !this.options.transcriptButton) {
      return null;
    }

    const module = await import('../controls/TranscriptManager.js');
    const fallbackDefault = (module as { default?: typeof TranscriptManager }).default;
    const Manager = module.TranscriptManager || fallbackDefault;

    if (!Manager) {
      return null;
    }

    this.transcriptManager = new Manager(this);
    return this.transcriptManager;
  }

  /**
   * Toggle transcript visibility, lazily creating the manager if necessary.
   */
  async toggleTranscript() {
    const manager = await this.ensureTranscriptManager();
    if (!manager) return;

    manager.toggleTranscript();
    if (this.controlBar) {
      this.controlBar.updateTranscriptButton();
    }
  }

  /**
   * Ensure the audio description manager is available, creating it on demand.
   * This keeps the initial load fast when an audio description is not needed.
   */
  async ensureAudioDescriptionManager() {
    if (this.audioDescriptionManager) {
      return this.audioDescriptionManager;
    }

    // Only load the chunk when there is actual audio-description content to
    // drive it. The button option alone (default `true`) is not enough — the
    // control bar already hides the button when no content is present, so a
    // content-less player never needs this manager.
    if (!this.hasAudioDescriptionContent()) {
      return null;
    }

    const AudioDescManager = await loadAudioDescriptionManager();
    this.audioDescriptionManager = new AudioDescManager(this);
    return this.audioDescriptionManager;
  }

  /**
   * True when the current media actually exposes audio-description content:
   * an explicit described-audio source, `<source>` elements carrying
   * `data-desc-src` / `data-orig-src`, or a `descriptions` text track.
   * Mirrors `ControlBar.hasAudioDescription()` so the chunk load and the
   * button visibility stay in lock-step.
   */
  hasAudioDescriptionContent(): boolean {
    if (this.options.audioDescriptionSrc || this.audioDescriptionSrc) {
      return true;
    }

    const hasSourceElementsWithDesc = this.sourceElements.some(
      (el: HTMLSourceElement) => el.getAttribute('data-desc-src') || el.getAttribute('data-orig-src')
    );
    if (hasSourceElementsWithDesc) {
      return true;
    }

    const textTracks = this.element ? Array.from(this.element.textTracks || []) : [];
    return textTracks.some((track) => track.kind === 'descriptions');
  }

  // ============================================
  // Resume Playback Methods
  // ============================================

  /**
   * Ensure the sign language manager is available, creating it on demand.
   * This keeps the initial load fast when sign language is not needed.
   */
  async ensureSignLanguageManager() {
    if (this.signLanguageManager) {
      return this.signLanguageManager;
    }

    // Only load the chunk when an actual sign-language source is configured.
    // As with audio description, the button alone (default `true`) is not a
    // reason to pull in the manager on content-less players.
    if (!this.hasSignLanguageContent()) {
      return null;
    }

    const SignLangManager = await loadSignLanguageManager();
    this.signLanguageManager = new SignLangManager(this);
    return this.signLanguageManager;
  }

  /**
   * True when a sign-language video source (single `signLanguageSrc` or a
   * `signLanguageSources` map) is configured. Mirrors
   * `ControlBar.hasSignLanguage()`.
   */
  hasSignLanguageContent(): boolean {
    if (this.options.signLanguageSrc || this.signLanguageSrc) {
      return true;
    }
    return Boolean(this.options.signLanguageSources &&
      Object.keys(this.options.signLanguageSources).length > 0);
  }

  /**
   * Lazy-load and instantiate the floating (in-page PiP) manager. Only
   * created when `options.floating === true` and the media element is a
   * <video>. Audio-only players never float.
   */
  async ensureFloatingPlayerManager() {
    if (this.floatingPlayerManager) {
      return this.floatingPlayerManager;
    }
    if (!this.options.floating) {
      return null;
    }
    if (!this.element || this.element.tagName !== 'VIDEO') {
      return null;
    }
    const FloatingManager = await loadFloatingPlayerManager();
    this.floatingPlayerManager = new FloatingManager(this);
    return this.floatingPlayerManager;
  }

  /**
   * Initialize feature managers if needed (called during init)
   */
  async initFeatureManagers() {
    const promises = [];

    // Load the audio-description manager only when the media actually carries
    // description content (described-audio source, `data-desc-src` sources, or
    // a `descriptions` text track). The button option alone no longer pulls in
    // the chunk — content-less players stay lean. Late-arriving content (e.g.
    // streaming description tracks) is handled by `updateAccessibilityButtons`
    // + the lazy `ensureAudioDescriptionManager()` on first toggle.
    if (this.hasAudioDescriptionContent()) {
      promises.push(this.ensureAudioDescriptionManager());
    }

    // Load the sign-language manager only when a sign-language source exists.
    if (this.hasSignLanguageContent()) {
      promises.push(this.ensureSignLanguageManager());
    }

    // Load floating (custom in-page PiP) manager if enabled
    if (this.options.floating && this.element && this.element.tagName === 'VIDEO') {
      promises.push(this.ensureFloatingPlayerManager());
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    if (this.audioDescriptionManager) {
      this.audioDescriptionManager.initFromSourceElements(this.sourceElements, this.trackElements);
    }
  }

  /**
   * Detect language from HTML lang attribute
   * @returns {string|null} Language code if available in translations or as built-in, null otherwise
   */
  detectHtmlLanguage() {
    // Try to get lang from html element
    const htmlLang = document.documentElement.lang || document.documentElement.getAttribute('lang');

    if (!htmlLang) {
      return null;
    }

    // Normalize the language code (e.g., "en-US" -> "en", "de-DE" -> "de")
    const normalizedLang = htmlLang.toLowerCase().split('-')[0];
    if (!normalizedLang) {
      return null;
    }

    // Check if this language is available in our translations (already loaded)
    if (i18n.translations[normalizedLang]) {
      return normalizedLang;
    }

    // Check if this language is available as a built-in that can be loaded on demand
    const i18nWithLoaders = i18n as unknown as { builtInLanguageLoaders?: Record<string, unknown> };
    if (i18nWithLoaders.builtInLanguageLoaders && i18nWithLoaders.builtInLanguageLoaders[normalizedLang]) {
      return normalizedLang;
    }

    // Language not available, will fall back to English
    this.log(`Language "${htmlLang}" not available, using English as fallback`);
    return null; // Return null instead of 'en' to let the default language handling work
  }

  /**
   * Initialise the resume-playback feature. Lazily constructs a
   * `ResumeManager` on first use so disabled pages don't pay the DOM
   * / listener cost. Repeat calls are safe — the manager's own
   * `init()` is idempotent.
   */
  initResumePlayback(): void {
    if (!this.resumeManager) {
      this.resumeManager = new ResumeManager(this);
    }
    this.resumeManager.init();
  }

  /**
   * Render track metadata above the media for single-item players. Skipped
   * when a playlist manager owns the track-info header instead.
   */
  initStandaloneTrackInfo(): void {
    if (this.playlistManager || !this.container) {
      return;
    }

    const data = this.buildStandaloneTrackInfoData();
    if (!data) {
      return;
    }

    this.trackInfoView = new TrackInfoView(this.options.classPrefix);
    this.trackInfoView.mount(this.container);
    this.trackInfoView.render(data);
  }

  private buildStandaloneTrackInfoData(): TrackInfoData | null {
    const opts = this.options;
    const data: TrackInfoData = {
      title: typeof opts.title === 'string' ? opts.title : undefined,
      artist: typeof opts.artist === 'string' ? opts.artist : undefined,
      description: typeof opts.description === 'string' ? opts.description : undefined,
      longDescription: typeof opts.longDescription === 'string' ? opts.longDescription : undefined,
      date: typeof opts.date === 'string' ? opts.date : undefined,
      duration: opts.initialDuration > 0 ? opts.initialDuration : undefined
    };

    const hasContent = Boolean(
      (data.title ?? '').trim()
      || (data.artist ?? '').trim()
      || (data.description ?? '').trim()
      || (data.longDescription ?? '').trim()
      || (data.date ?? '').trim()
      || (data.duration ?? 0) > 0
    );

    return hasContent ? data : null;
  }

  /**
   * Get a unique identifier for the current video
   * Uses data-video-id attribute if available, otherwise hashes the source URL
   * @returns {string|null} Video ID or null if not available
   */
  getVideoId() {
    // First check for explicit video ID attribute
    const explicitId = this.element.getAttribute('data-video-id') ||
      this.element.dataset.videoId ||
      this._originalElement?.getAttribute('data-video-id') ||
      this._originalElement?.dataset?.videoId;

    if (explicitId) {
      return explicitId;
    }

    // Get source URL
    let src: string | null | undefined = this.element.src;
    if (!src) {
      const sourceEl = this.element.querySelector<HTMLSourceElement>('source');
      src = sourceEl?.src;
    }

    if (!src) {
      return null;
    }

    return this._hashString(src);
  }

  /**
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {string} Hash string
   */
  _hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return 'v_' + Math.abs(hash).toString(36);
  }

  // Resume-playback delegates. Implementations live in
  // `core/ResumeManager.ts`; these stubs keep the public API.
  saveProgress(): void { this.resumeManager?.saveProgress(); }

  checkForResume(): void { this.resumeManager?.checkForResume(); }

  showResumePrompt(savedTime: number): void { this.resumeManager?.showPrompt(savedTime); }

  hideResumePrompt(): void { this.resumeManager?.hidePrompt(); }

  // Theme delegates. All four keep their original names so external
  // callers keep working; the real work is in `core/ThemeManager.ts`.
  applyTheme(): void { this.themeManager.apply(); }

  setTheme(themeName: ThemeName, customVariables: Record<string, string> = {}): void {
    this.themeManager.set(themeName, customVariables);
  }

  getTheme(): ThemeName | undefined { return this.themeManager.get(); }

  setThemeVariable(variableName: string, value: string): void {
    this.themeManager.setVariable(variableName, value);
  }

  resetTheme(): void { this.themeManager.reset(); }

  createContainer() {
    // Create main container with unique label for multiple players on same page
    const playerLabel = this.instanceId > 1
      ? `${i18n.t('player.label')} ${this.instanceId}`
      : i18n.t('player.label');

    // Use role="region" (a labelled perceivable section) rather than
    // role="application". role="application" forces most screen readers into
    // application mode, suppressing their virtual-cursor/browse mode and
    // standard reading shortcuts for everything inside the player. A media
    // player built from native <button> controls and a custom slider does not
    // need that; a labelled region keeps normal AT navigation while the
    // control bar (role="region"/toolbar) and keyboard shortcuts still work
    // when the container is focused (WCAG 4.1.2, 2.1.1).
    this.container = DOMUtils.createElement('div', {
      className: `${this.options.classPrefix}-player`,
      attributes: {
        'role': 'region',
        'aria-label': playerLabel,
        'tabindex': '0'
      }
    });

    // Add media type class
    const mediaType = this.element.tagName.toLowerCase();
    this.container.classList.add(`${this.options.classPrefix}-${mediaType}`);

    // Add responsive class
    if (this.options.responsive) {
      this.container.classList.add(`${this.options.classPrefix}-responsive`);
    }

    // Create video wrapper (for proper positioning of controls)
    this.videoWrapper = DOMUtils.createElement('div', {
      className: `${this.options.classPrefix}-video-wrapper`
    });

    // Wrap original element
    this.element.parentNode?.insertBefore(this.container, this.element);

    // Create a track artwork element for single audio files (before video wrapper)
    // This shows the poster/artwork above the audio player (similar to playlists).
    // Poster URL is validated and CSS-escaped before interpolation.
    if (this.element.tagName === 'AUDIO' && this.options.poster) {
      const safePoster = sanitizePosterUrl(this.options.poster);
      if (safePoster) {
        this.trackArtworkElement = DOMUtils.createElement('div', {
          className: `${this.options.classPrefix}-track-artwork`,
          attributes: {
            'aria-hidden': 'true'
          }
        });
        this.trackArtworkElement.style.backgroundImage = `url("${cssEscapeUrl(safePoster)}")`;
        this.container.appendChild(this.trackArtworkElement);
      } else {
        this.log(`[VidPly] Ignored unsafe poster URL`, 'warn');
      }
    }

    this.container.appendChild(this.videoWrapper);
    this.videoWrapper.appendChild(this.element);

    // Hide native controls and set dimensions
    this.element.controls = false;
    this.element.removeAttribute('controls');
    this.element.setAttribute('tabindex', '-1'); // Remove from tab order
    this.element.style.width = '100%';
    this.element.style.height = '100%';

    // Enable inline playback on iOS (prevents native fullscreen)
    // This allows custom controls to work on iOS devices
    if (this.element.tagName === 'VIDEO' && this.options.playsInline) {
      this.element.setAttribute('playsinline', '');
      (this.element as HTMLVideoElement).playsInline = true; // Property version
    }

    // Set dimensions
    if (this.options.width) {
      this.container.style.width = typeof this.options.width === 'number'
        ? `${this.options.width}px`
        : this.options.width;
    }

    if (this.options.height) {
      this.container.style.height = typeof this.options.height === 'number'
        ? `${this.options.height}px`
        : this.options.height;
    }

    // Set a poster (convert relative paths to absolute URLs). The
    // resolvePosterPath() output is then re-validated to ensure no
    // disallowed scheme survived.
    if (this.options.poster && this.element.tagName === 'VIDEO') {
      const resolvedPoster = sanitizePosterUrl(this.resolvePosterPath(this.options.poster));
      if (resolvedPoster) {
        (this.element as HTMLVideoElement).poster = resolvedPoster;
      }
    }

    // Create centered play button overlay (video by default, audio on request)
    if (this.isPlayButtonOverlayEnabled()) {
      this.createPlayButtonOverlay();
    }

    this.createBufferingLoadingOverlay();

    (this.element as HTMLMediaElement & { vidply?: Player }).vidply = this;

    // Add to static instances array
    Player.instances.push(this);

    // Make video/audio element clickable to toggle play/pause. The
    // listener is wired to the Player's lifecycle AbortController so
    // destroy() removes it without an explicit removeEventListener
    // pair.
    this.element.style.cursor = 'pointer';
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.toggle();
      }
    }, {signal: this.lifecycleSignal});

    this.on('play', () => {
      this.state.hasStartedPlayback = true;
      // Hide poster immediately when playing
      this.hidePosterOverlay();
    });

    this.on('timeupdate', () => {
      // Hide the poster when the video has started playing (currentTime > 0).
      // We additionally gate on `hasStartedPlayback` to ignore
      // background `currentTime` movements that the user did not
      // initiate — most notably dash.js startup gap-jump, which
      // synthesizes a small seek (often ~0.08s) right after MSE
      // attach to skip a manifest gap. Without this guard, that
      // synthetic seek hides the poster before the user has ever
      // pressed play, defeating the showPosterOverlay() call we
      // make from DASHRenderer.init() to keep the artwork visible
      // on top of the (transparent) <video> element.
      if (this.state.hasStartedPlayback && this.state.currentTime > 0) {
        this.hidePosterOverlay();
      }
    });

    // Also hide poster on loadeddata event (when first frame is loaded).
    // The same hasStartedPlayback gate as above: dash.js loads init+startup
    // segments at attachSource time, which triggers loadeddata before
    // the user clicks play. Hiding the poster there reveals the first
    // decoded frame instead of the artwork the publisher chose.
    this.element.addEventListener('loadeddata', () => {
      if (this.state.hasStartedPlayback && (this.state.playing || this.state.currentTime > 0)) {
        this.hidePosterOverlay();
      }
    }, {once: true});

    // Apply theme
    this.applyTheme();
  }

  /**
   * Whether the centered play overlay should be created for this player.
   * `playButtonOverlay: 'auto'` keeps it video-only.
   */
  isPlayButtonOverlayEnabled(): boolean {
    const option = this.options.playButtonOverlay;
    if (option === false) {
      return false;
    }
    if (this.element.tagName === 'VIDEO') {
      return true;
    }
    return option === true;
  }

  /** The node actually inserted into the DOM: the button on audio, the SVG on video. */
  getPlayButtonOverlayNode(): HTMLElement | SVGSVGElement | null {
    return this.playButtonOverlayButton ?? this.playButtonOverlay;
  }

  /**
   * (Re-)insert the overlay into its host. Audio players hang it on the track
   * artwork, which `PlaylistManager` may only create once a track is loaded —
   * hence the separate, idempotent mount step.
   */
  mountPlayButtonOverlay(host: HTMLElement | null = null) {
    const node = this.getPlayButtonOverlayNode();
    if (!node) {
      return;
    }

    const target = host
      ?? (this.element.tagName === 'AUDIO'
        ? (this.trackArtworkElement ?? this.container)
        : this.videoWrapper);

    if (!target || node.parentNode === target) {
      return;
    }

    // A focusable control must never sit inside an aria-hidden subtree
    // (the artwork element is decorative and hidden by default).
    if (this.playButtonOverlayButton) {
      target.removeAttribute('aria-hidden');
    }

    target.appendChild(node);
  }

  createPlayButtonOverlay() {
    const overlay = createPlayOverlay();
    this.playButtonOverlay = overlay;

    if (this.element.tagName === 'AUDIO') {
      // Unlike video, an <audio> element offers no click surface, so the
      // overlay has to be an operable control rather than decoration.
      const button = DOMUtils.createElement('button', {
        className: `${this.options.classPrefix}-play-overlay-button`,
        attributes: {
          type: 'button',
          'aria-label': i18n.t('player.play')
        }
      }) as HTMLButtonElement;
      button.appendChild(overlay);
      button.addEventListener('click', () => {
        this.toggle();
      });
      this.playButtonOverlayButton = button;
    } else {
      overlay.addEventListener('click', () => {
        this.toggle();
      });
    }

    const node = this.getPlayButtonOverlayNode() as HTMLElement | SVGSVGElement;
    this.mountPlayButtonOverlay();

    this.on('play', () => {
      node.style.opacity = '0';
      node.style.pointerEvents = 'none';
      this.playButtonOverlayButton?.setAttribute('aria-label', i18n.t('player.pause'));
    });

    this.on('pause', () => {
      node.style.opacity = '1';
      node.style.pointerEvents = 'auto';
      this.playButtonOverlayButton?.setAttribute('aria-label', i18n.t('player.play'));
      this.positionPlayOverlayOnMobile();
    });

    this.on('ended', () => {
      node.style.opacity = '1';
      node.style.pointerEvents = 'auto';
      this.playButtonOverlayButton?.setAttribute('aria-label', i18n.t('player.play'));
      this.positionPlayOverlayOnMobile();
    });

    const debouncedPosition = debounce(() => {
      this.positionPlayOverlayOnMobile();
    }, 150);
    this.debouncedPositionPlayOverlay = debouncedPosition;

    window.addEventListener('resize', debouncedPosition, {signal: this.lifecycleSignal});

    this.on('loadedmetadata', () => {
      this.positionPlayOverlayOnMobile();
    });

    // Recalculate on fullscreen change with RAF
    this.on('enterfullscreen', () => {
      rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
    });

    this.on('exitfullscreen', () => {
      rafWithTimeout(() => this.positionPlayOverlayOnMobile(), 100);
    });
  }

  /**
   * Purely additive buffering spinner. Never touches play overlay or any other UI —
   * only toggles `vidply-buffering` on the container and manages its own `.vidply-loading` node.
   * Skipped for external providers (YouTube, Vimeo, SoundCloud) which have native loading UI.
   */
  createBufferingLoadingOverlay() {
    if (!this.videoWrapper) {
      return;
    }

    const prefix = this.options.classPrefix as string;
    const bufferingLabel = i18n.t('player.buffering');

    const loading = DOMUtils.createElement('div', {
      className: `${prefix}-loading`,
      attributes: {
        'aria-busy': 'false'
      }
    });

    const srAnnouncer = DOMUtils.createElement('span', {
      className: `${prefix}-sr-only`,
      attributes: {
        id: `${prefix}-buffering-live-${this.instanceId}`,
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });
    loading.appendChild(srAnnouncer);

    this.loadingOverlayElement = loading;
    this.videoWrapper.appendChild(loading);

    const isExternalControls = () =>
      this.container?.classList.contains(`${prefix}-external-controls`);

    const showBuffering = () => {
      // Skip for external providers (YouTube, Vimeo, SoundCloud — they own
      // their own loading UI). Otherwise, allow the spinner whenever:
      //  - the user has already started playback (normal mid-playback buffering), OR
      //  - the user is currently seeking (e.g. scrubbed the seekbar before
      //    pressing play, or after stop()) — they explicitly asked the
      //    player to fetch data, so giving feedback is the right thing.
      if (isExternalControls()) {
        return;
      }
      if (!this.state.hasStartedPlayback && !this.state.seeking) {
        return;
      }
      this.container.classList.add(`${prefix}-buffering`);
      loading.setAttribute('aria-busy', 'true');
      srAnnouncer.textContent = bufferingLabel;
    };

    const hideBuffering = () => {
      if (!this.container.classList.contains(`${prefix}-buffering`)) {
        return;
      }
      this.container.classList.remove(`${prefix}-buffering`);
      loading.setAttribute('aria-busy', 'false');
      srAnnouncer.textContent = '';
    };

    this.on('waiting', showBuffering);
    this.on('canplay', hideBuffering);
    this.on('pause', hideBuffering);
    this.on('ended', hideBuffering);

    // Native `playing` — fires on the media element for all renderer types (HTML5, HLS, DASH).
    this._bufferingHideOnMediaPlaying = hideBuffering;
    this.element.addEventListener('playing', this._bufferingHideOnMediaPlaying);

    // Safety net: if timeupdate is ticking, media is clearly playing — clear any stale spinner.
    this.on('timeupdate', () => {
      if (this.container.classList.contains(`${prefix}-buffering`)) {
        hideBuffering();
      }
    });
  }

  positionPlayOverlayOnMobile() {
    // Video only: the overlay has to follow the letterboxed video box inside
    // the wrapper. On audio it is centered on the artwork purely by CSS.
    if (!this.playButtonOverlay || this.element.tagName !== 'VIDEO') {
      return;
    }

    const mobile = isMobile();

    if (!mobile) {
      // Reset to CSS defaults on desktop
      this.playButtonOverlay.style.top = '';
      return;
    }

    const videoRect = this.element.getBoundingClientRect();
    const wrapperRect = this.videoWrapper?.getBoundingClientRect();
    if (!wrapperRect) return;
    const videoCenter = (videoRect.top - wrapperRect.top) + (videoRect.height / 2);

    this.playButtonOverlay.style.top = `${videoCenter}px`;
  }

  async initializeRenderer() {
    let src: string | null | undefined = this._pendingSource;
    let rendererClass: (new (player: Player) => Renderer) | null = null;

    if (!src) {
      const sourceElements = Array.from(this.element.querySelectorAll('source'));
      if (sourceElements.length > 1) {
        const negotiated = this._selectBestSource(sourceElements);
        src = negotiated.src;
        this._fallbackSources = negotiated.fallbacks;
      } else {
        src = this.element.src || sourceElements[0]?.src;
        this._fallbackSources = [];
      }
    } else {
      this._fallbackSources = [];
    }

    if (!src) {
      throw new Error('No media source found');
    }

    this.currentSource = src;
    this._pendingSource = null;

    // Pull in the audio-description manager on demand when this source carries
    // description content (it is no longer eagerly loaded for content-less
    // players). Then (re)scan the current source/track elements.
    if (this.hasAudioDescriptionContent()) {
      await this.ensureAudioDescriptionManager();
    }
    this.audioDescriptionManager?.initFromSourceElements(this.sourceElements, this.trackElements);

    if (!this.originalSrc) {
      this.originalSrc = src;
    }

    rendererClass = await this._detectRendererClass(src);

    this.log(`Using ${rendererClass?.name || 'HTML5Renderer'} renderer`);
    this.renderer = new rendererClass(this);

    const initTimeout = (this._fallbackSources?.length ?? 0) > 0 ? 10000 : 0;
    if (initTimeout > 0) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        this.renderer.init(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Renderer init timed out after ${initTimeout}ms`)), initTimeout);
        }),
      ]).finally(() => {
        if (timer !== undefined) clearTimeout(timer);
      });
    } else {
      await this.renderer.init();
    }

    this.invalidateTrackCache();
  }

  async _detectRendererClass(src: string): Promise<new (player: Player) => Renderer> {
    type RendererCtor = new (player: Player) => Renderer;
    type RendererModule = Record<string, RendererCtor | undefined> & { default?: RendererCtor };
    switch (classifyRendererType(src)) {
      case 'youtube': {
        const module = await import('../renderers/YouTubeRenderer.js') as RendererModule;
        return (module.YouTubeRenderer ?? module.default) as RendererCtor;
      }
      case 'vimeo': {
        const module = await import('../renderers/VimeoRenderer.js') as RendererModule;
        return (module.VimeoRenderer ?? module.default) as RendererCtor;
      }
      case 'hls': {
        const module = await import('../renderers/HLSRenderer.js') as RendererModule;
        return (module.HLSRenderer ?? module.default) as RendererCtor;
      }
      case 'dash': {
        const module = await import('../renderers/DASHRenderer.js') as RendererModule;
        return (module.DASHRenderer ?? module.default) as RendererCtor;
      }
      case 'soundcloud': {
        const module = await import('../renderers/SoundCloudRenderer.js') as RendererModule;
        return (module.SoundCloudRenderer ?? module.default) as RendererCtor;
      }
      default:
        return HTML5Renderer as unknown as RendererCtor;
    }
  }

  _selectBestSource(sourceElements: HTMLSourceElement[]): {
    src: string;
    fallbacks: Array<{ src: string; type: string }>
  } {
    const hasMSE = typeof MediaSource !== 'undefined';
    type SourceInfo = { src: string; type: string; el: HTMLSourceElement };
    const sources: SourceInfo[] = sourceElements.map((el) => ({
      src: el.src || el.getAttribute('src') || '',
      type: el.type || el.getAttribute('type') || '',
      el,
    }));

    const canPlayNativeHLS = (() => {
      const v = document.createElement('video');
      return v.canPlayType('application/vnd.apple.mpegurl') !== '';
    })();

    let chosen: SourceInfo | undefined;

    if (hasMSE) {
      chosen = sources.find((s) => s.src.includes('.mpd'));
    }

    if (!chosen) {
      const hlsSource = sources.find((s) => s.src.includes('.m3u8'));
      if (hlsSource && (hasMSE || canPlayNativeHLS)) {
        chosen = hlsSource;
      }
    }

    if (!chosen) {
      chosen = sources.find((s) => !s.src.includes('.mpd') && !s.src.includes('.m3u8')) || sources[0];
    }

    const fallbacks = sources
      .filter((s) => s !== chosen)
      .map((s) => ({src: s.src, type: s.type}));

    return {src: chosen?.src ?? '', fallbacks};
  }

  async _fallbackToNextSource(): Promise<boolean> {
    if (!this._fallbackSources || this._fallbackSources.length === 0) {
      return false;
    }

    const next = this._fallbackSources.shift();
    if (!next) return false;
    this.log(`Falling back to next source: ${next.src}`);

    try {
      if (this.renderer && typeof this.renderer.destroy === 'function') {
        this.renderer.destroy();
        this.renderer = null;
      }

      this.currentSource = next.src;
      this._pendingSource = next.src;
      this._isFallingBack = true;
      await this.initializeRenderer();
      this._isFallingBack = false;
      return true;
    } catch {
      this.log(`Fallback source failed: ${next.src}`, 'warn');
      this._isFallingBack = false;
      return this._fallbackToNextSource();
    }
  }

  /**
   * Invalidate DOM query cache (call when tracks/sources change)
   */
  invalidateTrackCache() {
    this._textTracksDirty = true;
    this._trackElementsDirty = true;
    this._sourceElementsDirty = true;
  }

  /**
   * Find a text track by kind and optionally language
   * @param {string} kind - Track kind (captions, subtitles, descriptions, chapters, metadata)
   * @param {string} [language] - Optional language code
   * @returns {TextTrack|null} Found track or null
   */
  findTextTrack(kind: string, language: string | null = null) {
    const tracks = this.textTracks;
    if (language) {
      return tracks.find((t) => t.kind === kind && t.language === language);
    }
    return tracks.find((t) => t.kind === kind);
  }

  /**
   * Find a source element by attribute
   * @param {string} attribute - Attribute name (e.g., 'data-desc-src')
   * @param {string} [value] - Optional attribute value
   * @returns {Element|null} Found source element or null
   */
  findSourceElement(attribute: string, value: string | null = null) {
    const sources = this.sourceElements;
    if (value) {
      return sources.find((el) => el.getAttribute(attribute) === value);
    }
    return sources.find((el) => el.hasAttribute(attribute));
  }

  /**
   * Find a track element by its associated TextTrack
   * @param {TextTrack} track - The TextTrack object
   * @returns {Element|null} Found track element or null
   */
  findTrackElement(track: TextTrack) {
    return this.trackElements.find((el) => el.track === track);
  }

  // Poster delegates. Implementations live in `core/PosterManager.ts`.
  resolvePosterPath(posterPath: string | null | undefined): string {
    return this.posterManager.resolvePath(posterPath);
  }

  async generatePosterFromVideo(time = 10): Promise<string | null> {
    return this.posterManager.generateFromVideo(time);
  }

  async autoGeneratePoster(): Promise<void> {
    return this.posterManager.autoGenerate();
  }

  showPosterOverlay(): void { this.posterManager.showOverlay(); }

  hidePosterOverlay(): void { this.posterManager.hideOverlay(); }

  /**
   * Set a managed timeout that will be cleaned up on destroy
   * @param {Function} callback - Callback function
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timeout ID
   */
  setManagedTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout> {
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {
      this.timeouts.delete(timeoutId);
      callback();
    }, delay);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  /**
   * Clear a managed timeout
   * @param {number} timeoutId - Timeout ID to clear
   */
  clearManagedTimeout(timeoutId: ReturnType<typeof setTimeout> | null | undefined) {
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(timeoutId);
    }
  }

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

  async load(config: PlayerLoadConfig) {
    try {
      this.log('Loading new media:', config.src);

      // Pause current playback
      if (this.renderer) {
        this.pause();
      }

      // Save scroll position to prevent browser from auto-scrolling when loading new media
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      // Clear existing text tracks
      const existingTracks = this.trackElements;
      existingTracks.forEach((track) => track.remove());
      this.invalidateTrackCache();

      // Check if this is an external renderer URL
      const isExternalRenderer = this.isExternalRendererUrl(config.src);

      // Set flag early to suppress any errors that might fire during the transition
      // This prevents HTML5 element errors from triggering playlist auto-advance
      if (isExternalRenderer) {
        this._switchingRenderer = true;
      }

      // Only set src on HTML5 element for non-external sources
      // External renderers (YouTube, Vimeo, SoundCloud, HLS, DASH) handle their own media loading
      if (!isExternalRenderer) {
        this.element.src = config.src;

        if (config.type) {
          (this.element as HTMLMediaElement & { type?: string }).type = config.type;
        }
      } else {
        // For external renderers, clear the src to prevent HTML5 element errors
        // but store the URL for the renderer to use
        // DO NOT call load() here - it will trigger an error event on an element without a valid source
        this.element.removeAttribute('src');
        // Also clear any source elements to prevent errors
        const sources = this.element.querySelectorAll('source');
        sources.forEach(s => s.removeAttribute('src'));
      }

      // Store the source URL for external renderers to access
      this._pendingSource = config.src;

      this._isAudioContent = Boolean(config.type && config.type.startsWith('audio/'));

      // Apply or remove audio content class (16:3 aspect ratio for audio in video player)
      if (this.container) {
        if (this._isAudioContent) {
          this.container.classList.add('vidply-audio-content');
        } else {
          this.container.classList.remove('vidply-audio-content');
        }
      }

      // Handle poster display based on content type
      if (config.poster && this.element.tagName === 'VIDEO') {
        if (this._isAudioContent) {
          // For audio in video player: use CSS poster overlay with 16:3 aspect ratio.
          // A manifest-supplied poster is attacker-influenced, so validate +
          // CSS-escape before interpolating into the `url(...)` custom property.
          this.element.removeAttribute('poster');
          if (this.videoWrapper) {
            const cssPoster = PosterManager.toSafeCssPoster(this.resolvePosterPath(config.poster));
            if (cssPoster) {
              this.videoWrapper.style.setProperty('--vidply-poster-image', cssPoster);
              this.videoWrapper.classList.add('vidply-forced-poster');
            } else {
              this.videoWrapper.style.removeProperty('--vidply-poster-image');
            }
          }
        } else {
          // For video: use normal poster and remove overlay. Validate the
          // URL (reject `javascript:`/other schemes) before assigning it.
          const safePoster = sanitizePosterUrl(this.resolvePosterPath(config.poster));
          if (safePoster) {
            (this.element as HTMLVideoElement).poster = safePoster;
          } else {
            this.element.removeAttribute('poster');
          }
          if (this.videoWrapper) {
            this.videoWrapper.classList.remove('vidply-forced-poster');
            this.videoWrapper.style.removeProperty('--vidply-poster-image');
          }
        }
      }

      if (config.tracks && config.tracks.length > 0) {
        config.tracks.forEach((trackConfig) => {
          const track = document.createElement('track');
          track.src = trackConfig.src ?? '';
          track.kind = trackConfig.kind || 'captions';
          track.srclang = trackConfig.srclang || 'en';
          track.label = trackConfig.label || trackConfig.srclang || '';

          if (trackConfig.default) {
            track.default = true;
          }

          if (typeof trackConfig.describedSrc === 'string') {
            track.setAttribute('data-desc-src', trackConfig.describedSrc);
          }

          // Insert tracks at the beginning (before any flow content) for HTML5 validity
          const firstChild = this.element.firstChild;
          if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && (firstChild as Element).tagName !== 'TRACK') {
            this.element.insertBefore(track, firstChild);
          } else {
            this.element.appendChild(track);
          }
        });
        this.invalidateTrackCache();
      }

      // Remember accessibility feature states before switching tracks
      const wasSignLanguageEnabled = this.state.signLanguageEnabled;
      const wasAudioDescriptionEnabled = this.state.audioDescriptionEnabled;

      // Update sources from config FIRST (before hiding features)
      this.audioDescriptionSrc = config.audioDescriptionSrc || null;
      this.signLanguageSrc = config.signLanguageSrc || null;

      // Update original source for toggling
      this.originalSrc = config.src;

      // Update manager sources for playlist changes
      if (this.audioDescriptionManager) {
        this.audioDescriptionManager.updateSources(config.audioDescriptionSrc);
        // Reinitialize to pick up new track elements with data-desc-src attributes
        this.audioDescriptionManager.reinitialize();
      }
      if (this.signLanguageManager) {
        this.signLanguageManager.updateSources(config.signLanguageSrc, config.signLanguageSources);
      }

      // Hide accessibility features that were enabled (must happen AFTER updating sources)
      if (wasAudioDescriptionEnabled) {
        this.disableAudioDescription();
      }
      if (wasSignLanguageEnabled) {
        this.disableSignLanguage();
      }

      // Check if we need to change renderer type
      const shouldChangeRenderer = this.shouldChangeRenderer(config.src);

      // DASH and HLS renderers manage their own source loading via MSE/hls.js
      // and must be fully destroyed+reinitialized when switching sources,
      // even when the renderer type stays the same.
      const needsFullReinit = !shouldChangeRenderer && this.renderer &&
        (this.renderer.dash || this.renderer.hls);

      // Destroy old renderer if changing types or if MSE-based renderer needs reinit
      if ((shouldChangeRenderer || needsFullReinit) && this.renderer) {
        this.renderer.destroy();
        this.renderer = null;

        // Clean up dynamically added caption/transcript buttons from the
        // previous renderer. The new renderer will re-add them if its
        // stream contains text tracks.
        if (this.controlBar) {
          this.controlBar.removeHlsCaptionButtons(true);
        }
        if (this.transcriptManager?.isVisible) {
          this.transcriptManager.hideTranscript();
        }
      }

      // Initialize or reinitialize renderer
      if (!this.renderer || shouldChangeRenderer || needsFullReinit) {
        await this.initializeRenderer();
      } else {
        // Just reload the current renderer with the updated element
        this.renderer.media = this.element; // Update media reference
        const sourceChanged = Boolean(config.src && config.src !== this.currentSource);

        if (sourceChanged && isExternalRenderer && typeof this.renderer.loadSource === 'function') {
          // Same embed renderer (YouTube→YouTube, Vimeo→Vimeo): swap the video
          // in-place instead of calling element.load(), which is a no-op here.
          this.currentSource = config.src;
          await this.renderer.loadSource(config.src);
        } else if (this.options.deferLoad) {
          try {
            this.element.preload = this.options.preload || 'metadata';
          } catch {
            // ignore
          }
          if (sourceChanged && config.src) {
            this.currentSource = config.src;
          }
          // Reset renderer-level deferred flags if present (HTML5/HLS/DASH
          // renderers). These are renderer-private implementation details, not
          // part of the public Renderer contract, so reach them via a
          // structural cast rather than the interface.
          if (this.renderer) {
            const deferState = this.renderer as Partial<{
              _didDeferredLoad: boolean;
              _hlsSourceLoaded: boolean;
              _dashSourceLoaded: boolean;
              _pendingSrc: string | null;
            }>;
            if (typeof deferState._didDeferredLoad === 'boolean') {
              deferState._didDeferredLoad = false;
            }
            if (typeof deferState._hlsSourceLoaded === 'boolean') {
              deferState._hlsSourceLoaded = false;
            }
            if (typeof deferState._dashSourceLoaded === 'boolean') {
              deferState._dashSourceLoaded = false;
            }
            if ('_pendingSrc' in this.renderer) {
              // For HLS, store pending src for the first play() call
              deferState._pendingSrc = this._pendingSource || this.currentSource || null;
            }
          }
        } else if (!isExternalRenderer) {
          if (sourceChanged && config.src) {
            this.currentSource = config.src;
          }
          this.element.load();
        } else if (sourceChanged) {
          // External renderer without in-place source switching (e.g. SoundCloud)
          this._pendingSource = config.src;
          this.renderer.destroy();
          this.renderer = null;
          await this.initializeRenderer();
        }
      }

      // Clear the renderer switching flag after a delay to catch async errors
      // This prevents errors from the old renderer's event queue from causing issues
      if (isExternalRenderer) {
        setTimeout(() => {
          this._switchingRenderer = false;
        }, 500);
      } else {
        this._switchingRenderer = false;
      }

      // Restore scroll position immediately after loading to prevent auto-scroll
      window.scrollTo(scrollX, scrollY);

      // For MSE-based renderers (DASH/HLS), skip CaptionManager/TranscriptManager
      // re-creation here. dash.js/hls.js create programmatic TextTrack objects
      // that persist on the <video> element after destroy() and cannot be removed
      // via standard APIs. Re-scanning element.textTracks would pick up these stale
      // tracks. Instead, the renderer's events (TEXT_TRACKS_ADDED etc.) will call
      // refreshTracks()/ensureCaptionsButton() once real tracks are available.
      if (needsFullReinit) {
        if (this.captionManager) {
          this.captionManager.disable();
          this.captionManager.tracks = [];
        }
        if (this.transcriptManager?.isVisible) {
          this.transcriptManager.hideTranscript();
        }
      } else {
        if (this.captionManager) {
          this.captionManager.destroy();
          this.captionManager = new CaptionManager(this);
        }

        if (this.transcriptManager) {
          const wasTranscriptVisible = this.transcriptManager.isVisible;
          this.transcriptManager.destroy();
          this.transcriptManager = null;

          const newManager = await this.ensureTranscriptManager();

          if (wasTranscriptVisible && this.controlBar && this.controlBar.hasCaptionTracks()) {
            newManager?.showTranscript();
          }
        }

        if (this.controlBar) {
          this.updateControlBar();
        }
      }

      // Restore scroll position after control bar update (may have caused micro-scrolls)
      window.scrollTo(scrollX, scrollY);

      // Restore accessibility features if they were enabled and available in new track
      if (wasSignLanguageEnabled && this.signLanguageSrc) {
        // Small delay to ensure player and control bar are ready
        setTimeout(() => {
          this.enableSignLanguage();
          // Restore scroll after sign language is shown
          window.scrollTo(scrollX, scrollY);
        }, 150);
      }

      if (wasAudioDescriptionEnabled && this.audioDescriptionSrc) {
        // Small delay to ensure player is ready
        setTimeout(() => {
          this.enableAudioDescription();
          // Restore scroll after audio description is enabled
          window.scrollTo(scrollX, scrollY);
        }, 150);
      }

      this.emit('sourcechange', config);
      this.log('Media loaded successfully');

    } catch (error: unknown) {
      this.handleError(error);
    }
  }

  /**
   * Ensure the current renderer has started its initial load (metadata/manifest)
   * without starting playback. This is useful for playlists to behave like
   * single videos on selection, while still keeping autoplay off.
   */
  ensureLoaded() {
    try {
      if (!this.renderer) return;
      if (typeof this.renderer.ensureLoaded === 'function') {
        this.renderer.ensureLoaded();
      }
    } catch {
      // ignore
    }
  }

  /**
   * Check if we need to change renderer type
   * @param {string} src - New source URL
   * @returns {boolean}
   */
  /**
   * Update the control bar to refresh button visibility based on available features
   */
  updateControlBar() {
    if (!this.controlBar) return;

    const controlBar = this.controlBar;

    // Clear existing controls content
    controlBar.element.innerHTML = '';

    // Recreate controls with updated feature detection
    controlBar.createControls();

    // Reattach events for the new controls
    controlBar.attachEvents();
    controlBar.setupAutoHide();
    controlBar.setupOverflowDetection();
  }

  shouldChangeRenderer(src: string) {
    if (!this.renderer) return true;

    // Compare the type the URL maps to against the current renderer's stable
    // `rendererType` field (not `constructor.name`, which minifiers mangle).
    // Both this check and `_detectRendererClass` classify via the same helper
    // so they can never disagree about a URL.
    return classifyRendererType(src) !== this.renderer.rendererType;
  }

  // Playback controls
  play() {
    if (this.renderer) {
      this.renderer.play();
      return;
    }

    // While a playlist track change is loading, the old renderer has been
    // destroyed and the new one is not ready yet. Do not re-enter
    // PlaylistManager.play() — that would duplicate load() for slow embed
    // renderers (YouTube, Vimeo, SoundCloud).
    if (this._switchingRenderer || this.playlistManager?.isChangingTrack) {
      return;
    }

    // Playlist support: if no renderer exists yet (no initial src),
    // start playback via playlist selection.
    if (this.playlistManager && Array.isArray(this.playlistManager.tracks) && this.playlistManager.tracks.length > 0) {
      const index = this.playlistManager.currentIndex >= 0 ? this.playlistManager.currentIndex : 0;
      this.playlistManager.play(index, true);
    }
  }

  pause() {
    if (this.renderer) {
      this.renderer.pause();
    }
  }

  stop() {
    this.pause();
    this.seek(0);
  }

  toggle() {
    if (this.state.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * Seek to a non-negative finite second offset. Non-finite or non-numeric
   * inputs are silently dropped instead of being forwarded to the renderer
   * where they would set `currentTime = NaN` on an HTMLMediaElement.
   */
  seek(time: number): void {
    if (typeof time !== 'number' || !Number.isFinite(time)) return;
    const safeTime = time < 0 ? 0 : time;
    // Any user-initiated seek (seekbar drag/click, keyboard arrow,
    // skip buttons) flows through this method, so it's the right place
    // to drop the poster overlay: scrubbing communicates "I want to see
    // a different frame", and keeping the artwork on top would hide
    // exactly the frame the user is asking for. dash.js internal
    // startup gap-jump bypasses this method and sets
    // media.currentTime directly, so the poster stays put for that
    // case (which is what we want — the user hasn't engaged yet).
    this.hidePosterOverlay();
    if (this.renderer) {
      this.renderer.seek(safeTime);
    }
  }

  seekForward(interval: number = (this.options.seekInterval as number)): void {
    const step = Number.isFinite(interval) ? interval : 5;
    const targetTime = this.state.currentTime + step;
    // Only cap to duration if duration is known (> 0), otherwise let the media element handle it
    const seekTime = this.state.duration > 0 ? Math.min(targetTime, this.state.duration) : targetTime;
    this.seek(seekTime);
  }

  seekBackward(interval: number = (this.options.seekInterval as number)): void {
    const step = Number.isFinite(interval) ? interval : 5;
    this.seek(Math.max(this.state.currentTime - step, 0));
  }

  // Volume controls
  /**
   * Set the volume to a finite number in [0, 1]. Non-numeric or NaN
   * input is silently ignored.
   */
  setVolume(volume: number): void {
    if (typeof volume !== 'number' || !Number.isFinite(volume)) return;
    const newVolume = Math.max(0, Math.min(1, volume));
    if (this.renderer) {
      this.renderer.setVolume(newVolume);
    }
    this.state.volume = newVolume;

    // If volume is increased above 0 and currently muted, unmute
    if (newVolume > 0 && this.state.muted) {
      this.state.muted = false;
      if (this.renderer) {
        this.renderer.setMuted(false);
      }
      this.emit('volumechange');
    }

    this.savePlayerPreferences();
  }

  getVolume() {
    return this.state.volume;
  }

  mute() {
    if (this.renderer) {
      this.renderer.setMuted(true);
    }
    this.state.muted = true;
    this.savePlayerPreferences();
    this.emit('volumechange');
  }

  unmute() {
    if (this.renderer) {
      this.renderer.setMuted(false);
    }
    this.state.muted = false;
    this.savePlayerPreferences();
    this.emit('volumechange');
  }

  toggleMute() {
    if (this.state.muted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  // Playback speed
  /**
   * Set playback speed in [0.25, 2]. Silently rejects non-finite input.
   */
  setPlaybackSpeed(speed: number): void {
    if (typeof speed !== 'number' || !Number.isFinite(speed)) return;
    const newSpeed = Math.max(0.25, Math.min(2, speed));
    if (this.renderer) {
      this.renderer.setPlaybackSpeed(newSpeed);
    }
    this.state.playbackSpeed = newSpeed;
    this.savePlayerPreferences();
    this.emit('playbackspeedchange', newSpeed);
  }

  getPlaybackSpeed() {
    return this.state.playbackSpeed;
  }

  // Save player preferences to localStorage
  savePlayerPreferences() {
    this.storage.savePlayerPreferences({
      volume: this.state.volume,
      muted: this.state.muted,
      playbackSpeed: this.state.playbackSpeed
    });
  }

  // Fullscreen
  enterFullscreen() {
    const elem = this.container as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      mozRequestFullScreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    let fullscreenPromise: Promise<void> | void | null = null;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      this._enablePseudoFullscreen();
      return;
    }

    if (elem.requestFullscreen) {
      fullscreenPromise = elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      fullscreenPromise = elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      fullscreenPromise = elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      fullscreenPromise = elem.msRequestFullscreen();
    }

    if (fullscreenPromise && typeof (fullscreenPromise as Promise<void>).catch === 'function') {
      (fullscreenPromise as Promise<void>).catch((err: Error) => {
        this.log('Fullscreen API failed, using pseudo-fullscreen:', err.message);
        this._enablePseudoFullscreen();
      });
    }

    if (!elem.requestFullscreen && !elem.webkitRequestFullscreen &&
      !elem.mozRequestFullScreen && !elem.msRequestFullscreen) {
      this._enablePseudoFullscreen();
    } else {
      // Optimistically set state (will be corrected by fullscreenChangeHandler if it fails)
      this.state.fullscreen = true;
      this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
      this.emit('fullscreenchange', true);
    }
  }

  exitFullscreen() {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      msFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void> | void;
      mozCancelFullScreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
    };
    const isInNativeFullscreen = Boolean(
      document.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (isInNativeFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    } else {
      // We're in pseudo-fullscreen, exit it manually
      this._disablePseudoFullscreen();
    }

    this.state.fullscreen = false;
    this.container.classList.remove(`${this.options.classPrefix}-fullscreen`);
    this.emit('fullscreenchange', false);
  }

  toggleFullscreen() {
    if (this.state.fullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  // Pseudo-fullscreen fallback for iOS and browsers without Fullscreen API.
  // All of the real DOM + scroll + inert bookkeeping lives in
  // `PseudoFullscreenController`; Player keeps these thin delegates so
  // call sites elsewhere in the class stay readable.
  _enablePseudoFullscreen() {
    if (!this.pseudoFullscreen) {
      this.pseudoFullscreen = new PseudoFullscreenController(this);
    }
    this.pseudoFullscreen.enable();
  }

  _disablePseudoFullscreen() {
    this.pseudoFullscreen?.disable();
  }

  // Picture-in-Picture
  enterPiP() {
    // When the custom floating player is enabled, the control bar PiP
    // button is rebound to floatingPlayerManager.togglePinned(). This
    // direct API is redirected too so external callers don't accidentally
    // trigger native PiP after we disabled it.
    if (this.options.floating) {
      if (this.floatingPlayerManager) {
        this.floatingPlayerManager.togglePinned();
      }
      return;
    }
    const pipElement = this.element as HTMLVideoElement & {
      requestPictureInPicture?: () => Promise<PictureInPictureWindow>
    };
    if (typeof pipElement.requestPictureInPicture === 'function') {
      pipElement.requestPictureInPicture();
      this.state.pip = true;
      this.emit('pipchange', true);
    }
  }

  exitPiP() {
    if (this.options.floating) {
      if (this.floatingPlayerManager && this.state.floating) {
        this.floatingPlayerManager.exit('manual');
      }
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture();
      this.state.pip = false;
      this.emit('pipchange', false);
    }
  }

  togglePiP() {
    if (this.options.floating) {
      if (this.floatingPlayerManager) {
        this.floatingPlayerManager.togglePinned();
      }
      return;
    }
    if (this.state.pip) {
      this.exitPiP();
    } else {
      this.enterPiP();
    }
  }

  // Captions
  enableCaptions() {
    if (this.captionManager) {
      this.captionManager.enable();
      this.state.captionsEnabled = true;
    }
  }

  disableCaptions() {
    if (this.captionManager) {
      this.captionManager.disable();
      this.state.captionsEnabled = false;
    }
  }

  toggleCaptions() {
    if (this.state.captionsEnabled) {
      this.disableCaptions();
    } else {
      this.enableCaptions();
    }
  }

  /**
   * Check if a track file exists. Bounded by a 8s `AbortSignal.timeout`
   * and the player's lifecycle controller, so a slow / hung server cannot
   * keep a request alive past `destroy()`.
   */
  async validateTrackExists(url: string): Promise<boolean> {
    if (typeof url !== 'string' || !url) return false;
    const signals: AbortSignal[] = [this.lifecycleSignal];
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      signals.push(AbortSignal.timeout(8000));
    }
    const signal = signals.length === 1 ? signals[0] : (AbortSignal as {
      any?: (signals: AbortSignal[]) => AbortSignal
    }).any?.(signals) ?? signals[0];
    try {
      const response = await fetch(url, {method: 'HEAD', cache: 'no-cache', signal});
      return response.ok;
    } catch (error: unknown) {
      if (this.options.debug) {
        this.log(`validateTrackExists("${url}") failed: ${(error as Error)?.message ?? error}`, 'warn');
      }
      return false;
    }
  }

  /**
   * Strip VTT formatting tags from caption text
   * @param {string} text - Caption text with VTT formatting
   * @returns {string} Plain text without formatting
   */
  stripVTTFormatting(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\n/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Find matching caption time based on text content
   * Useful for syncing between videos of different lengths (e.g., with/without audio description)
   * @param {string} targetText - Caption text to search for
   * @param {Array} tracks - Array of caption tracks to search in
   * @returns {number|null} Start time of matching caption, or null if not found
   */
  findMatchingCaptionTime(targetText: string | null | undefined, tracks: Array<{
    kind?: string;
    track?: TextTrack | null
  }> | null | undefined) {
    if (!targetText || !tracks || tracks.length === 0) {
      return null;
    }

    const normalizedTarget = this.stripVTTFormatting(targetText);

    for (const trackInfo of tracks) {
      if (trackInfo.kind !== 'captions' && trackInfo.kind !== 'subtitles') {
        continue;
      }

      const track = trackInfo.track;
      if (!track || !track.cues) {
        continue;
      }

      for (let i = 0; i < track.cues.length; i++) {
        const cue = track.cues[i] as VTTCue;
        const cueText = this.stripVTTFormatting(cue.text);

        if (cueText === normalizedTarget) {
          return cue.startTime;
        }

        const targetWords = normalizedTarget.split(/\s+/).filter((w) => w.length > 2);
        const cueWords = cueText.split(/\s+/).filter((w) => w.length > 2);

        if (targetWords.length > 0 && cueWords.length > 0) {
          const matchingWords = targetWords.filter((word) => cueWords.includes(word));
          const matchRatio = matchingWords.length / targetWords.length;

          if (matchRatio >= 0.8) {
            return cue.startTime;
          }
        }
      }
    }

    return null;
  }

  // Audio Description (delegated to AudioDescriptionManager)
  async enableAudioDescription() {
    const manager = await this.ensureAudioDescriptionManager();
    return manager?.enable();
  }

  async disableAudioDescription() {
    const manager = await this.ensureAudioDescriptionManager();
    return manager?.disable();
  }

  async toggleAudioDescription() {
    if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
      this.showNotice(i18n.t('player.startPlaybackForAudioDescription'));
      return;
    }

    const manager = await this.ensureAudioDescriptionManager();
    if (!manager) return;

    // If user toggles audio description before the first track has been loaded,
    // remember desired state and start playback so the described source is loaded.
    if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
      manager.desiredState = !manager.desiredState;
      this.state.audioDescriptionEnabled = manager.desiredState;
      this.emit(manager.desiredState ? 'audiodescriptionenabled' : 'audiodescriptiondisabled');
      // Start playback (PlaylistManager.play() will honor desiredState and load described src)
      this.play();
      return;
    }

    return manager.toggle();
  }

  // Sign Language (delegated to SignLanguageManager)
  async enableSignLanguage() {
    const manager = await this.ensureSignLanguageManager();
    return manager?.enable();
  }

  async disableSignLanguage() {
    const manager = await this.ensureSignLanguageManager();
    return manager?.disable();
  }

  async toggleSignLanguage() {
    if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
      this.showNotice(i18n.t('player.startPlaybackForSignLanguage'));
      return;
    }

    const manager = await this.ensureSignLanguageManager();
    if (!manager) return;

    // If user toggles sign language before the first track has been loaded,
    // enable the overlay and start playback so sign language video sync begins.
    if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
      const wasEnabled = manager.enabled;
      const result = manager.toggle();
      if (!wasEnabled && manager.enabled) {
        this.play();
      }
      return result;
    }

    return manager.toggle();
  }

  setupSignLanguageInteraction() {
    return this.signLanguageManager?._setupInteraction();
  }

  switchSignLanguage(langCode: string) {
    return this.signLanguageManager?.switchLanguage(langCode);
  }

  showSignLanguageSettingsMenu() {
    return this.signLanguageManager?.showSettingsMenu();
  }

  hideSignLanguageSettingsMenu({focusButton = true} = {}) {
    return this.signLanguageManager?.hideSettingsMenu({focusButton});
  }

  constrainSignLanguagePosition() {
    return this.signLanguageManager?.constrainPosition();
  }

  saveSignLanguagePreferences() {
    return this.signLanguageManager?.savePreferences();
  }

  cleanupSignLanguage() {
    return this.signLanguageManager?.cleanup();
  }

  // Settings dialog removed - using individual control buttons instead
  showSettings() {
    console.warn('[VidPly] Settings dialog has been removed. Use individual control buttons (speed, captions, etc.)');
  }

  hideSettings() {
    // No-op - settings dialog removed
  }

  /**
   * Lazily build (on first use) and toggle the keyboard-shortcuts help
   * dialog. Reflects the live `keyboardShortcuts` bindings, including any
   * consumer overrides.
   */
  toggleKeyboardHelp() {
    if (!this.keyboardHelp) {
      this.keyboardHelp = new KeyboardHelp(this);
    }
    this.keyboardHelp.toggle();
  }

  showKeyboardHelp() {
    if (!this.keyboardHelp) {
      this.keyboardHelp = new KeyboardHelp(this);
    }
    this.keyboardHelp.show();
  }

  hideKeyboardHelp() {
    this.keyboardHelp?.hide();
  }

  // Utility methods
  getCurrentTime() {
    return this.state.currentTime;
  }

  getDuration() {
    return this.state.duration;
  }

  isPlaying() {
    return this.state.playing;
  }

  isPaused() {
    return this.state.paused;
  }

  isEnded() {
    return this.state.ended;
  }

  isMuted() {
    return this.state.muted;
  }

  isFullscreen() {
    return this.state.fullscreen;
  }

  handleError(error: unknown) {
    if (this._switchingRenderer || this._isFallingBack) {
      this.log('Suppressing error during renderer switch:', error, 'debug');
      return;
    }

    if (this._fallbackSources && this._fallbackSources.length > 0) {
      this.log('Renderer error, attempting fallback:', error, 'warn');
      this._fallbackToNextSource().then((success: boolean) => {
        if (!success) {
          this.log('All fallback sources exhausted', 'error');
          this.emit('error', error);
          if (this.options.onError) {
            this.options.onError.call(this, error);
          }
        }
      });
      return;
    }

    this.log('Error:', error, 'error');
    this.emit('error', error);

    if (this.options.onError) {
      this.options.onError.call(this, error);
    }
  }

  // Logging
  log(...messages: unknown[]) {
    if (!this.options.debug) {
      return;
    }

    let type: 'log' | 'warn' | 'error' | 'debug' | 'info' = 'log';
    const consoleObj = console as unknown as Record<string, (...a: unknown[]) => void>;
    if (messages.length > 0) {
      const potentialType = messages[messages.length - 1];
      if (typeof potentialType === 'string' && typeof consoleObj[potentialType] === 'function') {
        type = potentialType as typeof type;
        messages = messages.slice(0, -1);
      }
    }

    if (messages.length === 0) {
      messages = [''];
    }

    const consoleFn = consoleObj[type];
    if (typeof consoleFn === 'function') {
      consoleFn('[VidPly]', ...messages);
    } else {
      console.log('[VidPly]', ...messages);
    }
  }

  /**
   * Wire up resize / orientation / fullscreen listeners. Delegates to
   * `ResponsiveManager`; Player keeps the method name for backward
   * compatibility with external callers that start the feature
   * manually after swapping the container.
   */
  setupResponsiveHandlers(): void {
    this.responsiveManager.setup();
  }

  // Cleanup. Aborts the lifecycle controller (which removes every
  // window/document listener wired with `{ signal }` plus every
  // user-influenced fetch we threaded the signal into), cascade-destroys
  // every manager we own, and finally removes this instance from the
  // global `Player.instances` registry.
  destroy(): void {
    this.log('Destroying player');

    // Abort all listeners + in-flight fetches first so callbacks
    // running concurrently with destroy() see a torn-down player.
    try {
      this._lifecycleController.abort();
    } catch (err) {
      this.log(`AbortController.abort failed: ${err}`, 'warn');
    }

    if (this.renderer) {
      this.renderer.destroy();
    }

    if (this.controlBar) {
      this.controlBar.destroy();
    }

    if (this.captionManager) {
      this.captionManager.destroy();
    }

    if (this.keyboardManager) {
      this.keyboardManager.destroy();
    }

    if (this.transcriptManager) {
      this.transcriptManager.destroy();
    }

    // Clean up sign-language video and listeners
    this.cleanupSignLanguage();

    // Cascade-destroy lazy-loaded managers that own their own listeners.
    if (this.audioDescriptionManager && typeof this.audioDescriptionManager.destroy === 'function') {
      try {
        this.audioDescriptionManager.destroy();
      } catch (err) {
        this.log(`AudioDescriptionManager.destroy failed: ${err}`, 'warn');
      }
      this.audioDescriptionManager = null;
    }

    if (this.signLanguageManager && typeof this.signLanguageManager.destroy === 'function') {
      try {
        this.signLanguageManager.destroy();
      } catch (err) {
        this.log(`SignLanguageManager.destroy failed: ${err}`, 'warn');
      }
      this.signLanguageManager = null;
    }

    if (this.playlistManager && typeof this.playlistManager.destroy === 'function') {
      try {
        this.playlistManager.destroy();
      } catch (err) {
        this.log(`PlaylistManager.destroy failed: ${err}`, 'warn');
      }
      this.playlistManager = null;
    }

    if (this.trackInfoView) {
      this.trackInfoView.destroy();
      this.trackInfoView = null;
    }

    if (this.keyboardHelp && typeof this.keyboardHelp.destroy === 'function') {
      try {
        this.keyboardHelp.destroy();
      } catch (err) {
        this.log(`KeyboardHelp.destroy failed: ${err}`, 'warn');
      }
      this.keyboardHelp = null;
    }

    if (this.mediaSessionManager && typeof this.mediaSessionManager.destroy === 'function') {
      try {
        this.mediaSessionManager.destroy();
      } catch (err) {
        this.log(`MediaSessionManager.destroy failed: ${err}`, 'warn');
      }
      this.mediaSessionManager = null;
    }

    // Clean up floating player manager (disconnects IntersectionObserver,
    // returns the container to its original parent if still floating)
    if (this.floatingPlayerManager) {
      try {
        this.floatingPlayerManager.destroy();
      } catch (err) {
        this.log(`FloatingPlayerManager.destroy failed: ${err}`, 'warn');
      }
      this.floatingPlayerManager = null;
    }

    // Cleanup play overlay button
    if (this.playButtonOverlayButton && this.playButtonOverlayButton.parentNode) {
      this.playButtonOverlayButton.remove();
    }
    this.playButtonOverlayButton = null;
    if (this.playButtonOverlay && this.playButtonOverlay.parentNode) {
      this.playButtonOverlay.remove();
    }
    this.playButtonOverlay = null;

    // The buffering listener is attached to `this.element` directly and
    // therefore not covered by the lifecycle controller (which only
    // covers window/document/element listeners that opted in via
    // `{ signal }`); it is removed explicitly here.
    if (this._bufferingHideOnMediaPlaying) {
      this.element.removeEventListener('playing', this._bufferingHideOnMediaPlaying);
      this._bufferingHideOnMediaPlaying = null;
    }

    if (this.loadingOverlayElement && this.loadingOverlayElement.parentNode) {
      this.loadingOverlayElement.remove();
      this.loadingOverlayElement = null;
    }

    // Responsive tracking owns the resize-observer + orientation
    // matchMedia + fullscreenchange listeners. The window/document
    // handlers attached with `{signal}` have already been torn down
    // by `this._lifecycleController.abort()` above; `cleanup()`
    // handles the two exceptions (ResizeObserver + legacy Safari
    // matchMedia listener).
    this.responsiveManager?.cleanup();

    // If the player is torn down while in the pseudo-fullscreen fallback
    // (iOS Safari path), disable() restores the body/html scroll lock,
    // background styles, viewport meta and inert siblings. Guarded on the
    // fullscreen state so we don't emit a spurious `exitfullscreen`.
    if (this.pseudoFullscreen && this.state.fullscreen) {
      try {
        this.pseudoFullscreen.disable();
      } catch (err) {
        this.log(`PseudoFullscreenController.disable failed: ${err}`, 'warn');
      }
    }
    this.pseudoFullscreen = null;

    // Clean up all managed timeouts
    this.timeouts.forEach((timeoutId: ReturnType<typeof setTimeout>) => clearTimeout(timeoutId));
    this.timeouts.clear();

    // Cleanup metadata handling. The manager owns the alert button
    // click listeners; the `cuechange` listener is also tracked on
    // `player.metadataCueChangeHandler` for the TextTrack teardown
    // path below.
    if (this.metadataCueChangeHandler) {
      const textTracks = this.textTracks;
      const metadataTrack = textTracks.find((track: TextTrack) => track.kind === 'metadata');
      if (metadataTrack) {
        metadataTrack.removeEventListener('cuechange', this.metadataCueChangeHandler);
      }
      this.metadataCueChangeHandler = null;
    }
    this.metadataAlertsManager?.cleanup();

    // Drop ourselves from the global registry so multi-player pages can
    // detect leaks via Player.instances.length === expected.
    const idx = Player.instances.indexOf(this);
    if (idx >= 0) {
      Player.instances.splice(idx, 1);
    }

    // Remove container
    if (this.container && this.container.parentNode) {
      this.container.parentNode.insertBefore(this.element, this.container);
      this.container.parentNode.removeChild(this.container);
    }

    this.removeAllListeners();
  }

  /**
   * Set up metadata track handling. Delegates to
   * `MetadataAlertsManager` — Player lazily constructs it so pages
   * without metadata tracks pay no cost.
   */
  setupMetadataHandling(): void {
    if (!this.metadataAlertsManager) {
      this.metadataAlertsManager = new MetadataAlertsManager(this);
    }
    this.metadataAlertsManager.setupHandling();
  }

  // Thin delegates for the metadata-alert system. Implementations
  // live in `core/MetadataAlertsManager.ts`; Player keeps the names
  // so call sites inside `handleMetadataCue` and external callers
  // (e.g. TranscriptManager integration tests) keep working.
  normalizeMetadataSelector(selector: unknown): string | null {
    return (this.metadataAlertsManager ?? this._ensureMetadataManager()).normalizeSelector(selector);
  }

  resolveMetadataConfig(
    map: Record<string, unknown> | null | undefined,
    key: string | null | undefined
  ): MetadataAlertConfig | null {
    return (this.metadataAlertsManager ?? this._ensureMetadataManager()).resolveConfig(map, key);
  }

  cacheMetadataAlertContent(element: HTMLElement | null | undefined, config: MetadataAlertConfig = {}): void {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).cacheContent(element, config);
  }

  restoreMetadataAlertContent(element: HTMLElement | null | undefined, config: MetadataAlertConfig = {}): void {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).restoreContent(element, config);
  }

  focusMetadataTarget(target: string | null | undefined, fallbackElement: HTMLElement | null = null): void {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).focusTarget(target, fallbackElement);
  }

  /** Internal helper: lazily creates the manager for external
   *  entry points that didn't come via `setupMetadataHandling`. */
  private _ensureMetadataManager(): MetadataAlertsManager {
    if (!this.metadataAlertsManager) {
      this.metadataAlertsManager = new MetadataAlertsManager(this);
    }
    return this.metadataAlertsManager;
  }

  handleMetadataAlert(selector: string, options: MetadataAlertOptions = {}): HTMLElement | undefined {
    return (this.metadataAlertsManager ?? this._ensureMetadataManager()).handleAlert(selector, options);
  }

  handleMetadataHashtags(hashtags: string[] | null | undefined): void {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).handleHashtags(hashtags);
  }

  handleMetadataCue(cue: VTTCue | TextTrackCue): void {
    (this.metadataAlertsManager ?? this._ensureMetadataManager()).handleCue(cue);
  }

}

