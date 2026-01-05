/**
 * VidPly - Universal Video Player
 * Main Player Class
 */

import {EventEmitter} from '../utils/EventEmitter.js';
import {DOMUtils} from '../utils/DOMUtils.js';
import {ControlBar} from '../controls/ControlBar.js';
import {CaptionManager} from '../controls/CaptionManager.js';
import {KeyboardManager} from '../controls/KeyboardManager.js';
import {HTML5Renderer} from '../renderers/HTML5Renderer.js';
import {createPlayOverlay, createIconElement} from '../icons/Icons.js';
import {i18n} from '../i18n/i18n.js';
import {StorageManager} from '../utils/StorageManager.js';
import {DraggableResizable} from '../utils/DraggableResizable.js';
import {createMenuItem, attachMenuKeyboardNavigation, focusFirstMenuItem} from '../utils/MenuUtils.js';
import {createLabeledSelect, preventDragOnElement} from '../utils/FormUtils.js';
import {debounce, isMobile, rafWithTimeout} from '../utils/PerformanceUtils.js';
import {AudioDescriptionManager} from './AudioDescriptionManager.js';
import {SignLanguageManager} from './SignLanguageManager.js';
import {captureVideoFrame} from '../utils/VideoFrameCapture.js';

// Static counter for unique player instances
let playerInstanceCounter = 0;

export class Player extends EventEmitter {
    constructor(element, options = {}) {
        super();

        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.element) {
            throw new Error('VidPly: Element not found');
        }

        // Assign unique instance ID
        playerInstanceCounter++;
        this.instanceId = playerInstanceCounter;

        // Auto-create media element if a non-media element is provided
        if (this.element.tagName !== 'VIDEO' && this.element.tagName !== 'AUDIO') {
            const mediaType = options.mediaType || 'video';
            const mediaElement = document.createElement(mediaType);

            // Copy attributes from the div to the media element
            Array.from(this.element.attributes).forEach(attr => {
                if (attr.name !== 'id' && attr.name !== 'class' && !attr.name.startsWith('data-')) {
                    mediaElement.setAttribute(attr.name, attr.value);
                }
            });

            // Copy any track elements from the div
            const tracks = this.element.querySelectorAll('track');
            tracks.forEach(track => {
                mediaElement.appendChild(track.cloneNode(true));
            });

            // Clear the div and insert the media element
            this.element.innerHTML = '';
            this.element.appendChild(mediaElement);

            // Update element reference to the actual media element
            this.element = mediaElement;
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
            captionsButton: true,
            transcriptButton: true,
            fullscreenButton: true,
            pipButton: false,

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

            // Sign Language
            signLanguage: true,
            signLanguageSrc: null, // URL to sign language video
            signLanguageButton: true,
            signLanguagePosition: 'bottom-right', // Position: 'bottom-right', 'bottom-left', 'top-right', 'top-left'

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
                'transcript-toggle': ['t']
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
        
        // Load saved player preferences
        const savedPrefs = this.storage.getPlayerPreferences();
        if (savedPrefs) {
            if (savedPrefs.volume !== undefined) this.options.volume = savedPrefs.volume;
            if (savedPrefs.playbackSpeed !== undefined) this.options.playbackSpeed = savedPrefs.playbackSpeed;
            if (savedPrefs.muted !== undefined) this.options.muted = savedPrefs.muted;
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
            captionsEnabled: this.options.captionsDefault,
            currentCaption: null,
            controlsVisible: true,
            audioDescriptionEnabled: false,
            signLanguageEnabled: false
        };

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
        this.container = null;
        this.renderer = null;
        this.controlBar = null;
        this.captionManager = null;
        this.keyboardManager = null;
        this.settingsDialog = null;
        
        // Metadata handling
        this.metadataCueChangeHandler = null;
        this.metadataAlertHandlers = new Map();

        // Feature managers (modular refactoring)
        this.audioDescriptionManager = new AudioDescriptionManager(this);
        this.signLanguageManager = new SignLanguageManager(this);

        // Backward-compatible property aliases for SignLanguageManager
        // These allow existing code to reference this.signLanguageWrapper, etc.
        Object.defineProperties(this, {
            signLanguageWrapper: {
                get: () => this.signLanguageManager.wrapper,
                set: (v) => { this.signLanguageManager.wrapper = v; }
            },
            signLanguageVideo: {
                get: () => this.signLanguageManager.video,
                set: (v) => { this.signLanguageManager.video = v; }
            },
            signLanguageHeader: {
                get: () => this.signLanguageManager.header,
                set: (v) => { this.signLanguageManager.header = v; }
            },
            signLanguageSettingsButton: {
                get: () => this.signLanguageManager.settingsButton,
                set: (v) => { this.signLanguageManager.settingsButton = v; }
            },
            signLanguageSettingsMenu: {
                get: () => this.signLanguageManager.settingsMenu,
                set: (v) => { this.signLanguageManager.settingsMenu = v; }
            },
            signLanguageSettingsMenuVisible: {
                get: () => this.signLanguageManager.settingsMenuVisible,
                set: (v) => { this.signLanguageManager.settingsMenuVisible = v; }
            },
            signLanguageDraggable: {
                get: () => this.signLanguageManager.draggable,
                set: (v) => { this.signLanguageManager.draggable = v; }
            },
            currentSignLanguage: {
                get: () => this.signLanguageManager.currentLanguage,
                set: (v) => { this.signLanguageManager.currentLanguage = v; }
            }
        });

        // Initialize
        this.init();
    }

    /**
     * Show a small in-player notice (non-blocking), also announced to screen readers.
     */
    showNotice(message, { timeout = 2500, priority = 'polite' } = {}) {
        try {
            if (!message) return;
            if (!this.container) return;

            // Screen reader announcement (reuse KeyboardManager announcer if available)
            if (this.keyboardManager?.announce) {
                this.keyboardManager.announce(message, priority);
            }

            if (!this.noticeElement) {
                const el = document.createElement('div');
                el.className = `${this.options.classPrefix}-notice`;
                el.setAttribute('role', 'status');
                el.setAttribute('aria-live', priority);
                el.setAttribute('aria-atomic', 'true');
                // Inline styling to avoid requiring CSS rebuilds
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

            this.noticeElement.textContent = message;
            this.noticeElement.style.display = 'block';

            if (this.noticeTimeout) {
                clearTimeout(this.noticeTimeout);
                this.noticeTimeout = null;
            }
            this.noticeTimeout = setTimeout(() => {
                if (this.noticeElement) {
                    this.noticeElement.style.display = 'none';
                }
            }, timeout);
        } catch (e) {
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
                } catch (error) {
                    console.warn('Failed to load some language files:', error);
                }
            }

            // Load single language file if specified (for backwards compatibility)
            if (this.options.languageFile && this.options.languageFileUrl) {
                try {
                    await i18n.loadLanguageFromUrl(this.options.languageFile, this.options.languageFileUrl);
                    this.log(`Custom language file loaded for ${this.options.languageFile}`);
                } catch (error) {
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

            // Detect and initialize renderer (only if source exists)
            const src = this.element.src || this.element.querySelector('source')?.src;
            if (src) {
                await this.initializeRenderer();
            } else {
                this.log('No initial source - waiting for playlist or manual load');
            }

            // Create controls
            if (this.options.controls) {
                this.controlBar = new ControlBar(this);
                this.videoWrapper.appendChild(this.controlBar.element);
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

            // Setup responsive handlers
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

            // Mark as ready
            this.state.ready = true;
            this.emit('ready');

            if (this.options.onReady) {
                this.options.onReady.call(this);
            }

            // Autoplay if enabled
            if (this.options.autoplay) {
                this.play();
            }

            this.log('Player initialized successfully');
        } catch (error) {
            this.handleError(error);
        }
    }

    /**
     * Ensure the transcript manager is available, creating it on demand.
     * This keeps initial load fast when transcripts are not needed.
     */
    async ensureTranscriptManager() {
        if (this.transcriptManager) {
            return this.transcriptManager;
        }

        if (!this.options.transcript && !this.options.transcriptButton) {
            return null;
        }

        const module = await import('../controls/TranscriptManager.js');
        const Manager = module.TranscriptManager || module.default;

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

        // Check if this language is available in our translations (already loaded)
        if (i18n.translations[normalizedLang]) {
            return normalizedLang;
        }

        // Check if this language is available as a built-in that can be loaded on demand
        if (i18n.builtInLanguageLoaders && i18n.builtInLanguageLoaders[normalizedLang]) {
            return normalizedLang;
        }

        // Language not available, will fallback to English
        this.log(`Language "${htmlLang}" not available, using English as fallback`);
        return null; // Return null instead of 'en' to let the default language handling work
    }

    createContainer() {
        // Create main container with unique label for multiple players on same page
        const playerLabel = this.instanceId > 1 
            ? `${i18n.t('player.label')} ${this.instanceId}`
            : i18n.t('player.label');
        
        this.container = DOMUtils.createElement('div', {
            className: `${this.options.classPrefix}-player`,
            attributes: {
                'role': 'application',
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
        this.element.parentNode.insertBefore(this.container, this.element);
        
        // Create track artwork element for single audio files (before video wrapper)
        // This shows the poster/artwork above the audio player (similar to playlists)
        if (this.element.tagName === 'AUDIO' && this.options.poster) {
            this.trackArtworkElement = DOMUtils.createElement('div', {
                className: `${this.options.classPrefix}-track-artwork`,
                attributes: {
                    'aria-hidden': 'true'
                }
            });
            this.trackArtworkElement.style.backgroundImage = `url(${this.options.poster})`;
            this.container.appendChild(this.trackArtworkElement);
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
            this.element.playsInline = true; // Property version
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

        // Set poster (convert relative paths to absolute URLs)
        if (this.options.poster && this.element.tagName === 'VIDEO') {
            const resolvedPoster = this.resolvePosterPath(this.options.poster);
            this.element.poster = resolvedPoster;
        }

        // Create centered play button overlay (only for video)
        if (this.element.tagName === 'VIDEO') {
            this.createPlayButtonOverlay();
        }
        
        // Store reference to player on element for easy access
        this.element.vidply = this;
        
        // Add to static instances array
        Player.instances.push(this);

        // Make video/audio element clickable to toggle play/pause
        this.element.style.cursor = 'pointer';
        this.element.addEventListener('click', (e) => {
            // Prevent if clicking on native controls (shouldn't happen but just in case)
            if (e.target === this.element) {
                this.toggle();
            }
        });

        this.on('play', () => {
            this.state.hasStartedPlayback = true;
            // Hide poster immediately when playing
            this.hidePosterOverlay();
        });

        this.on('timeupdate', () => {
            // Hide poster when video has started playing (currentTime > 0)
            if (this.state.currentTime > 0) {
                this.hidePosterOverlay();
            }
        });

        // Also hide poster on loadeddata event (when first frame is loaded)
        this.element.addEventListener('loadeddata', () => {
            if (this.state.playing || this.state.currentTime > 0) {
                this.hidePosterOverlay();
            }
        }, { once: true });
    }

    createPlayButtonOverlay() {
        // Create complete SVG play button from Icons.js
        this.playButtonOverlay = createPlayOverlay();

        // Add click handler
        this.playButtonOverlay.addEventListener('click', () => {
            this.toggle();
        });

        // Add to video wrapper
        this.videoWrapper.appendChild(this.playButtonOverlay);

        // Show/hide based on play state
        this.on('play', () => {
            this.playButtonOverlay.style.opacity = '0';
            this.playButtonOverlay.style.pointerEvents = 'none';
        });

        this.on('pause', () => {
            this.playButtonOverlay.style.opacity = '1';
            this.playButtonOverlay.style.pointerEvents = 'auto';
            this.positionPlayOverlayOnMobile();
        });

        this.on('ended', () => {
            this.playButtonOverlay.style.opacity = '1';
            this.playButtonOverlay.style.pointerEvents = 'auto';
            this.positionPlayOverlayOnMobile();
        });
        
        // Debounced resize handler
        this.debouncedPositionPlayOverlay = debounce(() => {
            this.positionPlayOverlayOnMobile();
        }, 150);
        
        window.addEventListener('resize', this.debouncedPositionPlayOverlay);
        
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
    
    positionPlayOverlayOnMobile() {
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
        const wrapperRect = this.videoWrapper.getBoundingClientRect();
        const videoCenter = (videoRect.top - wrapperRect.top) + (videoRect.height / 2);
        
        this.playButtonOverlay.style.top = `${videoCenter}px`;
    }

    async initializeRenderer() {
        // Use pending source for external renderers, or get from element for HTML5
        let src = this._pendingSource || this.element.src || this.element.querySelector('source')?.src;

        if (!src) {
            throw new Error('No media source found');
        }
        
        // Store the current source for renderers to access
        this.currentSource = src;
        
        // Clear pending source after using it
        this._pendingSource = null;

        // Initialize audio description sources from elements
        this.audioDescriptionManager.initFromSourceElements(this.sourceElements, this.trackElements);
        
        // Store original source for audio description toggling (fallback if not set by manager)
        if (!this.originalSrc) {
            this.originalSrc = src;
        }

        // Detect media type and lazily load heavy renderers
        let rendererClass = HTML5Renderer;

        if (src.includes('youtube.com') || src.includes('youtu.be')) {
            const module = await import('../renderers/YouTubeRenderer.js');
            rendererClass = module.YouTubeRenderer || module.default;
        } else if (src.includes('vimeo.com')) {
            const module = await import('../renderers/VimeoRenderer.js');
            rendererClass = module.VimeoRenderer || module.default;
        } else if (src.includes('.m3u8')) {
            const module = await import('../renderers/HLSRenderer.js');
            rendererClass = module.HLSRenderer || module.default;
        } else if (src.includes('soundcloud.com') || src.includes('api.soundcloud.com')) {
            const module = await import('../renderers/SoundCloudRenderer.js');
            rendererClass = module.SoundCloudRenderer || module.default;
        }

        this.log(`Using ${rendererClass?.name || 'HTML5Renderer'} renderer`);
        this.renderer = new rendererClass(this);
        await this.renderer.init();
        
        // Invalidate cache after renderer initialization (tracks may have changed)
        this.invalidateTrackCache();
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
    findTextTrack(kind, language = null) {
        const tracks = this.textTracks;
        if (language) {
            return tracks.find(t => t.kind === kind && t.language === language);
        }
        return tracks.find(t => t.kind === kind);
    }

    /**
     * Find a source element by attribute
     * @param {string} attribute - Attribute name (e.g., 'data-desc-src')
     * @param {string} [value] - Optional attribute value
     * @returns {Element|null} Found source element or null
     */
    findSourceElement(attribute, value = null) {
        const sources = this.sourceElements;
        if (value) {
            return sources.find(el => el.getAttribute(attribute) === value);
        }
        return sources.find(el => el.hasAttribute(attribute));
    }

    /**
     * Find a track element by its associated TextTrack
     * @param {TextTrack} track - The TextTrack object
     * @returns {Element|null} Found track element or null
     */
    findTrackElement(track) {
        return this.trackElements.find(el => el.track === track);
    }

    /**
     * Convert relative poster path to absolute URL
     * @param {string} posterPath - Poster path (relative or absolute)
     * @returns {string} Absolute URL
     */
    resolvePosterPath(posterPath) {
        if (!posterPath) {
            return posterPath;
        }
        
        // If already absolute (starts with http://, https://, or /), return as-is
        if (posterPath.match(/^(https?:|\/)/)) {
            return posterPath;
        }
        
        // Convert relative path to absolute URL
        try {
            const posterUrl = new URL(posterPath, window.location.href);
            return posterUrl.href;
        } catch (e) {
            // If URL constructor fails, return as-is
            return posterPath;
        }
    }

    /**
     * Generate a poster image from video frame at specified time
     * @param {number} time - Time in seconds (default: 10)
     * @returns {Promise<string|null>} Data URL of the poster image or null if failed
     */
    async generatePosterFromVideo(time = 10) {
        // Only for HTML5 video
        if (this.element.tagName !== 'VIDEO') {
            return null;
        }

        // Check if renderer supports this (HTML5Renderer only)
        const renderer = this.renderer;
        if (!renderer || !renderer.media || renderer.media.tagName !== 'VIDEO') {
            return null;
        }

        const video = renderer.media;
        
        // Check if video has enough duration
        if (!video.duration || video.duration < time) {
            // Use a smaller time if video is shorter
            time = Math.min(time, Math.max(1, video.duration * 0.1));
        }

        // Try to use preview video from ControlBar if available (avoids interfering with playback)
        let videoToUse = video;
        if (this.controlBar && this.controlBar.previewVideo && this.controlBar.previewSupported) {
            videoToUse = this.controlBar.previewVideo;
        }

        // Use shared frame capture utility
        // For main video, restore state; for preview video, no need
        const restoreState = videoToUse === video;
        return await captureVideoFrame(videoToUse, time, {
            restoreState,
            quality: 0.9
        });
    }

    /**
     * Auto-generate poster from video if none is provided
     */
    async autoGeneratePoster() {
        // Check if poster already exists
        const hasPoster = 
            this.element.getAttribute('poster') ||
            this.element.poster ||
            this.options.poster;

        if (hasPoster) {
            return;
        }

        // Only for HTML5 video
        if (this.element.tagName !== 'VIDEO') {
            return;
        }

        // Wait for metadata to be loaded
        if (!this.state.duration || this.state.duration === 0) {
            // Wait for loadedmetadata event
            await new Promise((resolve) => {
                const onLoadedMetadata = () => {
                    this.element.removeEventListener('loadedmetadata', onLoadedMetadata);
                    resolve();
                };
                
                if (this.element.readyState >= 1) {
                    resolve();
                } else {
                    this.element.addEventListener('loadedmetadata', onLoadedMetadata);
                }
            });
        }

        // Generate poster from second 10
        const posterDataURL = await this.generatePosterFromVideo(10);
        
        if (posterDataURL) {
            // Set as poster
            this.element.poster = posterDataURL;
            this.log('Auto-generated poster from video frame at 10 seconds', 'info');
            
            // Show the poster overlay
            this.showPosterOverlay();
        }
    }

    showPosterOverlay() {
        if (!this.videoWrapper || this.element.tagName !== 'VIDEO') {
            return;
        }

        const poster =
            this.element.getAttribute('poster') ||
            this.element.poster ||
            this.options.poster;

        if (!poster) {
            return;
        }

        // Resolve relative paths to absolute URLs (skip for data URLs)
        const resolvedPoster = poster.startsWith('data:') 
            ? poster 
            : this.resolvePosterPath(poster);
        this.videoWrapper.style.setProperty('--vidply-poster-image', `url("${resolvedPoster}")`);
        this.videoWrapper.classList.add('vidply-forced-poster');
        
        // Apply audio content class (16:3 aspect ratio) for audio in video player
        if (this._isAudioContent && this.container) {
            this.container.classList.add('vidply-audio-content');
        } else if (this.container) {
            this.container.classList.remove('vidply-audio-content');
        }
    }

    hidePosterOverlay() {
        if (!this.videoWrapper) {
            return;
        }

        this.videoWrapper.classList.remove('vidply-forced-poster');
        this.videoWrapper.style.removeProperty('--vidply-poster-image');
        
        // Note: vidply-audio-content is not removed here because it should persist
        // for the duration of audio content playback, not just poster display
    }

    /**
     * Set a managed timeout that will be cleaned up on destroy
     * @param {Function} callback - Callback function
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timeout ID
     */
    setManagedTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
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
    clearManagedTimeout(timeoutId) {
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
     * Check if a source URL requires an external renderer (YouTube, Vimeo, SoundCloud, HLS)
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

    async load(config) {
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
            existingTracks.forEach(track => track.remove());
            this.invalidateTrackCache();

            // Check if this is an external renderer URL
            const isExternalRenderer = this.isExternalRendererUrl(config.src);
            
            // Set flag early to suppress any errors that might fire during the transition
            // This prevents HTML5 element errors from triggering playlist auto-advance
            if (isExternalRenderer) {
                this._switchingRenderer = true;
            }

            // Only set src on HTML5 element for non-external sources
            // External renderers (YouTube, Vimeo, SoundCloud, HLS) handle their own media loading
            if (!isExternalRenderer) {
                this.element.src = config.src;

                if (config.type) {
                    this.element.type = config.type;
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
            
            // Track if current content is audio (for poster aspect ratio)
            this._isAudioContent = config.type && config.type.startsWith('audio/');
            
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
                    // For audio in video player: use CSS poster overlay with 16:3 aspect ratio
                    this.element.removeAttribute('poster');
                    if (this.videoWrapper) {
                        const resolvedPoster = this.resolvePosterPath(config.poster);
                        this.videoWrapper.style.setProperty('--vidply-poster-image', `url("${resolvedPoster}")`);
                        this.videoWrapper.classList.add('vidply-forced-poster');
                    }
                } else {
                    // For video: use normal poster and remove overlay
                    this.element.poster = this.resolvePosterPath(config.poster);
                    if (this.videoWrapper) {
                        this.videoWrapper.classList.remove('vidply-forced-poster');
                        this.videoWrapper.style.removeProperty('--vidply-poster-image');
                    }
                }
            }

            // Add new text tracks
            if (config.tracks && config.tracks.length > 0) {
                config.tracks.forEach(trackConfig => {
                    const track = document.createElement('track');
                    track.src = trackConfig.src;
                    track.kind = trackConfig.kind || 'captions';
                    track.srclang = trackConfig.srclang || 'en';
                    track.label = trackConfig.label || trackConfig.srclang;

                    if (trackConfig.default) {
                        track.default = true;
                    }
                    
                    // Support described track sources for audio description track swapping
                    if (trackConfig.describedSrc) {
                        track.setAttribute('data-desc-src', trackConfig.describedSrc);
                    }

                    // Insert tracks at the beginning (before any flow content) for HTML5 validity
                    const firstChild = this.element.firstChild;
                    if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && firstChild.tagName !== 'TRACK') {
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

            // Destroy old renderer if changing types
            if (shouldChangeRenderer && this.renderer) {
                this.renderer.destroy();
                this.renderer = null;
            }

            // Initialize or reinitialize renderer
            if (!this.renderer || shouldChangeRenderer) {
                await this.initializeRenderer();
            } else {
                // Just reload the current renderer with the updated element
                this.renderer.media = this.element; // Update media reference
                if (this.options.deferLoad) {
                    try {
                        // Keep configured preload behavior; actual network load is controlled
                        // by ensureLoaded()/play() when deferLoad is enabled.
                        this.element.preload = this.options.preload || 'metadata';
                    } catch (e) {
                        // ignore
                    }
                    // Reset renderer-level deferred flags if present (HTML5/HLS renderers)
                    if (this.renderer) {
                        if (typeof this.renderer._didDeferredLoad === 'boolean') {
                            this.renderer._didDeferredLoad = false;
                        }
                        if (typeof this.renderer._hlsSourceLoaded === 'boolean') {
                            this.renderer._hlsSourceLoaded = false;
                        }
                        if ('_pendingSrc' in this.renderer) {
                            // For HLS, store pending src for the first play() call
                            this.renderer._pendingSrc = this._pendingSource || this.currentSource || null;
                        }
                    }
                } else {
                    this.element.load();
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

            // Reinitialize caption manager to pick up new tracks
            if (this.captionManager) {
                this.captionManager.destroy();
                this.captionManager = new CaptionManager(this);
            }
            
            // Reinitialize transcript manager to pick up new tracks
            if (this.transcriptManager) {
                const wasTranscriptVisible = this.transcriptManager.isVisible;
                this.transcriptManager.destroy();
                this.transcriptManager = null;

                await this.ensureTranscriptManager();
                
                // Only restore transcript visibility if new track has captions
                if (wasTranscriptVisible && this.controlBar && this.controlBar.hasCaptionTracks()) {
                    this.transcriptManager?.showTranscript();
                }
            }
            
            // Update control bar to show/hide feature buttons based on new tracks
            if (this.controlBar) {
                this.updateControlBar();
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

        } catch (error) {
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
        } catch (e) {
            // ignore
        }
    }

    /**
     * Check if we need to change renderer type
     * @param {string} src - New source URL
     * @returns {boolean}
     */
    /**
     * Update control bar to refresh button visibility based on available features
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
    
    shouldChangeRenderer(src) {
        if (!this.renderer) return true;

        const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
        const isVimeo = src.includes('vimeo.com');
        const isHLS = src.includes('.m3u8');
        const isSoundCloud = src.includes('soundcloud.com') || src.includes('api.soundcloud.com');

        const currentRendererName = this.renderer.constructor.name;

        if (isYouTube && currentRendererName !== 'YouTubeRenderer') return true;
        if (isVimeo && currentRendererName !== 'VimeoRenderer') return true;
        if (isHLS && currentRendererName !== 'HLSRenderer') return true;
        if (isSoundCloud && currentRendererName !== 'SoundCloudRenderer') return true;
        if (!isYouTube && !isVimeo && !isHLS && !isSoundCloud && currentRendererName !== 'HTML5Renderer') return true;

        return false;
    }

    // Playback controls
    play() {
        if (this.renderer) {
            this.renderer.play();
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

    seek(time) {
        if (this.renderer) {
            this.renderer.seek(time);
        }
    }

    seekForward(interval = this.options.seekInterval) {
        this.seek(Math.min(this.state.currentTime + interval, this.state.duration));
    }

    seekBackward(interval = this.options.seekInterval) {
        this.seek(Math.max(this.state.currentTime - interval, 0));
    }

    // Volume controls
    setVolume(volume) {
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
    setPlaybackSpeed(speed) {
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
        const elem = this.container;
        let fullscreenPromise = null;

        // Detect iOS/iPadOS to avoid native fullscreen conflicts
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // On iOS/iPadOS, always use pseudo-fullscreen to avoid video element native fullscreen
        if (isIOS) {
            this._enablePseudoFullscreen();
            return;
        }

        // Try to use native Fullscreen API on other platforms
        if (elem.requestFullscreen) {
            fullscreenPromise = elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            fullscreenPromise = elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            fullscreenPromise = elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            fullscreenPromise = elem.msRequestFullscreen();
        }

        // Handle promise-based API (modern browsers)
        if (fullscreenPromise && fullscreenPromise.catch) {
            fullscreenPromise.catch((err) => {
                // Fullscreen API failed, use pseudo-fullscreen fallback
                this.log('Fullscreen API failed, using pseudo-fullscreen:', err.message);
                this._enablePseudoFullscreen();
            });
        }

        // For browsers without Fullscreen API support, use pseudo-fullscreen
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
        // Check if we're in native fullscreen
        const isInNativeFullscreen = !!(
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement
        );

        if (isInNativeFullscreen) {
            // Exit native fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
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

    // Pseudo-fullscreen fallback for iOS and browsers without Fullscreen API
    _enablePseudoFullscreen() {
        this.state.fullscreen = true;
        this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
        
        // Store current scroll position for restoration later
        this._originalScrollX = window.scrollX || window.pageXOffset;
        this._originalScrollY = window.scrollY || window.pageYOffset;
        
        // Prevent body scrolling while in pseudo-fullscreen
        this._originalBodyOverflow = document.body.style.overflow;
        this._originalBodyPosition = document.body.style.position;
        this._originalBodyWidth = document.body.style.width;
        this._originalBodyHeight = document.body.style.height;
        this._originalHtmlOverflow = document.documentElement.style.overflow;
        
        document.body.style.overflow = 'hidden';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
        document.documentElement.style.overflow = 'hidden';
        
        // On iOS, also lock the viewport and scroll to top
        this._originalViewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content');
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
        
        // Scroll to top on iOS to prevent positioning issues
        window.scrollTo(0, 0);
        
        this.emit('fullscreenchange', true);
        this.emit('enterfullscreen');
    }

    _disablePseudoFullscreen() {
        // Restore body scrolling
        if (this._originalBodyOverflow !== undefined) {
            document.body.style.overflow = this._originalBodyOverflow;
            delete this._originalBodyOverflow;
        }
        if (this._originalBodyPosition !== undefined) {
            document.body.style.position = this._originalBodyPosition;
            delete this._originalBodyPosition;
        }
        if (this._originalBodyWidth !== undefined) {
            document.body.style.width = this._originalBodyWidth;
            delete this._originalBodyWidth;
        }
        if (this._originalBodyHeight !== undefined) {
            document.body.style.height = this._originalBodyHeight;
            delete this._originalBodyHeight;
        }
        if (this._originalHtmlOverflow !== undefined) {
            document.documentElement.style.overflow = this._originalHtmlOverflow;
            delete this._originalHtmlOverflow;
        }
        
        // Restore viewport settings
        if (this._originalViewport !== undefined) {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.setAttribute('content', this._originalViewport);
            }
            delete this._originalViewport;
        }
        
        // Restore scroll position
        if (this._originalScrollX !== undefined && this._originalScrollY !== undefined) {
            window.scrollTo(this._originalScrollX, this._originalScrollY);
            delete this._originalScrollX;
            delete this._originalScrollY;
        }
        
        this.emit('exitfullscreen');
    }

    // Picture-in-Picture
    enterPiP() {
        if (this.element.requestPictureInPicture) {
            this.element.requestPictureInPicture();
            this.state.pip = true;
            this.emit('pipchange', true);
        }
    }

    exitPiP() {
        if (document.pictureInPictureElement) {
            document.exitPictureInPicture();
            this.state.pip = false;
            this.emit('pipchange', false);
        }
    }

    togglePiP() {
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
     * Check if a track file exists
     * @param {string} url - Track file URL
     * @returns {Promise<boolean>} - True if file exists
     */
    async validateTrackExists(url) {
        try {
            const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    /**
     * Strip VTT formatting tags from caption text
     * @param {string} text - Caption text with VTT formatting
     * @returns {string} Plain text without formatting
     */
    stripVTTFormatting(text) {
        if (!text) return '';
        return text
            .replace(/<[^>]+>/g, '') // Remove all HTML/VTT tags
            .replace(/\n/g, ' ')      // Replace newlines with spaces
            .trim()
            .toLowerCase();           // Normalize to lowercase for comparison
    }

    /**
     * Find matching caption time based on text content
     * Useful for syncing between videos of different lengths (e.g., with/without audio description)
     * @param {string} targetText - Caption text to search for
     * @param {Array} tracks - Array of caption tracks to search in
     * @returns {number|null} Start time of matching caption, or null if not found
     */
    findMatchingCaptionTime(targetText, tracks) {
        if (!targetText || !tracks || tracks.length === 0) {
            return null;
        }

        const normalizedTarget = this.stripVTTFormatting(targetText);
        
        // Search through all caption/subtitle tracks
        for (const trackInfo of tracks) {
            if (trackInfo.kind !== 'captions' && trackInfo.kind !== 'subtitles') {
                continue;
            }

            const track = trackInfo.track;
            if (!track || !track.cues) {
                continue;
            }

            // Search through all cues in this track
            for (let i = 0; i < track.cues.length; i++) {
                const cue = track.cues[i];
                const cueText = this.stripVTTFormatting(cue.text);
                
                // Check for exact match or very similar match (at least 80% of words match)
                if (cueText === normalizedTarget) {
                    return cue.startTime;
                }
                
                // Fuzzy matching: check if most words match
                const targetWords = normalizedTarget.split(/\s+/).filter(w => w.length > 2);
                const cueWords = cueText.split(/\s+/).filter(w => w.length > 2);
                
                if (targetWords.length > 0 && cueWords.length > 0) {
                    const matchingWords = targetWords.filter(word => cueWords.includes(word));
                    const matchRatio = matchingWords.length / targetWords.length;
                    
                    // If 80% or more words match, consider it a match
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
        return this.audioDescriptionManager.enable();
    }

    // Legacy method body preserved for reference - can be removed after testing
    async _legacyEnableAudioDescription() {
        // Check if we have source elements with data-desc-src (even if audioDescriptionSrc is not set)
        const hasSourceElementsWithDesc = this.sourceElements.some(el => el.getAttribute('data-desc-src'));
        const hasTracksWithDesc = this.audioDescriptionCaptionTracks.length > 0;
        
        if (!this.audioDescriptionSrc && !hasSourceElementsWithDesc && !hasTracksWithDesc) {
            console.warn('VidPly: No audio description source, source elements, or tracks provided');
            return;
        }

        // Store current playback state
        // Use element.currentTime directly, not state, as state may not be up-to-date
        const currentTime = this.element.currentTime;
        const wasPlaying = this.state.playing;
        const shouldKeepPoster = !wasPlaying && currentTime === 0;
        
        // Try to find the current caption text for synchronization
        // This helps when switching between videos of different lengths
        let currentCaptionText = null;
        if (this.captionManager && this.captionManager.currentTrack) {
            const track = this.captionManager.currentTrack.track;
            if (track && track.activeCues && track.activeCues.length > 0) {
                const activeCue = track.activeCues[0];
                currentCaptionText = this.stripVTTFormatting(activeCue.text);
            }
        }
        
        // Store poster to preserve it during source swap
        // Convert relative paths to absolute URLs to prevent resolution issues
        const posterValue = this.resolvePosterPath(
            this.element.getAttribute('poster') || 
            this.element.poster || 
            this.options.poster
        );

        if (shouldKeepPoster) {
            this.showPosterOverlay();
        }

        // Store swapped tracks for transcript reload (declare at function scope)
        let swappedTracksForTranscript = [];

        // Switch to audio-described version
        // If we have a source element with audio description attributes, update that instead
        if (this.audioDescriptionSourceElement) {
            const currentSrc = this.element.currentSrc || this.element.src;
            
            // Find the source element that matches the currently active source
            const sourceElements = this.sourceElements;
            let sourceElementToUpdate = null;
            let descSrc = this.audioDescriptionSrc;
            
            for (const sourceEl of sourceElements) {
                const sourceSrc = sourceEl.getAttribute('src');
                const descSrcAttr = sourceEl.getAttribute('data-desc-src');
                
                // Check if this source matches the current source (by filename)
                // Match by full path or just filename
                const sourceFilename = sourceSrc ? sourceSrc.split('/').pop() : '';
                const currentFilename = currentSrc ? currentSrc.split('/').pop() : '';
                
                if (currentSrc && (currentSrc === sourceSrc || 
                    currentSrc.includes(sourceSrc) || 
                    currentSrc.includes(sourceFilename) ||
                    (sourceFilename && currentFilename === sourceFilename))) {
                    sourceElementToUpdate = sourceEl;
                    if (descSrcAttr) {
                        descSrc = descSrcAttr;
                    } else if (sourceSrc) {
                        // If no data-desc-src, try to construct it from the source
                        // But prefer the stored audioDescriptionSrc if available
                        descSrc = this.audioDescriptionSrc || descSrc;
                    }
                    break;
                }
            }
            
            // If we didn't find a match, use the stored source element
            if (!sourceElementToUpdate) {
                sourceElementToUpdate = this.audioDescriptionSourceElement;
                // Ensure we have the correct descSrc from the stored element
                const storedDescSrc = sourceElementToUpdate.getAttribute('data-desc-src');
                if (storedDescSrc) {
                    descSrc = storedDescSrc;
                }
            }
            
            // Swap caption tracks to described versions BEFORE loading
            if (this.audioDescriptionCaptionTracks.length > 0) {
                // Swap tracks: validate explicit tracks, but try auto-detected tracks without validation
                // This avoids 404 errors while still allowing auto-detection to work
                const validationPromises = this.audioDescriptionCaptionTracks.map(async (trackInfo) => {
                    if (trackInfo.trackElement && trackInfo.describedSrc) {
                        // Only validate explicitly defined tracks (to confirm they exist)
                        // Auto-detected tracks are used without validation (browser will handle missing files gracefully)
                        if (trackInfo.explicit === true) {
                            try {
                                const exists = await this.validateTrackExists(trackInfo.describedSrc);
                                return { trackInfo, exists };
                            } catch (error) {
                                // Silently handle validation errors
                                return { trackInfo, exists: false };
                            }
                        } else {
                            // This shouldn't happen since auto-detection is disabled
                            // But if it does, don't validate to avoid 404s
                            return { trackInfo, exists: false };
                        }
                    }
                    return { trackInfo, exists: false };
                });
                
                const validationResults = await Promise.all(validationPromises);
                const tracksToSwap = validationResults.filter(result => result.exists);
                
                if (tracksToSwap.length > 0) {
                    // Store original track modes before removing tracks
                    const trackModes = new Map();
                    tracksToSwap.forEach(({ trackInfo }) => {
                        const textTrack = trackInfo.trackElement.track;
                        if (textTrack) {
                            trackModes.set(trackInfo, {
                                wasShowing: textTrack.mode === 'showing',
                                wasHidden: textTrack.mode === 'hidden'
                            });
                        } else {
                            trackModes.set(trackInfo, {
                                wasShowing: false,
                                wasHidden: false
                            });
                        }
                    });
                    
                    // Store all track information before removing
                    const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
                        const oldSrc = trackInfo.trackElement.getAttribute('src');
                        const parent = trackInfo.trackElement.parentNode;
                        const nextSibling = trackInfo.trackElement.nextSibling;
                        
                        // Store all attributes from the old track
                        const attributes = {};
                        Array.from(trackInfo.trackElement.attributes).forEach(attr => {
                            attributes[attr.name] = attr.value;
                        });
                        
                        return {
                            trackInfo,
                            oldSrc,
                            parent,
                            nextSibling,
                            attributes
                        };
                    });
                    
                    // Remove ALL old tracks first to force browser to clear TextTrack objects
                    tracksToReadd.forEach(({ trackInfo }) => {
                        trackInfo.trackElement.remove();
                    });
                    
                    // Force browser to process the removal by calling load()
                    this.element.load();
                    
                    // Wait for browser to process the removal, then add new tracks
                    // Use await to ensure this completes before continuing
                    await new Promise(resolve => {
                        setTimeout(() => {
                            tracksToReadd.forEach(({ trackInfo, oldSrc, parent, nextSibling, attributes }) => {
                                swappedTracksForTranscript.push(trackInfo);
                                
                                // Create a completely new track element (not a clone) to force browser to create new TextTrack
                                const newTrackElement = document.createElement('track');
                                newTrackElement.setAttribute('src', trackInfo.describedSrc);
                                
                                // Copy all attributes except src and data-desc-src
                                Object.keys(attributes).forEach(attrName => {
                                    if (attrName !== 'src' && attrName !== 'data-desc-src') {
                                        newTrackElement.setAttribute(attrName, attributes[attrName]);
                                    }
                                });
                                
                                // Insert new track element
                                if (nextSibling && nextSibling.parentNode) {
                                    parent.insertBefore(newTrackElement, nextSibling);
                                } else {
                                    parent.appendChild(newTrackElement);
                                }
                                
                                // Update reference to the new track element
                                trackInfo.trackElement = newTrackElement;
                            });
                            
                            this.invalidateTrackCache();
                            
                            // Wait for loadedmetadata event before accessing new TextTrack objects
                            const setupNewTracks = () => {
                                // Wait a bit more for browser to fully process the new track elements
                                this.setManagedTimeout(() => {
                                    swappedTracksForTranscript.forEach((trackInfo) => {
                                        const trackElement = trackInfo.trackElement;
                                        const newTextTrack = trackElement.track;
                                        
                                        if (newTextTrack) {
                                            // Get original mode from stored map
                                            const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                                            
                                            // Set mode to load the new track
                                            newTextTrack.mode = 'hidden'; // Use hidden to load cues without showing
                                            
                                            // Restore original mode after track loads
                                            // Note: CaptionManager will handle enabling captions separately
                                            const restoreMode = () => {
                                                if (modeInfo.wasShowing) {
                                                    // Set to hidden - CaptionManager will set it to showing when it enables
                                                    newTextTrack.mode = 'hidden';
                                                } else if (modeInfo.wasHidden) {
                                                    newTextTrack.mode = 'hidden';
                                                } else {
                                                    newTextTrack.mode = 'disabled';
                                                }
                                            };
                                            
                                            // Wait for track to load
                                            if (newTextTrack.readyState >= 2) { // LOADED
                                                restoreMode();
                                            } else {
                                                newTextTrack.addEventListener('load', restoreMode, { once: true });
                                                newTextTrack.addEventListener('error', restoreMode, { once: true });
                                            }
                                        }
                                    });
                                }, 300); // Additional wait for browser to process track elements
                            };
                            
                            // Wait for loadedmetadata event which fires when browser processes track elements
                            if (this.element.readyState >= 1) { // HAVE_METADATA
                                // Already loaded, wait a bit and setup
                                setTimeout(setupNewTracks, 200);
                            } else {
                                this.element.addEventListener('loadedmetadata', setupNewTracks, { once: true });
                                // Fallback timeout
                                setTimeout(setupNewTracks, 2000);
                            }
                            
                            resolve();
                        }, 100);
                    }); // Wait 100ms after first load() before adding new tracks
                    
                    const skippedCount = validationResults.length - tracksToSwap.length;
                }
            }
            
            // Update all source elements that have data-desc-src to their described versions
            // Force browser to pick up changes by removing and re-adding source elements
            // Get source elements (may have been defined in if block above, but get fresh list here)
            const allSourceElements = this.sourceElements;
            const sourcesToUpdate = [];
            
            allSourceElements.forEach((sourceEl) => {
                const descSrcAttr = sourceEl.getAttribute('data-desc-src');
                const currentSrc = sourceEl.getAttribute('src');
                
                if (descSrcAttr) {
                    const type = sourceEl.getAttribute('type');
                    let origSrc = sourceEl.getAttribute('data-orig-src');
                    
                    // Store current src as data-orig-src if not already set
                    if (!origSrc) {
                        origSrc = currentSrc;
                    }
                    
                    // Store info for re-adding with described src
                    sourcesToUpdate.push({
                        src: descSrcAttr,  // Use described version
                        type: type,
                        origSrc: origSrc,
                        descSrc: descSrcAttr
                    });
                } else {
                    // Source element without data-desc-src - keep as-is
                    const type = sourceEl.getAttribute('type');
                    const src = sourceEl.getAttribute('src');
                    sourcesToUpdate.push({
                        src: src,
                        type: type,
                        origSrc: null,
                        descSrc: null
                    });
                }
            });
            
            // Remove src attribute if present (video with src can't have source elements per HTML spec)
            const hasSrcAttribute = this.element.hasAttribute('src');
            const srcValue = hasSrcAttribute ? this.element.getAttribute('src') : null;
            if (hasSrcAttribute) {
                this.element.removeAttribute('src');
            }
            
            // Remove all source elements
            allSourceElements.forEach(sourceEl => {
                sourceEl.remove();
            });
            
            // Re-add them with updated src attributes (described versions)
            sourcesToUpdate.forEach(sourceInfo => {
                const newSource = document.createElement('source');
                newSource.setAttribute('src', sourceInfo.src);
                if (sourceInfo.type) {
                    newSource.setAttribute('type', sourceInfo.type);
                }
                if (sourceInfo.origSrc) {
                    newSource.setAttribute('data-orig-src', sourceInfo.origSrc);
                }
                if (sourceInfo.descSrc) {
                    newSource.setAttribute('data-desc-src', sourceInfo.descSrc);
                }
                const firstTrack = this.element.querySelector('track');
                if (firstTrack) {
                    this.element.insertBefore(newSource, firstTrack);
                } else {
                    this.element.appendChild(newSource);
                }
            });

            // Ensure cached source references are refreshed after rebuilding the list
            this._sourceElementsDirty = true;
            this._sourceElementsCache = null;
            
            // Preserve poster before reload
            if (posterValue && this.element.tagName === 'VIDEO') {
                this.element.poster = posterValue;
            }
            
            // Force reload by calling load() on the element
            // This should pick up the new src attributes from the re-added source elements
            // and also reload the track elements
            this.element.load();
            
            // Wait for new source to load metadata
            await new Promise((resolve) => {
                const onLoadedMetadata = () => {
                    this.element.removeEventListener('loadedmetadata', onLoadedMetadata);
                    resolve();
                };
                
                if (this.element.readyState >= 1) {
                    // Metadata already loaded
                    resolve();
                } else {
                    this.element.addEventListener('loadedmetadata', onLoadedMetadata);
                }
            });
            
            // Wait a bit more for tracks to be recognized and loaded after video metadata loads
            await new Promise(resolve => setTimeout(resolve, 300));

            // If we need to seek and/or play, wait for enough data to be loaded
            if (currentTime > 0 || wasPlaying) {
                await new Promise((resolve) => {
                    const onCanPlay = () => {
                        this.element.removeEventListener('canplay', onCanPlay);
                        this.element.removeEventListener('canplaythrough', onCanPlay);
                        resolve();
                    };
                    
                    // Check if already ready
                    if (this.element.readyState >= 3) { // HAVE_FUTURE_DATA or better
                        resolve();
                    } else {
                        // Wait for canplay or canplaythrough
                        this.element.addEventListener('canplay', onCanPlay, { once: true });
                        this.element.addEventListener('canplaythrough', onCanPlay, { once: true });
                        
                        // Fallback timeout in case events don't fire
                        setTimeout(() => {
                            this.element.removeEventListener('canplay', onCanPlay);
                            this.element.removeEventListener('canplaythrough', onCanPlay);
                            resolve();
                        }, 3000);
                    }
                });
            }

            // Try to find matching caption in the new track for better synchronization
            let syncTime = currentTime;
            if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
                // Wait a bit for tracks to load
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Find the matching caption in the described video's track
                const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
                if (matchingTime !== null) {
                    syncTime = matchingTime;
                    if (this.options.debug) {
                        console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
                    }
                }
            }

            // Restore playback position (avoid forcing first frame if still at start)
            if (syncTime > 0) {
                this.seek(syncTime);
                // Wait a bit for seek to complete
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (wasPlaying) {
                await this.play();
                // Hide poster when playing - use setTimeout to ensure play event has fired
                this.setManagedTimeout(() => {
                    this.hidePosterOverlay();
                }, 100);
            } else {
                // Explicitly pause the video if it wasn't playing
                // This ensures it's in a clean paused state after load()
                this.pause();
                if (!shouldKeepPoster) {
                    this.hidePosterOverlay();
                }
            }

            // Update state and emit event
            if (!this._audioDescriptionDesiredState) {
                return;
            }
            this.state.audioDescriptionEnabled = true;
            this.emit('audiodescriptionenabled');
        } else {
            // Fallback to updating element src directly
            // Swap caption tracks to described versions BEFORE loading
            if (this.audioDescriptionCaptionTracks.length > 0) {
                // Swap tracks: validate explicit tracks, but try auto-detected tracks without validation
                const validationPromises = this.audioDescriptionCaptionTracks.map(async (trackInfo) => {
                    if (trackInfo.trackElement && trackInfo.describedSrc) {
                        // Only validate explicitly defined tracks
                        // Auto-detected tracks are used without validation (no 404s)
                        if (trackInfo.explicit === true) {
                            try {
                                const exists = await this.validateTrackExists(trackInfo.describedSrc);
                                return { trackInfo, exists };
                            } catch (error) {
                                return { trackInfo, exists: false };
                            }
                        } else {
                            // This shouldn't happen since auto-detection is disabled
                            return { trackInfo, exists: false };
                        }
                    }
                    return { trackInfo, exists: false };
                });
                
                const validationResults = await Promise.all(validationPromises);
                const tracksToSwap = validationResults.filter(result => result.exists);
                
                if (tracksToSwap.length > 0) {
                    // Store original track modes before removing tracks
                    const trackModes = new Map();
                    tracksToSwap.forEach(({ trackInfo }) => {
                        const textTrack = trackInfo.trackElement.track;
                        if (textTrack) {
                            trackModes.set(trackInfo, {
                                wasShowing: textTrack.mode === 'showing',
                                wasHidden: textTrack.mode === 'hidden'
                            });
                        } else {
                            trackModes.set(trackInfo, {
                                wasShowing: false,
                                wasHidden: false
                            });
                        }
                    });
                    
                    // Store all track information before removing
                    const tracksToReadd = tracksToSwap.map(({ trackInfo }) => {
                        const oldSrc = trackInfo.trackElement.getAttribute('src');
                        const parent = trackInfo.trackElement.parentNode;
                        const nextSibling = trackInfo.trackElement.nextSibling;
                        
                        // Store all attributes from the old track
                        const attributes = {};
                        Array.from(trackInfo.trackElement.attributes).forEach(attr => {
                            attributes[attr.name] = attr.value;
                        });
                        
                        return {
                            trackInfo,
                            oldSrc,
                            parent,
                            nextSibling,
                            attributes
                        };
                    });
                    
                    // Remove ALL old tracks first to force browser to clear TextTrack objects
                    tracksToReadd.forEach(({ trackInfo }) => {
                        trackInfo.trackElement.remove();
                    });
                    
                    // Force browser to process the removal by calling load()
                    this.element.load();
                    
                    // Wait for browser to process the removal, then add new tracks
                    setTimeout(() => {
                        tracksToReadd.forEach(({ trackInfo, oldSrc, parent, nextSibling, attributes }) => {
                            swappedTracksForTranscript.push(trackInfo);
                            
                            // Create a completely new track element (not a clone) to force browser to create new TextTrack
                            const newTrackElement = document.createElement('track');
                            newTrackElement.setAttribute('src', trackInfo.describedSrc);
                            
                            // Copy all attributes except src and data-desc-src
                            Object.keys(attributes).forEach(attrName => {
                                if (attrName !== 'src' && attrName !== 'data-desc-src') {
                                    newTrackElement.setAttribute(attrName, attributes[attrName]);
                                }
                            });
                            
                            // Insert new track element at the beginning (before any flow content) for HTML5 validity
                            const firstChild = parent.firstChild;
                            if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && firstChild.tagName !== 'TRACK') {
                                parent.insertBefore(newTrackElement, firstChild);
                            } else if (nextSibling && nextSibling.parentNode) {
                                parent.insertBefore(newTrackElement, nextSibling);
                            } else {
                                parent.appendChild(newTrackElement);
                            }
                            
                            // Update reference to the new track element
                            trackInfo.trackElement = newTrackElement;
                        });
                        
                        // After all new tracks are added, force browser to reload media element again
                        this.element.load();
                        
                        // Wait for loadedmetadata event before accessing new TextTrack objects
                        const setupNewTracks = () => {
                            // Wait a bit more for browser to fully process the new track elements
                            setTimeout(() => {
                                swappedTracksForTranscript.forEach((trackInfo) => {
                                    const trackElement = trackInfo.trackElement;
                                    const newTextTrack = trackElement.track;
                                    
                                    if (newTextTrack) {
                                        // Get original mode from stored map
                                        const modeInfo = trackModes.get(trackInfo) || { wasShowing: false, wasHidden: false };
                                        
                                        // Set mode to load the new track
                                        newTextTrack.mode = 'hidden'; // Use hidden to load cues without showing
                                        
                                        // Restore original mode after track loads
                                        const restoreMode = () => {
                                            if (modeInfo.wasShowing) {
                                                // Set to hidden - CaptionManager will set it to showing when it enables
                                                newTextTrack.mode = 'hidden';
                                            } else if (modeInfo.wasHidden) {
                                                newTextTrack.mode = 'hidden';
                                            } else {
                                                newTextTrack.mode = 'disabled';
                                            }
                                        };
                                        
                                        // Wait for track to load
                                        if (newTextTrack.readyState >= 2) { // LOADED
                                            restoreMode();
                                        } else {
                                            newTextTrack.addEventListener('load', restoreMode, { once: true });
                                            newTextTrack.addEventListener('error', restoreMode, { once: true });
                                        }
                                    }
                                });
                            }, 300); // Additional wait for browser to process track elements
                        };
                        
                        // Wait for loadedmetadata event which fires when browser processes track elements
                        if (this.element.readyState >= 1) { // HAVE_METADATA
                            // Already loaded, wait a bit and setup
                            setTimeout(setupNewTracks, 200);
                        } else {
                            this.element.addEventListener('loadedmetadata', setupNewTracks, { once: true });
                            // Fallback timeout
                            setTimeout(setupNewTracks, 2000);
                        }
                    }, 100); // Wait 100ms after first load() before adding new tracks
                }
            }
            
            // Check if we have source elements with data-desc-src (fallback method)
            const fallbackSourceElements = this.sourceElements;
            const hasSourceElementsWithDesc = fallbackSourceElements.some(el => el.getAttribute('data-desc-src'));
            
            if (hasSourceElementsWithDesc) {
                const fallbackSourcesToUpdate = [];
                
                fallbackSourceElements.forEach((sourceEl) => {
                    const descSrcAttr = sourceEl.getAttribute('data-desc-src');
                    const currentSrc = sourceEl.getAttribute('src');
                    
                    if (descSrcAttr) {
                        const type = sourceEl.getAttribute('type');
                        let origSrc = sourceEl.getAttribute('data-orig-src');
                        
                        if (!origSrc) {
                            origSrc = currentSrc;
                        }
                        
                        fallbackSourcesToUpdate.push({
                            src: descSrcAttr,
                            type: type,
                            origSrc: origSrc,
                            descSrc: descSrcAttr
                        });
                    } else {
                        const type = sourceEl.getAttribute('type');
                        const src = sourceEl.getAttribute('src');
                        fallbackSourcesToUpdate.push({
                            src: src,
                            type: type,
                            origSrc: null,
                            descSrc: null
                        });
                    }
                });
                
                // Remove all source elements
                fallbackSourceElements.forEach(sourceEl => {
                    sourceEl.remove();
                });
                
                // Re-add them with updated src attributes
                fallbackSourcesToUpdate.forEach(sourceInfo => {
                    const newSource = document.createElement('source');
                    newSource.setAttribute('src', sourceInfo.src);
                    if (sourceInfo.type) {
                        newSource.setAttribute('type', sourceInfo.type);
                    }
                    if (sourceInfo.origSrc) {
                        newSource.setAttribute('data-orig-src', sourceInfo.origSrc);
                    }
                    if (sourceInfo.descSrc) {
                        newSource.setAttribute('data-desc-src', sourceInfo.descSrc);
                    }
                    this.element.appendChild(newSource);
                });
                
                // Preserve poster before reload
                if (posterValue && this.element.tagName === 'VIDEO') {
                    this.element.poster = posterValue;
                }
                
                // Force reload
                this.element.load();
                this.invalidateTrackCache();
            } else {
                // Fallback to updating element src directly (for videos without source elements)
                // Preserve poster before changing src
                if (posterValue && this.element.tagName === 'VIDEO') {
                    this.element.poster = posterValue;
                }
                this.element.src = this.audioDescriptionSrc;
            }
        }

        // Wait for new source to load metadata
        await new Promise((resolve) => {
            const onLoadedMetadata = () => {
                this.element.removeEventListener('loadedmetadata', onLoadedMetadata);
                resolve();
            };
            
            if (this.element.readyState >= 1) {
                // Metadata already loaded
                resolve();
            } else {
                this.element.addEventListener('loadedmetadata', onLoadedMetadata);
            }
        });

        // If we need to seek and/or play, wait for enough data to be loaded
        if (currentTime > 0 || wasPlaying) {
            await new Promise((resolve) => {
                const onCanPlay = () => {
                    this.element.removeEventListener('canplay', onCanPlay);
                    this.element.removeEventListener('canplaythrough', onCanPlay);
                    resolve();
                };
                
                // Check if already ready
                if (this.element.readyState >= 3) { // HAVE_FUTURE_DATA or better
                    resolve();
                } else {
                    // Wait for canplay or canplaythrough
                    this.element.addEventListener('canplay', onCanPlay, { once: true });
                    this.element.addEventListener('canplaythrough', onCanPlay, { once: true });
                    
                    // Fallback timeout in case events don't fire
                    setTimeout(() => {
                        this.element.removeEventListener('canplay', onCanPlay);
                        this.element.removeEventListener('canplaythrough', onCanPlay);
                        resolve();
                    }, 3000);
                }
            });
        }

        // Hide poster if video hasn't started yet (poster should hide when we seek or play)
        if (this.element.tagName === 'VIDEO' && currentTime === 0 && !wasPlaying) {
            // Force poster to hide by doing a minimal seek or loading first frame
            // Setting readyState check or seeking to 0.001 seconds will hide the poster
            if (this.element.readyState >= 1) { // HAVE_METADATA
                // Seek to a tiny fraction to trigger poster hiding without actually moving
                this.element.currentTime = 0.001;
                // Then seek back to 0 after a brief moment to ensure poster stays hidden
                this.setManagedTimeout(() => {
                    this.element.currentTime = 0;
                }, 10);
            }
        }

        // Try to find matching caption in the new track for better synchronization
        let syncTime = currentTime;
        if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
            // Wait a bit for tracks to load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Find the matching caption in the described video's track
            const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
            if (matchingTime !== null) {
                syncTime = matchingTime;
                if (this.options.debug) {
                    console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
                }
            }
        }

        // Restore playback position (avoid forcing first frame if still at start)
        if (syncTime > 0) {
            this.seek(syncTime);
            // Wait a bit for seek to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (wasPlaying) {
            await this.play();
            // Hide poster when playing - use setTimeout to ensure play event has fired
            this.setManagedTimeout(() => {
                this.hidePosterOverlay();
            }, 100);
        } else {
            // Explicitly pause the video if it wasn't playing
            // This ensures it's in a clean paused state after load()
            this.pause();
            if (!shouldKeepPoster) {
                this.hidePosterOverlay();
            }
        }

        // Reload CaptionManager tracks if tracks were swapped (so it has fresh references)
        if (swappedTracksForTranscript.length > 0 && this.captionManager) {
            // Store if captions were enabled and which track
            const wasCaptionsEnabled = this.state.captionsEnabled;
            let currentTrackInfo = null;
            if (this.captionManager.currentTrack) {
                const currentTrackIndex = this.captionManager.tracks.findIndex(t => t.track === this.captionManager.currentTrack.track);
                if (currentTrackIndex >= 0) {
                    currentTrackInfo = {
                        language: this.captionManager.tracks[currentTrackIndex].language,
                        kind: this.captionManager.tracks[currentTrackIndex].kind
                    };
                }
            }
            
            // Wait for new tracks to be available and loaded, then reload
            // Use a longer timeout and wait for track load events
            const reloadTracks = () => {
                // Reload tracks to get fresh references to new TextTrack objects
                this.captionManager.tracks = [];
                this.captionManager.loadTracks();
                
                // Re-enable captions if they were enabled before
                if (wasCaptionsEnabled && currentTrackInfo && this.captionManager.tracks.length > 0) {
                    // Find the track by language and kind to match the swapped track
                    const matchingTrackIndex = this.captionManager.tracks.findIndex(t => 
                        t.language === currentTrackInfo.language && t.kind === currentTrackInfo.kind
                    );
                    
                    if (matchingTrackIndex >= 0) {
                        const trackToEnable = this.captionManager.tracks[matchingTrackIndex];
                        // Wait for track to load its cues before enabling
                        if (trackToEnable.track.readyState >= 2) {
                            // Track is already loaded
                            this.captionManager.enable(matchingTrackIndex);
                        } else {
                            // Wait for track to load
                            const onTrackLoad = () => {
                                trackToEnable.track.removeEventListener('load', onTrackLoad);
                                trackToEnable.track.removeEventListener('error', onTrackLoad);
                                if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                                    this.captionManager.enable(matchingTrackIndex);
                                }
                            };
                            trackToEnable.track.addEventListener('load', onTrackLoad, { once: true });
                            trackToEnable.track.addEventListener('error', onTrackLoad, { once: true });
                            // Set mode to 'hidden' to trigger loading
                            trackToEnable.track.mode = 'hidden';
                            // Fallback timeout
                            setTimeout(() => {
                                if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                                    this.captionManager.enable(matchingTrackIndex);
                                }
                            }, 1000);
                        }
                    } else if (this.captionManager.tracks.length > 0) {
                        // Fallback: enable first track
                        const firstTrack = this.captionManager.tracks[0];
                        if (firstTrack.track.readyState >= 2) {
                            this.captionManager.enable(0);
                        } else {
                            const onTrackLoad = () => {
                                firstTrack.track.removeEventListener('load', onTrackLoad);
                                firstTrack.track.removeEventListener('error', onTrackLoad);
                                if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                                    this.captionManager.enable(0);
                                }
                            };
                            firstTrack.track.addEventListener('load', onTrackLoad, { once: true });
                            firstTrack.track.addEventListener('error', onTrackLoad, { once: true });
                            firstTrack.track.mode = 'hidden';
                            setTimeout(() => {
                                if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                                    this.captionManager.enable(0);
                                }
                            }, 1000);
                        }
                    }
                }
            };
            
            // Wait for tracks to be processed by the browser
            setTimeout(reloadTracks, 600);
        }

        // Reload transcript if visible (after video metadata loaded, tracks should be available)
        // Reload regardless of whether caption tracks were swapped, in case tracks changed
        if (this.transcriptManager && this.transcriptManager.isVisible) {
            // Wait for tracks to load after source swap
            // If tracks were swapped, wait for them to load; otherwise wait a bit for any track changes
            const swappedTracks = typeof swappedTracksForTranscript !== 'undefined' ? swappedTracksForTranscript : [];
            
            if (swappedTracks.length > 0) {
                // Wait for swapped tracks to load their new cues
                // Since we re-added track elements and called load(), wait for loadedmetadata event
                // which is when the browser processes track elements
                const onMetadataLoaded = () => {
                    // Get fresh track references from the video element's textTracks collection
                    // This ensures we get the actual textTrack objects that the browser created
                    // Invalidate cache first to get fresh tracks after swap
                    this.invalidateTrackCache();
                    const allTextTracks = this.textTracks;
                    
                    // Find the tracks that match our swapped tracks by language and kind
                    // Match by checking the track element's src attribute
                    const freshTracks = swappedTracks.map((trackInfo) => {
                        const trackEl = trackInfo.trackElement;
                        const expectedSrc = trackEl.getAttribute('src');
                        const srclang = trackEl.getAttribute('srclang');
                        const kind = trackEl.getAttribute('kind');
                        
                        // Find matching track in textTracks collection
                        // First try to match by the track element reference
                        let foundTrack = allTextTracks.find(track => trackEl.track === track);
                        
                        // If not found, try matching by language and kind, but verify src
                        if (!foundTrack) {
                            foundTrack = allTextTracks.find(track => {
                                if (track.language === srclang && 
                                    (track.kind === kind || (kind === 'captions' && track.kind === 'subtitles'))) {
                                    // Verify the src matches
                                    const trackElementForTrack = this.findTrackElement(track);
                                    if (trackElementForTrack) {
                                        const actualSrc = trackElementForTrack.getAttribute('src');
                                        if (actualSrc === expectedSrc) {
                                            return true;
                                        }
                                    }
                                }
                                return false;
                            });
                        }
                        
                        // Verify the track element's src matches what we expect
                        if (foundTrack) {
                            const trackElement = this.findTrackElement(foundTrack);
                            if (trackElement && trackElement.getAttribute('src') !== expectedSrc) {
                                return null;
                            }
                        }
                        
                        return foundTrack;
                    }).filter(Boolean);
                    
                    if (freshTracks.length === 0) {
                        // Fallback: just reload after delay - transcript manager will find tracks itself
                        this.setManagedTimeout(() => {
                            if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                                this.transcriptManager.loadTranscriptData();
                            }
                        }, 1000);
                        return;
                    }
                    
                    // Ensure tracks are in hidden mode to load cues for transcript
                    freshTracks.forEach(track => {
                        if (track.mode === 'disabled') {
                            track.mode = 'hidden';
                        }
                    });
                    
                    let loadedCount = 0;
                    const checkLoaded = () => {
                        loadedCount++;
                        if (loadedCount >= freshTracks.length) {
                            // Give a bit more time for cues to be fully parsed
                            // Also ensure we're getting the latest TextTrack references
                            this.setManagedTimeout(() => {
                                if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                                    // Force transcript manager to get fresh track references
                                    // Clear any cached track references by forcing a fresh read
                                    // The transcript manager will find tracks from this.element.textTracks
                                    // which should now have the new TextTrack objects with the described captions
                                    
                                    // Verify the tracks have the correct src before reloading transcript
                                    this.invalidateTrackCache();
                                    const allTextTracks = this.textTracks;
                                    const swappedTrackSrcs = swappedTracks.map(t => t.describedSrc);
                                    const hasCorrectTracks = freshTracks.some(track => {
                                        const trackEl = this.findTrackElement(track);
                                        return trackEl && swappedTrackSrcs.includes(trackEl.getAttribute('src'));
                                    });
                                    
                                    if (hasCorrectTracks || freshTracks.length > 0) {
                                        this.transcriptManager.loadTranscriptData();
                                    }
                                }
                            }, 800); // Increased wait time to ensure cues are fully loaded
                        }
                    };
                    
                    freshTracks.forEach(track => {
                        // Ensure track is in hidden mode to load cues (required for transcript)
                        if (track.mode === 'disabled') {
                            track.mode = 'hidden';
                        }
                        
                        // Check if track has cues loaded
                        // Verify the track element's src matches the expected described src
                        const trackElementForTrack = this.findTrackElement(track);
                        const actualSrc = trackElementForTrack ? trackElementForTrack.getAttribute('src') : null;
                        
                        // Find the expected src from swappedTracks
                        const expectedTrackInfo = swappedTracks.find(t => {
                            const tEl = t.trackElement;
                            return tEl && (tEl.track === track || 
                                (tEl.getAttribute('srclang') === track.language && 
                                 tEl.getAttribute('kind') === track.kind));
                        });
                        const expectedSrc = expectedTrackInfo ? expectedTrackInfo.describedSrc : null;
                        
                        // Only proceed if the src matches (or we can't verify)
                        if (expectedSrc && actualSrc && actualSrc !== expectedSrc) {
                            // Wrong track, skip it
                            checkLoaded(); // Count it as loaded to not block
                            return;
                        }
                        
                        if (track.readyState >= 2 && track.cues && track.cues.length > 0) { // LOADED with cues
                            // Track already loaded with cues
                            checkLoaded();
                        } else {
                            // Force track to load by setting mode
                            if (track.mode === 'disabled') {
                                track.mode = 'hidden';
                            }
                            
                            // Wait for track to load
                            const onTrackLoad = () => {
                                // Wait a bit for cues to be fully parsed
                                this.setManagedTimeout(checkLoaded, 300);
                            };
                            
                            if (track.readyState >= 2) {
                                // Already loaded, but might not have cues yet
                                // Wait a bit and check again
                                this.setManagedTimeout(() => {
                                    if (track.cues && track.cues.length > 0) {
                                        checkLoaded();
                                    } else {
                                        // Still no cues, wait for load event
                                        track.addEventListener('load', onTrackLoad, { once: true });
                                    }
                                }, 100);
                            } else {
                                track.addEventListener('load', onTrackLoad, { once: true });
                                track.addEventListener('error', () => {
                                    // Even on error, try to reload transcript
                                    checkLoaded();
                                }, { once: true });
                            }
                        }
                    });
                };
                
                // Wait for loadedmetadata event which fires when browser processes track elements
                // Also wait for the tracks to be fully processed after the second load()
                const waitForTracks = () => {
                        // Wait a bit more to ensure new TextTrack objects are created
                        this.setManagedTimeout(() => {
                            if (this.element.readyState >= 1) { // HAVE_METADATA
                                onMetadataLoaded();
                            } else {
                                this.element.addEventListener('loadedmetadata', onMetadataLoaded, { once: true });
                                // Fallback timeout
                                this.setManagedTimeout(onMetadataLoaded, 2000);
                            }
                        }, 500); // Wait 500ms after second load() for tracks to be processed
                };
                
                waitForTracks();
                
                // Fallback timeout - longer to ensure tracks are loaded
                setTimeout(() => {
                    if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                        this.transcriptManager.loadTranscriptData();
                    }
                }, 5000);
            } else {
                // No tracks swapped, just wait a bit and reload
                setTimeout(() => {
                    if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                        this.transcriptManager.loadTranscriptData();
                    }
                }, 800);
            }
        }

        if (!shouldKeepPoster) {
            this.hidePosterOverlay();
        }

        if (!this._audioDescriptionDesiredState) {
            return;
        }

        this.state.audioDescriptionEnabled = true;
        this.emit('audiodescriptionenabled');
    }

    async disableAudioDescription() {
        return this.audioDescriptionManager.disable();
    }

    // Legacy method body preserved for reference - can be removed after testing
    async _legacyDisableAudioDescription() {
        if (!this.originalSrc) {
            return;
        }

        // Store current playback state
        // Use element.currentTime directly, not state, as state may not be up-to-date
        const currentTime = this.element.currentTime;
        const wasPlaying = this.state.playing;
        
        // Try to find the current caption text for synchronization
        // This helps when switching between videos of different lengths
        let currentCaptionText = null;
        if (this.captionManager && this.captionManager.currentTrack) {
            const track = this.captionManager.currentTrack.track;
            if (track && track.activeCues && track.activeCues.length > 0) {
                const activeCue = track.activeCues[0];
                currentCaptionText = this.stripVTTFormatting(activeCue.text);
            }
        }
        
        // Store poster to preserve it during source swap
        // Convert relative paths to absolute URLs to prevent resolution issues
        const posterValue = this.resolvePosterPath(
            this.element.getAttribute('poster') || 
            this.element.poster || 
            this.options.poster
        );

        // Swap caption/chapter tracks back to original versions BEFORE loading
        // Store swapped tracks for transcript reload
        let swappedTracksForTranscript = [];
        if (this.audioDescriptionCaptionTracks.length > 0) {
            // Store track information before removing
            const tracksToRestore = this.audioDescriptionCaptionTracks.map((trackInfo) => {
                const trackElement = trackInfo.trackElement;
                if (!trackElement || !trackElement.parentNode) {
                    return null;
                }
                
                const parent = trackElement.parentNode;
                const nextSibling = trackElement.nextSibling;
                
                // Store all attributes from the current track
                const attributes = {};
                Array.from(trackElement.attributes).forEach(attr => {
                    attributes[attr.name] = attr.value;
                });
                
                return {
                    trackInfo,
                    parent,
                    nextSibling,
                    attributes
                };
            }).filter(Boolean);
            
            // Remove all current track elements
            tracksToRestore.forEach(({ trackInfo }) => {
                if (trackInfo.trackElement && trackInfo.trackElement.parentNode) {
                    trackInfo.trackElement.remove();
                }
            });
            
            // Force browser to process the removal
            this.element.load();
            
            // Wait for browser to process the removal, then add original tracks back
            // Use await instead of setTimeout to ensure this completes before continuing
            await new Promise(resolve => {
                setTimeout(() => {
                    tracksToRestore.forEach(({ trackInfo, parent, nextSibling, attributes }) => {
                        swappedTracksForTranscript.push(trackInfo);
                        
                        // Create a new track element with the original src
                        const newTrackElement = document.createElement('track');
                        newTrackElement.setAttribute('src', trackInfo.originalTrackSrc);
                        
                        // Copy all attributes except src and data-desc-src
                        Object.keys(attributes).forEach(attrName => {
                            if (attrName !== 'src' && attrName !== 'data-desc-src') {
                                newTrackElement.setAttribute(attrName, attributes[attrName]);
                            }
                        });
                        
                        // Keep data-desc-src for future swaps
                        if (trackInfo.describedSrc) {
                            newTrackElement.setAttribute('data-desc-src', trackInfo.describedSrc);
                        }
                        
                        // Insert new track element
                        if (nextSibling && nextSibling.parentNode) {
                            parent.insertBefore(newTrackElement, nextSibling);
                        } else {
                            parent.appendChild(newTrackElement);
                        }
                        
                        // Update reference to the new track element
                        trackInfo.trackElement = newTrackElement;
                    });
                    
                    this.invalidateTrackCache();
                    resolve();
                }, 100);
            });
        }
        
        // Swap source elements back to original versions
        // Check if we have source elements with data-orig-src
        const allSourceElements = this.sourceElements;
        const hasSourceElementsToSwap = allSourceElements.some(el => el.getAttribute('data-orig-src'));
        
        if (hasSourceElementsToSwap) {
            const sourcesToRestore = [];
            
            allSourceElements.forEach((sourceEl) => {
                const origSrcAttr = sourceEl.getAttribute('data-orig-src');
                const descSrcAttr = sourceEl.getAttribute('data-desc-src');
                
                if (origSrcAttr) {
                    // Swap back to original src
                    const type = sourceEl.getAttribute('type');
                    sourcesToRestore.push({
                        src: origSrcAttr,  // Use original version
                        type: type,
                        origSrc: origSrcAttr,
                        descSrc: descSrcAttr  // Keep data-desc-src for future swaps
                    });
                } else {
                    // Keep as-is (no data-orig-src means it wasn't swapped)
                    const type = sourceEl.getAttribute('type');
                    const src = sourceEl.getAttribute('src');
                    sourcesToRestore.push({
                        src: src,
                        type: type,
                        origSrc: null,
                        descSrc: descSrcAttr
                    });
                }
            });
            
            // Remove src attribute if present (video with src can't have source elements per HTML spec)
            const hasSrcAttribute = this.element.hasAttribute('src');
            const srcValue = hasSrcAttribute ? this.element.getAttribute('src') : null;
            if (hasSrcAttribute) {
                this.element.removeAttribute('src');
            }
            
            // Remove all source elements
            allSourceElements.forEach(sourceEl => {
                sourceEl.remove();
            });
            
            // Re-add them with original src attributes
            sourcesToRestore.forEach(sourceInfo => {
                const newSource = document.createElement('source');
                newSource.setAttribute('src', sourceInfo.src);
                if (sourceInfo.type) {
                    newSource.setAttribute('type', sourceInfo.type);
                }
                if (sourceInfo.origSrc) {
                    newSource.setAttribute('data-orig-src', sourceInfo.origSrc);
                }
                if (sourceInfo.descSrc) {
                    newSource.setAttribute('data-desc-src', sourceInfo.descSrc);
                }
                const firstTrack = this.element.querySelector('track');
                if (firstTrack) {
                    this.element.insertBefore(newSource, firstTrack);
                } else {
                    this.element.appendChild(newSource);
                }
            });

            // Ensure cached source references are refreshed after rebuilding the list
            this._sourceElementsDirty = true;
            this._sourceElementsCache = null;
            
            // Preserve poster before reload
            if (posterValue && this.element.tagName === 'VIDEO') {
                this.element.poster = posterValue;
            }
            
            // Force reload
            this.element.load();
        } else {
            // Fallback to updating element src directly (for videos without source elements)
            // Preserve poster before changing src
            if (posterValue && this.element.tagName === 'VIDEO') {
                this.element.poster = posterValue;
            }
            const originalSrcToUse = this.originalAudioDescriptionSource || this.originalSrc;
            this.element.src = originalSrcToUse;
            this.element.load();
        }

        // Wait for new source to load metadata
        await new Promise((resolve) => {
            const onLoadedMetadata = () => {
                this.element.removeEventListener('loadedmetadata', onLoadedMetadata);
                resolve();
            };
            
            if (this.element.readyState >= 1) {
                // Metadata already loaded
                resolve();
            } else {
                this.element.addEventListener('loadedmetadata', onLoadedMetadata);
            }
        });

        // If we need to seek and/or play, wait for enough data to be loaded
        if (currentTime > 0 || wasPlaying) {
            await new Promise((resolve) => {
                const onCanPlay = () => {
                    this.element.removeEventListener('canplay', onCanPlay);
                    this.element.removeEventListener('canplaythrough', onCanPlay);
                    resolve();
                };
                
                // Check if already ready
                if (this.element.readyState >= 3) { // HAVE_FUTURE_DATA or better
                    resolve();
                } else {
                    // Wait for canplay or canplaythrough
                    this.element.addEventListener('canplay', onCanPlay, { once: true });
                    this.element.addEventListener('canplaythrough', onCanPlay, { once: true });
                    
                    // Fallback timeout in case events don't fire
                    setTimeout(() => {
                        this.element.removeEventListener('canplay', onCanPlay);
                        this.element.removeEventListener('canplaythrough', onCanPlay);
                        resolve();
                    }, 3000);
                }
            });
        }

        // Try to find matching caption in the new track for better synchronization
        let syncTime = currentTime;
        if (currentCaptionText && this.captionManager && this.captionManager.tracks.length > 0) {
            // Wait a bit for tracks to load
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Find the matching caption in the regular video's track
            const matchingTime = this.findMatchingCaptionTime(currentCaptionText, this.captionManager.tracks);
            if (matchingTime !== null) {
                syncTime = matchingTime;
                if (this.options.debug) {
                    console.log(`[VidPly] Syncing via caption: ${currentTime}s -> ${syncTime}s`);
                }
            }
        }

        if (syncTime > 0) {
            this.seek(syncTime);
            // Wait a bit for seek to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (wasPlaying) {
            await this.play();
            this.hidePosterOverlay();
        } else {
            // Explicitly pause the video if it wasn't playing
            // This ensures it's in a clean paused state after load()
            this.pause();
            if (!wasPlaying && syncTime === 0) {
                this.showPosterOverlay();
            } else {
                this.hidePosterOverlay();
            }
        }

            // Reload CaptionManager tracks if tracks were swapped (so it has fresh references)
            if (swappedTracksForTranscript.length > 0 && this.captionManager) {
                // Store if captions were enabled and which track
                const wasCaptionsEnabled = this.state.captionsEnabled;
                let currentTrackInfo = null;
                if (this.captionManager.currentTrack) {
                    const currentTrackIndex = this.captionManager.tracks.findIndex(t => t.track === this.captionManager.currentTrack.track);
                    if (currentTrackIndex >= 0) {
                        currentTrackInfo = {
                            language: this.captionManager.tracks[currentTrackIndex].language,
                            kind: this.captionManager.tracks[currentTrackIndex].kind
                        };
                    }
                }
                
                // Wait for tracks to be processed by the browser
                const reloadTracks = () => {
                    // Reload tracks to get fresh references to new TextTrack objects
                    this.captionManager.tracks = [];
                    this.captionManager.loadTracks();
                    
                    // Re-enable captions if they were enabled before
                    if (wasCaptionsEnabled && currentTrackInfo && this.captionManager.tracks.length > 0) {
                        // Find the track by language and kind to match the swapped track
                        const matchingTrackIndex = this.captionManager.tracks.findIndex(t => 
                            t.language === currentTrackInfo.language && t.kind === currentTrackInfo.kind
                        );
                        
                        if (matchingTrackIndex >= 0) {
                            const trackToEnable = this.captionManager.tracks[matchingTrackIndex];
                            // Wait for track to load its cues before enabling
                            if (trackToEnable.track.readyState >= 2) {
                                // Track is already loaded
                                this.captionManager.enable(matchingTrackIndex);
                            } else {
                                // Wait for track to load
                                const onTrackLoad = () => {
                                    trackToEnable.track.removeEventListener('load', onTrackLoad);
                                    trackToEnable.track.removeEventListener('error', onTrackLoad);
                                    if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                                        this.captionManager.enable(matchingTrackIndex);
                                    }
                                };
                                trackToEnable.track.addEventListener('load', onTrackLoad, { once: true });
                                trackToEnable.track.addEventListener('error', onTrackLoad, { once: true });
                                // Set mode to 'hidden' to trigger loading
                                trackToEnable.track.mode = 'hidden';
                                // Fallback timeout
                                setTimeout(() => {
                                    if (this.captionManager && this.captionManager.tracks.includes(trackToEnable)) {
                                        this.captionManager.enable(matchingTrackIndex);
                                    }
                                }, 1000);
                            }
                        } else if (this.captionManager.tracks.length > 0) {
                            // Fallback: enable first track
                            const firstTrack = this.captionManager.tracks[0];
                            if (firstTrack.track.readyState >= 2) {
                                this.captionManager.enable(0);
                            } else {
                                const onTrackLoad = () => {
                                    firstTrack.track.removeEventListener('load', onTrackLoad);
                                    firstTrack.track.removeEventListener('error', onTrackLoad);
                                    if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                                        this.captionManager.enable(0);
                                    }
                                };
                                firstTrack.track.addEventListener('load', onTrackLoad, { once: true });
                                firstTrack.track.addEventListener('error', onTrackLoad, { once: true });
                                firstTrack.track.mode = 'hidden';
                                setTimeout(() => {
                                    if (this.captionManager && this.captionManager.tracks.includes(firstTrack)) {
                                        this.captionManager.enable(0);
                                    }
                                }, 1000);
                            }
                        }
                    }
                };
                
                // Wait for tracks to be processed by the browser
                setTimeout(reloadTracks, 600);
            }

            // Reload transcript if visible (after video metadata loaded, tracks should be available)
            // Reload regardless of whether caption tracks were swapped, in case tracks changed
            if (this.transcriptManager && this.transcriptManager.isVisible) {
                // Wait for tracks to load after source swap
                this.setManagedTimeout(() => {
                    if (this.transcriptManager && this.transcriptManager.loadTranscriptData) {
                        this.transcriptManager.loadTranscriptData();
                    }
                }, 500);
            }

        if (this._audioDescriptionDesiredState) {
            return;
        }

        this.state.audioDescriptionEnabled = false;
        this.emit('audiodescriptiondisabled');
    }

    async toggleAudioDescription() {
        if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
            this.showNotice(i18n.t('player.startPlaybackForAudioDescription'));
            return;
        }

        // If user toggles audio description before the first track has been loaded,
        // remember desired state and start playback so the described source is loaded.
        if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
            this.audioDescriptionManager.desiredState = !this.audioDescriptionManager.desiredState;
            this.state.audioDescriptionEnabled = this.audioDescriptionManager.desiredState;
            this.emit(this.audioDescriptionManager.desiredState ? 'audiodescriptionenabled' : 'audiodescriptiondisabled');
            // Start playback (PlaylistManager.play() will honor desiredState and load described src)
            this.play();
            return;
        }

        return this.audioDescriptionManager.toggle();
    }

    // Sign Language (delegated to SignLanguageManager)
    enableSignLanguage() {
        return this.signLanguageManager.enable();
    }

    // Legacy method body preserved for reference - can be removed after testing
    _legacyEnableSignLanguage() {
        // Determine available sign language sources
        const hasMultipleSources = Object.keys(this.signLanguageSources).length > 0;
        const hasSingleSource = !!this.signLanguageSrc;
        
        if (!hasMultipleSources && !hasSingleSource) {
            console.warn('No sign language video source provided');
            return;
        }

        if (this.signLanguageWrapper) {
            // Already exists, just show it
            this.signLanguageWrapper.style.display = 'block';
            this.state.signLanguageEnabled = true;
            this.emit('signlanguageenabled');
            
            // Focus the settings button after wrapper is shown
            // Use setManagedTimeout to ensure it's properly scheduled
            this.setManagedTimeout(() => {
                if (this.signLanguageSettingsButton && document.contains(this.signLanguageSettingsButton)) {
                    this.signLanguageSettingsButton.focus({ preventScroll: true });
                }
            }, 150);
            return;
        }
        
        // Determine initial sign language
        let initialLang = null;
        let initialSrc = null;
        
        if (hasMultipleSources) {
            // Try to sync with current caption language
            if (this.captionManager && this.captionManager.currentTrack) {
                const captionLang = this.captionManager.currentTrack.language?.toLowerCase().split('-')[0];
                if (captionLang && this.signLanguageSources[captionLang]) {
                    initialLang = captionLang;
                    initialSrc = this.signLanguageSources[captionLang];
                }
            }
            
            // If no match, try player language
            if (!initialLang && this.options.language) {
                const playerLang = this.options.language.toLowerCase().split('-')[0];
                if (this.signLanguageSources[playerLang]) {
                    initialLang = playerLang;
                    initialSrc = this.signLanguageSources[playerLang];
                }
            }
            
            // If still no match, use first available
            if (!initialLang) {
                initialLang = Object.keys(this.signLanguageSources)[0];
                initialSrc = this.signLanguageSources[initialLang];
            }
            
            this.currentSignLanguage = initialLang;
        } else {
            // Single source fallback
            initialSrc = this.signLanguageSrc;
        }

        // Create wrapper container
        this.signLanguageWrapper = document.createElement('div');
        this.signLanguageWrapper.className = 'vidply-sign-language-wrapper';
        this.signLanguageWrapper.setAttribute('tabindex', '0');
        this.signLanguageWrapper.setAttribute('aria-label', i18n.t('player.signLanguageDragResize'));

        // Create header (draggable)
        this.signLanguageHeader = DOMUtils.createElement('div', {
            className: `${this.options.classPrefix}-sign-language-header`,
            attributes: {
                'tabindex': '0'
            }
        });

        // Header left side (title)
        const headerLeft = DOMUtils.createElement('div', {
            className: `${this.options.classPrefix}-sign-language-header-left`
        });

        const title = DOMUtils.createElement('h3', {
            textContent: i18n.t('player.signLanguageVideo')
        });

        // Settings button (before language selector)
        const settingsAriaLabel = i18n.t('player.signLanguageSettings');
        this.signLanguageSettingsButton = DOMUtils.createElement('button', {
            className: `${this.options.classPrefix}-sign-language-settings`,
            attributes: {
                'type': 'button',
                'aria-label': settingsAriaLabel,
                'aria-expanded': 'false'
            }
        });
        this.signLanguageSettingsButton.appendChild(createIconElement('settings'));
        DOMUtils.attachTooltip(this.signLanguageSettingsButton, settingsAriaLabel, this.options.classPrefix);
        this.signLanguageSettingsHandlers = {
            settingsClick: (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Stop the document click handler from interfering
                if (this.signLanguageDocumentClickHandler) {
                    // Temporarily disable document click handler
                    const wasJustOpened = this.signLanguageSettingsMenuJustOpened;
                    this.signLanguageSettingsMenuJustOpened = true;
                    setTimeout(() => {
                        this.signLanguageSettingsMenuJustOpened = wasJustOpened;
                    }, 100);
                }
                if (this.signLanguageSettingsMenuVisible) {
                    this.hideSignLanguageSettingsMenu();
                } else {
                    this.showSignLanguageSettingsMenu();
                }
            },
            settingsKeydown: (e) => {
                // D key to toggle keyboard drag mode
                if (e.key === 'd' || e.key === 'D') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleSignLanguageKeyboardDragMode();
                }
                // R key to toggle resize mode
                else if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleSignLanguageResizeMode();
                }
                // Escape to close menu if open
                else if (e.key === 'Escape' && this.signLanguageSettingsMenuVisible) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.hideSignLanguageSettingsMenu();
                }
            }
        };
        this.signLanguageSettingsButton.addEventListener('click', this.signLanguageSettingsHandlers.settingsClick);
        this.signLanguageSettingsButton.addEventListener('keydown', this.signLanguageSettingsHandlers.settingsKeydown);
        headerLeft.appendChild(this.signLanguageSettingsButton);

        // Language selector (if multiple sources available)
        this.signLanguageSelector = null;
        if (hasMultipleSources) {
            const selectId = `${this.options.classPrefix}-sign-language-select-${Date.now()}`;
            
            // Create options array
            const options = Object.keys(this.signLanguageSources).map(langCode => ({
                value: langCode,
                text: this.getSignLanguageLabel(langCode),
                selected: langCode === initialLang
            }));
            
            const { label: signLanguageLabel, select: signLanguageSelector } = createLabeledSelect({
                classPrefix: this.options.classPrefix,
                labelClass: `${this.options.classPrefix}-sign-language-label`,
                selectClass: `${this.options.classPrefix}-sign-language-select`,
                labelText: 'settings.language',
                selectId: selectId,
                options: options,
                onChange: (e) => {
                    e.stopPropagation(); // Prevent event from bubbling
                    const selectedLang = e.target.value;
                    this.switchSignLanguage(selectedLang);
                }
            });
            
            this.signLanguageSelector = signLanguageSelector;
            
            // Wrap label and select in a container for horizontal layout
            const signLanguageSelectorWrapper = DOMUtils.createElement('div', {
                className: `${this.options.classPrefix}-sign-language-selector-wrapper`
            });
            signLanguageSelectorWrapper.appendChild(signLanguageLabel);
            signLanguageSelectorWrapper.appendChild(this.signLanguageSelector);
            
            // Prevent drag when interacting with wrapper
            preventDragOnElement(signLanguageSelectorWrapper);
            
            headerLeft.appendChild(signLanguageSelectorWrapper);
        }

        headerLeft.appendChild(title);
        
        // Close button
        const closeAriaLabel = i18n.t('player.closeSignLanguage');
        const closeButton = DOMUtils.createElement('button', {
            className: `${this.options.classPrefix}-sign-language-close`,
            attributes: {
                'type': 'button',
                'aria-label': closeAriaLabel
            }
        });
        closeButton.appendChild(createIconElement('close'));
        DOMUtils.attachTooltip(closeButton, closeAriaLabel, this.options.classPrefix);
        closeButton.addEventListener('click', () => {
            this.disableSignLanguage();
            // Return focus to sign language button if available
            if (this.controlBar && this.controlBar.controls && this.controlBar.controls.signLanguage) {
                setTimeout(() => {
                    this.controlBar.controls.signLanguage.focus({ preventScroll: true });
                }, 0);
            }
        });

        this.signLanguageHeader.appendChild(headerLeft);
        this.signLanguageHeader.appendChild(closeButton);
        
        // Initialize settings menu state
        this.signLanguageSettingsMenuVisible = false;
        this.signLanguageSettingsMenu = null;
        this.signLanguageSettingsMenuJustOpened = false;
        this.signLanguageResizeOptionButton = null;
        this.signLanguageResizeOptionText = null;
        this.signLanguageDragOptionButton = null;
        this.signLanguageDragOptionText = null;
        this.signLanguageDocumentClickHandler = null;
        this.signLanguageDocumentClickHandlerAdded = false;

        // Create sign language video element
        this.signLanguageVideo = document.createElement('video');
        this.signLanguageVideo.className = 'vidply-sign-language-video';
        this.signLanguageVideo.src = initialSrc;
        this.signLanguageVideo.setAttribute('aria-label', i18n.t('player.signLanguage'));
        this.signLanguageVideo.muted = true; // Sign language video should be muted
        
        // Enable inline playback on iOS (prevents native fullscreen)
        this.signLanguageVideo.setAttribute('playsinline', '');

        // Create resize handles (8 directions like transcript)
        this.signLanguageResizeHandles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(dir => {
            const handle = DOMUtils.createElement('div', {
                className: `${this.options.classPrefix}-sign-resize-handle ${this.options.classPrefix}-sign-resize-${dir}`,
                attributes: {
                    'data-direction': dir,
                    'data-vidply-managed-resize': 'true',
                    'aria-hidden': 'true'
                }
            });
            handle.style.display = 'none';
            return handle;
        });

        // Append header, video and handles to wrapper
        this.signLanguageWrapper.appendChild(this.signLanguageHeader);
        this.signLanguageWrapper.appendChild(this.signLanguageVideo);
        this.signLanguageResizeHandles.forEach(handle => this.signLanguageWrapper.appendChild(handle));

        // Set width FIRST to ensure proper dimensions
        const saved = this.storage.getSignLanguagePreferences();
        if (saved && saved.size && saved.size.width) {
            this.signLanguageWrapper.style.width = saved.size.width;
        } else {
            this.signLanguageWrapper.style.width = '280px'; // Default width
        }
        // Height is always auto to maintain aspect ratio
        this.signLanguageWrapper.style.height = 'auto';
        
        // Position is always calculated fresh - use option or default to bottom-right
        this.signLanguageDesiredPosition = this.options.signLanguagePosition || 'bottom-right';

        // Add to main player container (NOT videoWrapper) to avoid overflow:hidden clipping
        this.container.appendChild(this.signLanguageWrapper);

        // Set position immediately after appending
        requestAnimationFrame(() => {
            this.constrainSignLanguagePosition();
        });

        // Sync with main video
        this.signLanguageVideo.currentTime = this.state.currentTime;
        if (!this.state.paused) {
            this.signLanguageVideo.play();
        }

        // Setup drag and resize
        this.setupSignLanguageInteraction();

        // Create bound handlers to store references for cleanup
        this.signLanguageHandlers = {
            play: () => {
                if (this.signLanguageVideo) {
                    this.signLanguageVideo.play();
                }
            },
            pause: () => {
                if (this.signLanguageVideo) {
                    this.signLanguageVideo.pause();
                }
            },
            timeupdate: () => {
                if (this.signLanguageVideo && Math.abs(this.signLanguageVideo.currentTime - this.state.currentTime) > 0.5) {
                    this.signLanguageVideo.currentTime = this.state.currentTime;
                }
            },
            ratechange: () => {
                if (this.signLanguageVideo) {
                    this.signLanguageVideo.playbackRate = this.state.playbackSpeed;
                }
            }
        };

        // Sync playback
        this.on('play', this.signLanguageHandlers.play);
        this.on('pause', this.signLanguageHandlers.pause);
        this.on('timeupdate', this.signLanguageHandlers.timeupdate);
        this.on('ratechange', this.signLanguageHandlers.ratechange);
        
        // Sync sign language when captions change (if multiple sources available)
        if (hasMultipleSources) {
            this.signLanguageHandlers.captionChange = () => {
                if (this.captionManager && this.captionManager.currentTrack && this.signLanguageSelector) {
                    const captionLang = this.captionManager.currentTrack.language?.toLowerCase().split('-')[0];
                    if (captionLang && this.signLanguageSources[captionLang] && this.currentSignLanguage !== captionLang) {
                        this.switchSignLanguage(captionLang);
                        // Update selector
                        this.signLanguageSelector.value = captionLang;
                    }
                }
            };
            // Listen to captionsenabled which fires when a track is enabled (including when switching)
            this.on('captionsenabled', this.signLanguageHandlers.captionChange);
        }

        this.state.signLanguageEnabled = true;
        this.emit('signlanguageenabled');
        
        // Focus the settings button after wrapper is appended to DOM
        // Use setManagedTimeout to ensure it's properly scheduled
        this.setManagedTimeout(() => {
            if (this.signLanguageSettingsButton && document.contains(this.signLanguageSettingsButton)) {
                this.signLanguageSettingsButton.focus({ preventScroll: true });
            }
        }, 150);
    }

    disableSignLanguage() {
        return this.signLanguageManager.disable();
    }

    toggleSignLanguage() {
        if (this.options.requirePlaybackForAccessibilityToggles && !this.renderer && this.playlistManager?.tracks?.length) {
            this.showNotice(i18n.t('player.startPlaybackForSignLanguage'));
            return;
        }

        // If user toggles sign language before the first track has been loaded,
        // enable the overlay and start playback so sign language video sync begins.
        if (!this.renderer && this.playlistManager && this.playlistManager.tracks?.length) {
            const wasEnabled = this.signLanguageManager.enabled;
            const result = this.signLanguageManager.toggle();
            if (!wasEnabled && this.signLanguageManager.enabled) {
                this.play();
            }
            return result;
        }

        return this.signLanguageManager.toggle();
    }

    setupSignLanguageInteraction() {
        return this.signLanguageManager._setupInteraction();
    }

    // Legacy method preserved for reference
    _legacySetupSignLanguageInteraction() {
        if (!this.signLanguageWrapper) return;

        // Check if we're on mobile and not in fullscreen
        const isMobile = window.innerWidth < 768;
        const isFullscreen = this.state.fullscreen;
        
        // On mobile devices (< 768px), only enable drag/resize in fullscreen
        // On desktop/tablets (>= 768px), always enable drag/resize
        if (isMobile && !isFullscreen) {
            // Destroy existing instance if exiting fullscreen on mobile
            if (this.signLanguageDraggable) {
                this.signLanguageDraggable.destroy();
                this.signLanguageDraggable = null;
            }
            return; // No drag/resize on mobile when not in fullscreen
        }

        // If already initialized, don't re-initialize
        if (this.signLanguageDraggable) {
            return;
        }

        // Create DraggableResizable utility with touch support
        // Use header as drag handle instead of video
        this.signLanguageDraggable = new DraggableResizable(this.signLanguageWrapper, {
            dragHandle: this.signLanguageHeader,
            resizeHandles: this.signLanguageResizeHandles,
            constrainToViewport: true,
            maintainAspectRatio: true,
            minWidth: 150,
            minHeight: 100,
            classPrefix: `${this.options.classPrefix}-sign`,
            keyboardDragKey: 'd',
            keyboardResizeKey: 'r',
            keyboardStep: 10,
            keyboardStepLarge: 50,
            pointerResizeIndicatorText: i18n.t('player.signLanguageResizeActive'),
            onPointerResizeToggle: (enabled) => {
                // Update resize handles visibility
                this.signLanguageResizeHandles.forEach(handle => {
                    handle.style.display = enabled ? 'block' : 'none';
                });
            },
            onDragStart: (e) => {
                // Don't drag if clicking on close button, settings button, language selector, or settings menu
                if (e.target.closest(`.${this.options.classPrefix}-sign-language-close`) ||
                    e.target.closest(`.${this.options.classPrefix}-sign-language-settings`) ||
                    e.target.closest(`.${this.options.classPrefix}-sign-language-select`) ||
                    e.target.closest(`.${this.options.classPrefix}-sign-language-label`) ||
                    e.target.closest(`.${this.options.classPrefix}-sign-language-settings-menu`)) {
                    return false; // Prevent drag
                }
                return true; // Allow drag
            }
        });

        // Add custom keyboard handler for special keys (Escape, Home)
        this.signLanguageCustomKeyHandler = (e) => {
            const key = e.key.toLowerCase();
            
            // Don't handle keys if settings menu is open (let menu handle them)
            if (this.signLanguageSettingsMenuVisible) {
                return;
            }
            
            if (key === 'home') {
                e.preventDefault();
                e.stopPropagation();
                if (this.signLanguageDraggable) {
                    if (this.signLanguageDraggable.pointerResizeMode) {
                        this.signLanguageDraggable.disablePointerResizeMode();
                    }
                    this.signLanguageDraggable.manuallyPositioned = false;
                    this.constrainSignLanguagePosition();
                }
                return;
            }
            
            if (key === 'r') {
                e.preventDefault();
                e.stopPropagation();
                const enabled = this.toggleSignLanguageResizeMode();
                if (enabled) {
                    this.signLanguageWrapper.focus({ preventScroll: true });
                }
                return;
            }
            
            if (key === 'escape') {
                e.preventDefault();
                e.stopPropagation();
                // Exit resize mode if active
                if (this.signLanguageDraggable && this.signLanguageDraggable.pointerResizeMode) {
                    this.signLanguageDraggable.disablePointerResizeMode();
                    return;
                }
                // Exit keyboard drag mode if active
                if (this.signLanguageDraggable && this.signLanguageDraggable.keyboardDragMode) {
                    this.signLanguageDraggable.disableKeyboardDragMode();
                    return;
                }
                // Close video if no modes are active
                this.disableSignLanguage();
                // Return focus to sign language button if available
                if (this.controlBar && this.controlBar.controls && this.controlBar.controls.signLanguage) {
                    setTimeout(() => {
                        this.controlBar.controls.signLanguage.focus({ preventScroll: true });
                    }, 0);
                }
                return;
            }
        };
        
        this.signLanguageWrapper.addEventListener('keydown', this.signLanguageCustomKeyHandler);

        // Store for cleanup
        this.signLanguageInteractionHandlers = {
            draggable: this.signLanguageDraggable,
            headerKeyHandler: this.signLanguageHeaderKeyHandler,
            customKeyHandler: this.signLanguageCustomKeyHandler
        };
    }

    toggleSignLanguageKeyboardDragMode() {
        if (this.signLanguageDraggable) {
            const wasEnabled = this.signLanguageDraggable.keyboardDragMode;
            this.signLanguageDraggable.toggleKeyboardDragMode();
            const isEnabled = this.signLanguageDraggable.keyboardDragMode;
            if (!wasEnabled && isEnabled) {
                this.enableSignLanguageMoveMode();
            }
            // Update drag option state
            this.updateSignLanguageDragOptionState();
        }
    }

    enableSignLanguageMoveMode() {
        // Add visual feedback for move mode
        this.signLanguageWrapper.classList.add(`${this.options.classPrefix}-sign-move-mode`);
        
        // Update resize option state in case menu is open
        this.updateSignLanguageResizeOptionState();
        
        // Remove after 2 seconds
        setTimeout(() => {
            this.signLanguageWrapper.classList.remove(`${this.options.classPrefix}-sign-move-mode`);
        }, 2000);
    }

    toggleSignLanguageResizeMode({ focus = true } = {}) {
        if (!this.signLanguageDraggable) {
            return false;
        }

        if (this.signLanguageDraggable.pointerResizeMode) {
            this.signLanguageDraggable.disablePointerResizeMode({ focus });
            this.updateSignLanguageResizeOptionState();
            return false;
        }

        this.signLanguageDraggable.enablePointerResizeMode({ focus });
        this.updateSignLanguageResizeOptionState();
        return true;
    }

    getSignLanguageLabel(langCode) {
        // Get language label from i18n or use language code
        const langNames = {
            'en': 'English',
            'de': 'Deutsch',
            'es': 'Español',
            'fr': 'Français',
            'it': 'Italiano',
            'ja': '日本語',
            'pt': 'Português',
            'ar': 'العربية',
            'hi': 'हिन्दी'
        };
        return langNames[langCode] || langCode.toUpperCase();
    }

    switchSignLanguage(langCode) {
        return this.signLanguageManager.switchLanguage(langCode);
    }

    // Legacy method preserved for reference
    _legacySwitchSignLanguage(langCode) {
        if (!this.signLanguageSources[langCode] || !this.signLanguageVideo) {
            return;
        }
        
        const currentTime = this.signLanguageVideo.currentTime;
        const wasPlaying = !this.signLanguageVideo.paused;
        
        this.signLanguageVideo.src = this.signLanguageSources[langCode];
        this.currentSignLanguage = langCode;
        
        // Restore playback state
        this.signLanguageVideo.currentTime = currentTime;
        if (wasPlaying) {
            this.signLanguageVideo.play().catch(() => {
                // Ignore play errors
            });
        }
        
        this.emit('signlanguagelanguagechanged', langCode);
    }

    showSignLanguageSettingsMenu() {
        return this.signLanguageManager.showSettingsMenu();
    }

    // Legacy method preserved for reference
    _legacyShowSignLanguageSettingsMenu() {
        // Set flag to prevent immediate closing
        this.signLanguageSettingsMenuJustOpened = true;
        setTimeout(() => {
            this.signLanguageSettingsMenuJustOpened = false;
        }, 350);
        
        // Add document click handler on FIRST menu open (not at window creation)
        if (!this.signLanguageDocumentClickHandlerAdded) {
            this.signLanguageDocumentClickHandler = (e) => {
                // Ignore if menu was just opened (prevents immediate closing)
                if (this.signLanguageSettingsMenuJustOpened) {
                    return;
                }
                
                // Ignore clicks on the settings button itself or its children
                if (this.signLanguageSettingsButton && 
                    (this.signLanguageSettingsButton === e.target || this.signLanguageSettingsButton.contains(e.target))) {
                    return;
                }
                
                // Ignore clicks on the settings menu items
                if (this.signLanguageSettingsMenu && this.signLanguageSettingsMenu.contains(e.target)) {
                    return;
                }
                
                // Close menu if clicking outside
                if (this.signLanguageSettingsMenuVisible) {
                    this.hideSignLanguageSettingsMenu();
                }
            };
            setTimeout(() => {
                document.addEventListener('mousedown', this.signLanguageDocumentClickHandler, true); // Use mousedown in capture phase
                this.signLanguageDocumentClickHandlerAdded = true;
            }, 300);
        }
        
        if (this.signLanguageSettingsMenu) {
            this.signLanguageSettingsMenu.style.display = 'block';
            this.signLanguageSettingsMenuVisible = true;
            if (this.signLanguageSettingsButton) {
                this.signLanguageSettingsButton.setAttribute('aria-expanded', 'true');
            }
            // Always re-attach keyboard navigation handler when reopening
            this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
                this.signLanguageSettingsMenu,
                this.signLanguageSettingsButton,
                `.${this.options.classPrefix}-sign-language-settings-item`,
                () => this.hideSignLanguageSettingsMenu({ focusButton: true })
            );
            // Reposition menu in case window was moved (async for repositioning)
            this.positionSignLanguageSettingsMenu();
            this.updateSignLanguageDragOptionState();
            this.updateSignLanguageResizeOptionState();
            focusFirstMenuItem(this.signLanguageSettingsMenu, `.${this.options.classPrefix}-sign-language-settings-item`);
            return;
        }
        
        // Create settings menu
        this.signLanguageSettingsMenu = DOMUtils.createElement('div', {
            className: `${this.options.classPrefix}-sign-language-settings-menu`,
            attributes: {
                'role': 'menu'
            }
        });

        // Keyboard drag option
        const keyboardDragOption = createMenuItem({
            classPrefix: this.options.classPrefix,
            itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
            icon: 'move',
            label: 'player.enableSignDragMode',
            hasTextClass: true,
            onClick: () => {
                this.toggleSignLanguageKeyboardDragMode();
                this.hideSignLanguageSettingsMenu();
            }
        });
        keyboardDragOption.setAttribute('role', 'switch');
        keyboardDragOption.setAttribute('aria-checked', 'false');
        // Remove any tooltips from menu items (they have visible text)
        const dragTooltip = keyboardDragOption.querySelector(`.${this.options.classPrefix}-tooltip`);
        if (dragTooltip) dragTooltip.remove();
        const dragButtonText = keyboardDragOption.querySelector(`.${this.options.classPrefix}-button-text`);
        if (dragButtonText) dragButtonText.remove();
        this.signLanguageDragOptionButton = keyboardDragOption;
        this.signLanguageDragOptionText = keyboardDragOption.querySelector(`.${this.options.classPrefix}-settings-text`);
        this.updateSignLanguageDragOptionState();

        // Resize option
        const resizeOption = createMenuItem({
            classPrefix: this.options.classPrefix,
            itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
            icon: 'resize',
            label: 'player.enableSignResizeMode',
            hasTextClass: true,
            onClick: (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const enabled = this.toggleSignLanguageResizeMode({ focus: false });
                
                if (enabled) {
                    this.hideSignLanguageSettingsMenu({ focusButton: false });
                    // Focus sign language wrapper after handles appear
                    setTimeout(() => {
                        if (this.signLanguageWrapper) {
                            this.signLanguageWrapper.focus({ preventScroll: true });
                        }
                    }, 20);
                } else {
                    this.hideSignLanguageSettingsMenu({ focusButton: true });
                }
            }
        });
        resizeOption.setAttribute('role', 'switch');
        resizeOption.setAttribute('aria-checked', 'false');
        // Remove any tooltips from menu items (they have visible text)
        const resizeTooltip = resizeOption.querySelector(`.${this.options.classPrefix}-tooltip`);
        if (resizeTooltip) resizeTooltip.remove();
        const resizeButtonText = resizeOption.querySelector(`.${this.options.classPrefix}-button-text`);
        if (resizeButtonText) resizeButtonText.remove();
        this.signLanguageResizeOptionButton = resizeOption;
        this.signLanguageResizeOptionText = resizeOption.querySelector(`.${this.options.classPrefix}-settings-text`);
        this.updateSignLanguageResizeOptionState();

        // Close option
        const closeOption = createMenuItem({
            classPrefix: this.options.classPrefix,
            itemClass: `${this.options.classPrefix}-sign-language-settings-item`,
            icon: 'close',
            label: 'transcript.closeMenu',
            onClick: () => {
                this.hideSignLanguageSettingsMenu();
            }
        });
        // Remove any tooltips from menu items (they have visible text)
        const closeTooltip = closeOption.querySelector(`.${this.options.classPrefix}-tooltip`);
        if (closeTooltip) closeTooltip.remove();
        const closeButtonText = closeOption.querySelector(`.${this.options.classPrefix}-button-text`);
        if (closeButtonText) closeButtonText.remove();

        this.signLanguageSettingsMenu.appendChild(keyboardDragOption);
        this.signLanguageSettingsMenu.appendChild(resizeOption);
        this.signLanguageSettingsMenu.appendChild(closeOption);

        // Position menu first (before it's visible) to prevent jumping
        // Set menu to invisible temporarily
        this.signLanguageSettingsMenu.style.visibility = 'hidden';
        this.signLanguageSettingsMenu.style.display = 'block';
        
        // Insert menu right after the button in the DOM (like control bar menus)
        if (this.signLanguageSettingsButton && this.signLanguageSettingsButton.parentNode) {
            this.signLanguageSettingsButton.insertAdjacentElement('afterend', this.signLanguageSettingsMenu);
        } else if (this.signLanguageWrapper) {
            // Fallback: append to wrapper if button parent not available
            this.signLanguageWrapper.appendChild(this.signLanguageSettingsMenu);
        }
        
        // Position the menu relative to the settings button (immediately while hidden)
        this.positionSignLanguageSettingsMenuImmediate();
        
        // Make menu visible after positioning
        requestAnimationFrame(() => {
            if (this.signLanguageSettingsMenu) {
                this.signLanguageSettingsMenu.style.visibility = 'visible';
            }
        });
        
        // Add keyboard navigation
        this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
            this.signLanguageSettingsMenu,
            this.signLanguageSettingsButton,
            `.${this.options.classPrefix}-sign-language-settings-item`,
            () => this.hideSignLanguageSettingsMenu({ focusButton: true })
        );
        
        // Set the menu as visible and display it
        this.signLanguageSettingsMenuVisible = true;
        // this.signLanguageSettingsMenu.style.display = 'block'; // Already set above
        
        // Update aria-expanded
        if (this.signLanguageSettingsButton) {
            this.signLanguageSettingsButton.setAttribute('aria-expanded', 'true');
        }
        this.updateSignLanguageDragOptionState();
        this.updateSignLanguageResizeOptionState();
        
        // Focus first menu item
        focusFirstMenuItem(this.signLanguageSettingsMenu, `.${this.options.classPrefix}-sign-language-settings-item`);
    }

    hideSignLanguageSettingsMenu({ focusButton = true } = {}) {
        return this.signLanguageManager.hideSettingsMenu({ focusButton });
    }

    positionSignLanguageSettingsMenuImmediate() {
        if (!this.signLanguageSettingsMenu || !this.signLanguageSettingsButton) return;
        
        // Position immediately (synchronously) - used when menu is first shown
        const buttonRect = this.signLanguageSettingsButton.getBoundingClientRect();
        const menuRect = this.signLanguageSettingsMenu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Get the parent container (headerLeft) as the positioning container (like control bar menus)
        const parentContainer = this.signLanguageSettingsButton.parentElement;
        if (!parentContainer) return;
        
        const parentRect = parentContainer.getBoundingClientRect();
        
        // Calculate position relative to parent container
        const buttonCenterX = buttonRect.left + buttonRect.width / 2 - parentRect.left;
        const buttonBottom = buttonRect.bottom - parentRect.top;
        const buttonTop = buttonRect.top - parentRect.top;
        
        const spaceAbove = buttonRect.top;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        
        // Position menu below button by default
        let menuTop = buttonBottom + 8;
        let menuBottom = null;
        
        // Prefer below, but switch to above if not enough space
        if (spaceBelow < menuRect.height + 20 && spaceAbove > spaceBelow) {
            menuTop = null;
            const parentHeight = parentRect.bottom - parentRect.top;
            menuBottom = parentHeight - buttonTop + 8;
            this.signLanguageSettingsMenu.classList.add('vidply-menu-above');
        } else {
            this.signLanguageSettingsMenu.classList.remove('vidply-menu-above');
        }
        
        // Calculate horizontal position (center on button)
        let menuLeft = buttonCenterX - menuRect.width / 2;
        let menuRight = 'auto';
        let transformX = 'translateX(0)';
        
        const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
        if (menuLeftAbsolute < 10) {
            menuLeft = 0;
            transformX = 'translateX(0)';
        } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
            menuLeft = 'auto';
            menuRight = 0;
            transformX = 'translateX(0)';
        } else {
            menuLeft = buttonCenterX;
            transformX = 'translateX(-50%)';
        }
        
        // Apply calculated positions
        if (menuTop !== null) {
            this.signLanguageSettingsMenu.style.top = `${menuTop}px`;
            this.signLanguageSettingsMenu.style.bottom = 'auto';
        } else if (menuBottom !== null) {
            this.signLanguageSettingsMenu.style.top = 'auto';
            this.signLanguageSettingsMenu.style.bottom = `${menuBottom}px`;
        }
        
        if (menuLeft !== 'auto') {
            this.signLanguageSettingsMenu.style.left = `${menuLeft}px`;
            this.signLanguageSettingsMenu.style.right = 'auto';
        } else {
            this.signLanguageSettingsMenu.style.left = 'auto';
            this.signLanguageSettingsMenu.style.right = `${menuRight}px`;
        }
        
        this.signLanguageSettingsMenu.style.transform = transformX;
    }
    
    positionSignLanguageSettingsMenu() {
        if (!this.signLanguageSettingsMenu || !this.signLanguageSettingsButton || !this.signLanguageWrapper) return;
        
        // Use requestAnimationFrame to ensure layout is stable before positioning (for repositioning)
        requestAnimationFrame(() => {
            setTimeout(() => {
                this.positionSignLanguageSettingsMenuImmediate();
            }, 10); // Small delay to ensure layout is stable
        });
    }

    attachSignLanguageSettingsMenuKeyboardNavigation() {
        if (!this.signLanguageSettingsMenu) return;
        
        // Remove existing handler if any
        if (this.signLanguageSettingsMenuKeyHandler) {
            this.signLanguageSettingsMenu.removeEventListener('keydown', this.signLanguageSettingsMenuKeyHandler);
        }
        
        this.signLanguageSettingsMenuKeyHandler = attachMenuKeyboardNavigation(
            this.signLanguageSettingsMenu,
            this.signLanguageSettingsButton,
            `.${this.options.classPrefix}-sign-language-settings-item`,
            () => this.hideSignLanguageSettingsMenu({ focusButton: true })
        );
    }

    updateSignLanguageDragOptionState() {
        if (!this.signLanguageDragOptionButton) {
            return;
        }
        
        const isEnabled = !!(this.signLanguageDraggable && this.signLanguageDraggable.keyboardDragMode);
        const text = isEnabled
            ? i18n.t('player.disableSignDragMode')
            : i18n.t('player.enableSignDragMode');
        const ariaLabel = isEnabled
            ? i18n.t('player.disableSignDragModeAria')
            : i18n.t('player.enableSignDragModeAria');

        this.signLanguageDragOptionButton.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
        this.signLanguageDragOptionButton.setAttribute('aria-label', ariaLabel);

        if (this.signLanguageDragOptionText) {
            this.signLanguageDragOptionText.textContent = text;
        }
    }

    updateSignLanguageResizeOptionState() {
        if (!this.signLanguageResizeOptionButton) {
            return;
        }
        
        const isEnabled = !!(this.signLanguageDraggable && this.signLanguageDraggable.pointerResizeMode);
        const text = isEnabled
            ? i18n.t('player.disableSignResizeMode')
            : i18n.t('player.enableSignResizeMode');
        const ariaLabel = isEnabled
            ? i18n.t('player.disableSignResizeModeAria')
            : i18n.t('player.enableSignResizeModeAria');

        this.signLanguageResizeOptionButton.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
        this.signLanguageResizeOptionButton.setAttribute('aria-label', ariaLabel);

        if (this.signLanguageResizeOptionText) {
            this.signLanguageResizeOptionText.textContent = text;
        }
    }

    constrainSignLanguagePosition() {
        return this.signLanguageManager.constrainPosition();
    }

    saveSignLanguagePreferences() {
        return this.signLanguageManager.savePreferences();
    }

    // Legacy methods preserved for reference - can be removed after testing
    _legacyConstrainSignLanguagePosition() {
        if (!this.signLanguageWrapper || !this.videoWrapper) return;
        
        // Don't auto-position if user has manually positioned it
        if (this.signLanguageDraggable && this.signLanguageDraggable.manuallyPositioned) {
            return;
        }
        
        // Ensure width is set
        if (!this.signLanguageWrapper.style.width || this.signLanguageWrapper.style.width === '') {
            this.signLanguageWrapper.style.width = '280px'; // Default width
        }
        
        // Get videoWrapper position relative to the player CONTAINER (where sign language video is attached)
        const videoWrapperRect = this.videoWrapper.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const wrapperRect = this.signLanguageWrapper.getBoundingClientRect();
        
        // Calculate videoWrapper's position and dimensions relative to container
        const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
        const videoWrapperTop = videoWrapperRect.top - containerRect.top;
        const videoWrapperWidth = videoWrapperRect.width;
        const videoWrapperHeight = videoWrapperRect.height;
        
        // Use estimated height if video hasn't loaded yet (16:9 aspect ratio)
        let wrapperWidth = wrapperRect.width || 280;
        let wrapperHeight = wrapperRect.height || ((280 * 9) / 16); // Estimate based on 16:9 aspect ratio
        
        let left, top;
        const margin = 16; // Margin from edges
        const controlsHeight = 95; // Height of controls when visible
        
        // Always calculate fresh position based on desired location (relative to videoWrapper)
        const position = this.signLanguageDesiredPosition || 'bottom-right';
        
        switch (position) {
            case 'bottom-right':
                left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
                top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
                break;
            case 'bottom-left':
                left = videoWrapperLeft + margin;
                top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
                break;
            case 'top-right':
                left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
                top = videoWrapperTop + margin;
                break;
            case 'top-left':
                left = videoWrapperLeft + margin;
                top = videoWrapperTop + margin;
                break;
            default:
                left = videoWrapperLeft + videoWrapperWidth - wrapperWidth - margin;
                top = videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight;
        }
        
        // Constrain to videoWrapper bounds (ensuring it stays above controls)
        left = Math.max(videoWrapperLeft, Math.min(left, videoWrapperLeft + videoWrapperWidth - wrapperWidth));
        top = Math.max(videoWrapperTop, Math.min(top, videoWrapperTop + videoWrapperHeight - wrapperHeight - controlsHeight));
        
        // Apply constrained position
        this.signLanguageWrapper.style.left = `${left}px`;
        this.signLanguageWrapper.style.top = `${top}px`;
        this.signLanguageWrapper.style.right = 'auto';
        this.signLanguageWrapper.style.bottom = 'auto';
        // Remove position classes if any were applied
        this.signLanguageWrapper.classList.remove(...Array.from(this.signLanguageWrapper.classList).filter(c => c.startsWith('vidply-sign-position-')));
    }

    _legacySaveSignLanguagePreferences() {
        if (!this.signLanguageWrapper) return;
        
        // Only save width - position is always calculated fresh to bottom-right
        this.storage.saveSignLanguagePreferences({
            size: {
                width: this.signLanguageWrapper.style.width
                // Height is auto - maintained by aspect ratio
            }
        });
    }

    cleanupSignLanguage() {
        return this.signLanguageManager.cleanup();
    }

    // Settings
    // Settings dialog removed - using individual control buttons instead
    showSettings() {
        console.warn('[VidPly] Settings dialog has been removed. Use individual control buttons (speed, captions, etc.)');
    }

    hideSettings() {
        // No-op - settings dialog removed
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

    // Error handling
    handleError(error) {
        // Suppress errors during renderer switching
        // This prevents cascade of errors when HTML5 element is cleared for external renderers
        if (this._switchingRenderer) {
            this.log('Suppressing error during renderer switch:', error, 'debug');
            return;
        }
        
        this.log('Error:', error, 'error');
        this.emit('error', error);

        if (this.options.onError) {
            this.options.onError.call(this, error);
        }
    }

    // Logging
    log(...messages) {
        if (!this.options.debug) {
            return;
        }

        let type = 'log';
        if (messages.length > 0) {
            const potentialType = messages[messages.length - 1];
            if (typeof potentialType === 'string' && console[potentialType]) {
                type = potentialType;
                messages = messages.slice(0, -1);
            }
        }

        if (messages.length === 0) {
            messages = [''];
        }

        if (typeof console[type] === 'function') {
            console[type]('[VidPly]', ...messages);
        } else {
            console.log('[VidPly]', ...messages);
        }
    }

    // Setup responsive handlers
    setupResponsiveHandlers() {
        // Use ResizeObserver for efficient resize tracking
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    const width = entry.contentRect.width;

                    // Update control bar for viewport
                    if (this.controlBar && typeof this.controlBar.updateControlsForViewport === 'function') {
                        this.controlBar.updateControlsForViewport(width);
                    }

                    // Update transcript positioning
                    if (this.transcriptManager && this.transcriptManager.isVisible) {
                        this.transcriptManager.positionTranscript();
                    }
                }
            });

            this.resizeObserver.observe(this.container);
        } else {
            // Fallback to window resize event
            this.resizeHandler = () => {
                const width = this.container.clientWidth;

                if (this.controlBar && typeof this.controlBar.updateControlsForViewport === 'function') {
                    this.controlBar.updateControlsForViewport(width);
                }

                if (this.transcriptManager && this.transcriptManager.isVisible) {
                    // Only auto-position if user hasn't manually moved it
                    if (!this.transcriptManager.draggableResizable || !this.transcriptManager.draggableResizable.manuallyPositioned) {
                        this.transcriptManager.positionTranscript();
                    }
                }
            };

            window.addEventListener('resize', this.resizeHandler);
        }

        // Also listen for orientation changes on mobile
        if (window.matchMedia) {
            this.orientationHandler = (e) => {
                // Wait for layout to settle
                setTimeout(() => {
                    if (this.transcriptManager && this.transcriptManager.isVisible) {
                        // Only auto-position if user hasn't manually moved it
                        if (!this.transcriptManager.draggableResizable || !this.transcriptManager.draggableResizable.manuallyPositioned) {
                            this.transcriptManager.positionTranscript();
                        }
                    }
                }, 100);
            };

            const orientationQuery = window.matchMedia('(orientation: portrait)');
            if (orientationQuery.addEventListener) {
                orientationQuery.addEventListener('change', this.orientationHandler);
            } else if (orientationQuery.addListener) {
                // Fallback for older browsers
                orientationQuery.addListener(this.orientationHandler);
            }

            this.orientationQuery = orientationQuery;
        }

        // Listen for native fullscreen change events (e.g., when user presses ESC)
        this.fullscreenChangeHandler = () => {
            const isFullscreen = !!(
                document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement
            );

            // Only update if state has changed
            if (this.state.fullscreen !== isFullscreen) {
                this.state.fullscreen = isFullscreen;
                
                if (isFullscreen) {
                    this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
                } else {
                    this.container.classList.remove(`${this.options.classPrefix}-fullscreen`);
                    // Clean up pseudo-fullscreen state when exiting
                    this._disablePseudoFullscreen();
                }
                
                this.emit('fullscreenchange', isFullscreen);
                
                // Update fullscreen button icon
                if (this.controlBar) {
                    this.controlBar.updateFullscreenButton();
                }
                
                // Reposition sign language video after fullscreen transition
                if (this.signLanguageWrapper && this.signLanguageWrapper.style.display !== 'none') {
                    // Re-setup drag/drop when entering/exiting fullscreen on mobile devices
                    // This enables drag/resize when entering fullscreen on mobile
                    const isMobile = window.innerWidth < 768;
                    if (isMobile) {
                        this.setupSignLanguageInteraction();
                    }
                    
                    // Use setTimeout to ensure layout has updated after fullscreen transition
                    // Longer delay to account for CSS transition animations and layout recalculation
                    this.setManagedTimeout(() => {
                        // Use requestAnimationFrame to ensure the browser has fully rendered the layout
                        requestAnimationFrame(() => {
                            // Clear saved size and reset to default for the new container size
                            this.storage.saveSignLanguagePreferences({ size: null });
                            this.signLanguageDesiredPosition = 'bottom-right';
                            // Reset to default width for the new container
                            this.signLanguageWrapper.style.width = isFullscreen ? '400px' : '280px';
                            this.constrainSignLanguagePosition();
                        });
                    }, 500);
                }
            }
        };

        // Add listeners for all vendor-prefixed fullscreenchange events
        document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
        document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
    }

    // Cleanup
    destroy() {
        this.log('Destroying player');

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

        // Cleanup sign language video and listeners
        this.cleanupSignLanguage();

        // Cleanup play overlay button
        if (this.playButtonOverlay && this.playButtonOverlay.parentNode) {
            this.playButtonOverlay.remove();
            this.playButtonOverlay = null;
        }

        // Cleanup resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Cleanup window resize handler
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }

        // Cleanup orientation change handler
        if (this.orientationQuery && this.orientationHandler) {
            if (this.orientationQuery.removeEventListener) {
                this.orientationQuery.removeEventListener('change', this.orientationHandler);
            } else if (this.orientationQuery.removeListener) {
                this.orientationQuery.removeListener(this.orientationHandler);
            }
            this.orientationQuery = null;
            this.orientationHandler = null;
        }

        // Cleanup fullscreen change handler
        if (this.fullscreenChangeHandler) {
            document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
            document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
            this.fullscreenChangeHandler = null;
        }

        // Cleanup all managed timeouts
        this.timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        this.timeouts.clear();

        // Cleanup metadata handling
        if (this.metadataCueChangeHandler) {
            const textTracks = this.textTracks;
            const metadataTrack = textTracks.find(track => track.kind === 'metadata');
            if (metadataTrack) {
                metadataTrack.removeEventListener('cuechange', this.metadataCueChangeHandler);
            }
            this.metadataCueChangeHandler = null;
        }

        if (this.metadataAlertHandlers && this.metadataAlertHandlers.size > 0) {
            this.metadataAlertHandlers.forEach(({ button, handler }) => {
                if (button && handler) {
                    button.removeEventListener('click', handler);
                }
            });
            this.metadataAlertHandlers.clear();
        }

        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.element, this.container);
            this.container.parentNode.removeChild(this.container);
        }

        this.removeAllListeners();
    }

    /**
     * Setup metadata track handling
     * This enables metadata tracks and listens for cue changes to trigger actions
     */
    setupMetadataHandling() {
        const setupMetadata = () => {
            const textTracks = this.textTracks;
            const metadataTrack = textTracks.find(track => track.kind === 'metadata');
            
            if (metadataTrack) {
                // Enable the metadata track so cuechange events fire
                // Use 'hidden' mode so it doesn't display anything, but events still work
                if (metadataTrack.mode === 'disabled') {
                    metadataTrack.mode = 'hidden';
                }
                
                // Remove existing listener if any
                if (this.metadataCueChangeHandler) {
                    metadataTrack.removeEventListener('cuechange', this.metadataCueChangeHandler);
                }
                
                // Add event listener for cue changes
                this.metadataCueChangeHandler = () => {
                    const activeCues = Array.from(metadataTrack.activeCues || []);
                    if (activeCues.length > 0) {
                        // Debug logging
                        if (this.options.debug) {
                            this.log('[Metadata] Active cues:', activeCues.map(c => ({
                                start: c.startTime,
                                end: c.endTime,
                                text: c.text
                            })));
                        }
                    }
                    activeCues.forEach(cue => {
                        this.handleMetadataCue(cue);
                    });
                };
                
                metadataTrack.addEventListener('cuechange', this.metadataCueChangeHandler);
                
                // Debug: Log metadata track setup
                if (this.options.debug) {
                    const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
                    this.log('[Metadata] Track enabled,', cueCount, 'cues available');
                }
            } else if (this.options.debug) {
                this.log('[Metadata] No metadata track found');
            }
        };
        
        // Try immediately
        setupMetadata();
        
        // Also try after loadedmetadata event (tracks might not be ready yet)
        this.on('loadedmetadata', setupMetadata);
    }

    normalizeMetadataSelector(selector) {
        if (!selector) {
            return null;
        }
        const trimmed = selector.trim();
        if (!trimmed) {
            return null;
        }
        if (trimmed.startsWith('#') || trimmed.startsWith('.') || trimmed.startsWith('[')) {
            return trimmed;
        }
        return `#${trimmed}`;
    }

    resolveMetadataConfig(map, key) {
        if (!map || !key) {
            return null;
        }
        if (Object.prototype.hasOwnProperty.call(map, key)) {
            return map[key];
        }
        const withoutHash = key.replace(/^#/, '');
        if (Object.prototype.hasOwnProperty.call(map, withoutHash)) {
            return map[withoutHash];
        }
        return null;
    }

    cacheMetadataAlertContent(element, config = {}) {
        if (!element) {
            return;
        }
        const titleSelector = config.titleSelector || '[data-vidply-alert-title], h3, header';
        const messageSelector = config.messageSelector || '[data-vidply-alert-message], p';

        const titleEl = element.querySelector(titleSelector);
        if (titleEl && !titleEl.dataset.vidplyAlertTitleOriginal) {
            titleEl.dataset.vidplyAlertTitleOriginal = titleEl.textContent.trim();
        }

        const messageEl = element.querySelector(messageSelector);
        if (messageEl && !messageEl.dataset.vidplyAlertMessageOriginal) {
            messageEl.dataset.vidplyAlertMessageOriginal = messageEl.textContent.trim();
        }
    }

    restoreMetadataAlertContent(element, config = {}) {
        if (!element) {
            return;
        }
        const titleSelector = config.titleSelector || '[data-vidply-alert-title], h3, header';
        const messageSelector = config.messageSelector || '[data-vidply-alert-message], p';

        const titleEl = element.querySelector(titleSelector);
        if (titleEl && titleEl.dataset.vidplyAlertTitleOriginal) {
            titleEl.textContent = titleEl.dataset.vidplyAlertTitleOriginal;
        }

        const messageEl = element.querySelector(messageSelector);
        if (messageEl && messageEl.dataset.vidplyAlertMessageOriginal) {
            messageEl.textContent = messageEl.dataset.vidplyAlertMessageOriginal;
        }
    }

    focusMetadataTarget(target, fallbackElement = null) {
        if (!target || target === 'none') {
            return;
        }

        if (target === 'alert' && fallbackElement) {
            fallbackElement.focus({ preventScroll: true });
            return;
        }

        if (target === 'player') {
            if (this.container) {
                this.container.focus({ preventScroll: true });
            }
            return;
        }

        if (target === 'media') {
            this.element.focus({ preventScroll: true });
            return;
        }

        if (target === 'playButton') {
            const playButton = this.controlBar?.controls?.playPause;
            if (playButton) {
                playButton.focus({ preventScroll: true });
            }
            return;
        }

        if (typeof target === 'string') {
            const targetElement = document.querySelector(target);
            if (targetElement) {
                if (targetElement.tabIndex === -1 && !targetElement.hasAttribute('tabindex')) {
                    targetElement.setAttribute('tabindex', '-1');
                }
                targetElement.focus({ preventScroll: true });
            }
        }
    }

    handleMetadataAlert(selector, options = {}) {
        if (!selector) {
            return;
        }

        const config = this.resolveMetadataConfig(this.options.metadataAlerts, selector) || {};
        const element = options.element || document.querySelector(selector);

        if (!element) {
            if (this.options.debug) {
                this.log('[Metadata] Alert element not found:', selector);
            }
            return;
        }

        if (this.options.debug) {
            this.log('[Metadata] Handling alert', selector, { reason: options.reason, config });
        }

        this.cacheMetadataAlertContent(element, config);

        if (!element.dataset.vidplyAlertOriginalDisplay) {
            element.dataset.vidplyAlertOriginalDisplay = element.style.display || '';
        }

        if (!element.dataset.vidplyAlertDisplay) {
            element.dataset.vidplyAlertDisplay = config.display || 'block';
        }

        const shouldShow = options.show !== undefined ? options.show : (config.show !== false);
        if (shouldShow) {
            const displayValue = config.display || element.dataset.vidplyAlertDisplay || 'block';
            element.style.display = displayValue;
            element.hidden = false;
            element.removeAttribute('hidden');
            element.setAttribute('aria-hidden', 'false');
            element.setAttribute('data-vidply-alert-active', 'true');
        }

        const shouldReset = config.resetContent !== false && options.reason === 'focus';
        if (shouldReset) {
            this.restoreMetadataAlertContent(element, config);
        }

        const shouldFocus = options.focus !== undefined
            ? options.focus
            : (config.focusOnShow ?? (options.reason !== 'focus'));

        if (shouldShow && shouldFocus) {
            if (element.tabIndex === -1 && !element.hasAttribute('tabindex')) {
                element.setAttribute('tabindex', '-1');
            }
            element.focus({ preventScroll: true });
        }

        if (shouldShow && config.autoScroll !== false && options.autoScroll !== false) {
            element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        const continueSelector = config.continueButton;
        if (continueSelector) {
            let continueButton = null;
            if (continueSelector === 'self') {
                continueButton = element;
            } else if (element.matches(continueSelector)) {
                continueButton = element;
            } else {
                continueButton = element.querySelector(continueSelector) || document.querySelector(continueSelector);
            }

            if (continueButton && !this.metadataAlertHandlers.has(selector)) {
                const handler = () => {
                    const hideOnContinue = config.hideOnContinue !== false;
                    if (hideOnContinue) {
                        const originalDisplay = element.dataset.vidplyAlertOriginalDisplay || '';
                        element.style.display = config.hideDisplay || originalDisplay || 'none';
                        element.setAttribute('aria-hidden', 'true');
                        element.removeAttribute('data-vidply-alert-active');
                    }

                    if (config.resume !== false && this.state.paused) {
                        this.play();
                    }

                    const focusTarget = config.focusTarget || 'playButton';
                    this.setManagedTimeout(() => {
                        this.focusMetadataTarget(focusTarget, element);
                    }, config.focusDelay ?? 100);
                };

                continueButton.addEventListener('click', handler);
                this.metadataAlertHandlers.set(selector, { button: continueButton, handler });
            }
        }

        return element;
    }

    handleMetadataHashtags(hashtags) {
        if (!Array.isArray(hashtags) || hashtags.length === 0) {
            return;
        }

        const configMap = this.options.metadataHashtags;
        if (!configMap) {
            return;
        }

        hashtags.forEach(tag => {
            const config = this.resolveMetadataConfig(configMap, tag);
            if (!config) {
                return;
            }

            const selector = this.normalizeMetadataSelector(config.alert || config.selector || config.target);
            if (!selector) {
                return;
            }

            const element = document.querySelector(selector);
            if (!element) {
                if (this.options.debug) {
                    this.log('[Metadata] Hashtag target not found:', selector);
                }
                return;
            }

        if (this.options.debug) {
            this.log('[Metadata] Handling hashtag', tag, { selector, config });
        }

            this.cacheMetadataAlertContent(element, config);

            if (config.title) {
                const titleSelector = config.titleSelector || '[data-vidply-alert-title], h3, header';
                const titleEl = element.querySelector(titleSelector);
                if (titleEl) {
                    titleEl.textContent = config.title;
                }
            }

            if (config.message) {
                const messageSelector = config.messageSelector || '[data-vidply-alert-message], p';
                const messageEl = element.querySelector(messageSelector);
                if (messageEl) {
                    messageEl.textContent = config.message;
                }
            }

            const show = config.show !== false;
            const focus = config.focus !== undefined ? config.focus : false;

            this.handleMetadataAlert(selector, {
                element,
                show,
                focus,
                autoScroll: config.autoScroll,
                reason: 'hashtag'
            });
        });
    }

    /**
     * Handle individual metadata cues
     * Parses metadata text and emits events or triggers actions
     */
    handleMetadataCue(cue) {
        const text = cue.text.trim();
        
        // Debug logging
        if (this.options.debug) {
            this.log('[Metadata] Processing cue:', {
                time: cue.startTime,
                text: text
            });
        }
        
        // Emit a generic metadata event that developers can listen to
        this.emit('metadata', {
            time: cue.startTime,
            endTime: cue.endTime,
            text: text,
            cue: cue
        });

        // Parse for specific commands (examples based on wwa_meta.vtt format)
        if (text.includes('PAUSE')) {
            // Automatically pause the video
            if (!this.state.paused) {
                if (this.options.debug) {
                    this.log('[Metadata] Pausing video at', cue.startTime);
                }
                this.pause();
            }
            // Also emit event for developers who want to listen
            this.emit('metadata:pause', { time: cue.startTime, text: text });
        }

        // Parse for focus directives
        const focusMatch = text.match(/FOCUS:([\w#-]+)/);
        if (focusMatch) {
            const targetSelector = focusMatch[1];
            const normalizedSelector = this.normalizeMetadataSelector(targetSelector);
            // Automatically focus the target element
            const targetElement = normalizedSelector ? document.querySelector(normalizedSelector) : null;
            if (targetElement) {
                if (this.options.debug) {
                    this.log('[Metadata] Focusing element:', normalizedSelector);
                }
                // Make element focusable if it isn't already
                if (targetElement.tabIndex === -1 && !targetElement.hasAttribute('tabindex')) {
                    targetElement.setAttribute('tabindex', '-1');
                }
                // Use setTimeout to ensure DOM is ready
                this.setManagedTimeout(() => {
                    targetElement.focus({ preventScroll: true });
                }, 10);
            } else if (this.options.debug) {
                this.log('[Metadata] Element not found:', normalizedSelector || targetSelector);
            }
            // Also emit event for developers who want to listen
            this.emit('metadata:focus', { 
                time: cue.startTime, 
                target: targetSelector,
                selector: normalizedSelector,
                element: targetElement,
                text: text 
            });

            if (normalizedSelector) {
                this.handleMetadataAlert(normalizedSelector, {
                    element: targetElement,
                    reason: 'focus'
                });
            }
        }

        // Parse for hashtag references
        const hashtags = text.match(/#[\w-]+/g);
        if (hashtags) {
            if (this.options.debug) {
                this.log('[Metadata] Hashtags found:', hashtags);
            }
            this.emit('metadata:hashtags', {
                time: cue.startTime,
                hashtags: hashtags,
                text: text
            });

            this.handleMetadataHashtags(hashtags);
        }
    }
}

// Static instances tracker for pause others functionality
Player.instances = [];

