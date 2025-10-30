/**
 * VidPly - Universal Video Player
 * Main Player Class
 */

import {EventEmitter} from '../utils/EventEmitter.js';
import {DOMUtils} from '../utils/DOMUtils.js';
import {ControlBar} from '../controls/ControlBar.js';
import {CaptionManager} from '../controls/CaptionManager.js';
import {KeyboardManager} from '../controls/KeyboardManager.js';
import {TranscriptManager} from '../controls/TranscriptManager.js';
import {HTML5Renderer} from '../renderers/HTML5Renderer.js';
import {YouTubeRenderer} from '../renderers/YouTubeRenderer.js';
import {VimeoRenderer} from '../renderers/VimeoRenderer.js';
import {HLSRenderer} from '../renderers/HLSRenderer.js';
import {createPlayOverlay} from '../icons/Icons.js';
import {i18n} from '../i18n/i18n.js';
import {StorageManager} from '../utils/StorageManager.js';

export class Player extends EventEmitter {
    constructor(element, options = {}) {
        super();

        this.element = typeof element === 'string' ? document.querySelector(element) : element;
        if (!this.element) {
            throw new Error('VidPly: Element not found');
        }

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
            muted: this.options.muted,
            volume: this.options.volume,
            currentTime: 0,
            duration: 0,
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
        this.signLanguageVideo = null;

        // Components
        this.container = null;
        this.renderer = null;
        this.controlBar = null;
        this.captionManager = null;
        this.keyboardManager = null;
        this.settingsDialog = null;

        // Initialize
        this.init();
    }

    async init() {
        try {
            this.log('Initializing VidPly player');

            // Auto-detect language from HTML lang attribute if not explicitly set
            if (!this.options.language || this.options.language === 'en') {
                const htmlLang = this.detectHtmlLanguage();
                if (htmlLang) {
                    this.options.language = htmlLang;
                    this.log(`Auto-detected language from HTML: ${htmlLang}`);
                }
            }

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

            // Initialize transcript
            if (this.options.transcript || this.options.transcriptButton) {
                this.transcriptManager = new TranscriptManager(this);
            }

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

            if (this.options.muted) {
                this.mute();
            }

            if (this.options.volume !== 0.8) {
                this.setVolume(this.options.volume);
            }

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
     * Detect language from HTML lang attribute
     * @returns {string|null} Language code if available in translations, null otherwise
     */
    detectHtmlLanguage() {
        // Try to get lang from html element
        const htmlLang = document.documentElement.lang || document.documentElement.getAttribute('lang');

        if (!htmlLang) {
            return null;
        }

        // Normalize the language code (e.g., "en-US" -> "en", "de-DE" -> "de")
        const normalizedLang = htmlLang.toLowerCase().split('-')[0];

        // Check if this language is available in our translations
        const availableLanguages = ['en', 'de', 'es', 'fr', 'ja'];

        if (availableLanguages.includes(normalizedLang)) {
            return normalizedLang;
        }

        // Language not available, will fallback to English
        this.log(`Language "${htmlLang}" not available, using English as fallback`);
        return 'en';
    }

    createContainer() {
        // Create main container
        this.container = DOMUtils.createElement('div', {
            className: `${this.options.classPrefix}-player`,
            attributes: {
                'role': 'region',
                'aria-label': i18n.t('player.label'),
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
            this.element.setAttribute('webkit-playsinline', ''); // For older iOS versions
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

        // Set poster
        if (this.options.poster && this.element.tagName === 'VIDEO') {
            this.element.poster = this.options.poster;
        }

        // Create centered play button overlay (only for video)
        if (this.element.tagName === 'VIDEO') {
            this.createPlayButtonOverlay();
        }

        // Make video/audio element clickable to toggle play/pause
        this.element.style.cursor = 'pointer';
        this.element.addEventListener('click', (e) => {
            // Prevent if clicking on native controls (shouldn't happen but just in case)
            if (e.target === this.element) {
                this.toggle();
            }
        });
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
        });

        this.on('ended', () => {
            this.playButtonOverlay.style.opacity = '1';
            this.playButtonOverlay.style.pointerEvents = 'auto';
        });
    }

    async initializeRenderer() {
        const src = this.element.src || this.element.querySelector('source')?.src;

        if (!src) {
            throw new Error('No media source found');
        }

        // Store original source for audio description toggling
        if (!this.originalSrc) {
            this.originalSrc = src;
        }

        // Detect media type
        let renderer;

        if (src.includes('youtube.com') || src.includes('youtu.be')) {
            renderer = YouTubeRenderer;
        } else if (src.includes('vimeo.com')) {
            renderer = VimeoRenderer;
        } else if (src.includes('.m3u8')) {
            renderer = HLSRenderer;
        } else {
            renderer = HTML5Renderer;
        }

        this.log(`Using ${renderer.name} renderer`);
        this.renderer = new renderer(this);
        await this.renderer.init();
    }

    /**
     * Load new media source (for playlists)
     * @param {Object} config - Media configuration
     * @param {string} config.src - Media source URL
     * @param {string} config.type - Media MIME type
     * @param {string} [config.poster] - Poster image URL
     * @param {Array} [config.tracks] - Text tracks (captions, chapters, etc.)
     */
    async load(config) {
        try {
            this.log('Loading new media:', config.src);

            // Pause current playback
            if (this.renderer) {
                this.pause();
            }

            // Clear existing text tracks
            const existingTracks = this.element.querySelectorAll('track');
            existingTracks.forEach(track => track.remove());

            // Update media element
            this.element.src = config.src;

            if (config.type) {
                this.element.type = config.type;
            }

            if (config.poster && this.element.tagName === 'VIDEO') {
                this.element.poster = config.poster;
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

                    this.element.appendChild(track);
                });
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
                this.element.load();
            }

            // Reinitialize caption manager to pick up new tracks
            if (this.captionManager) {
                this.captionManager.destroy();
                this.captionManager = new CaptionManager(this);
            }
            
            // Reinitialize transcript manager to pick up new tracks
            if (this.transcriptManager) {
                const wasVisible = this.transcriptManager.isVisible;
                this.transcriptManager.destroy();
                this.transcriptManager = new TranscriptManager(this);
                
                // Restore visibility state if transcript was open
                if (wasVisible) {
                    this.transcriptManager.showTranscript();
                }
            }
            
            // Update control bar to show/hide feature buttons based on new tracks
            if (this.controlBar) {
                this.updateControlBar();
            }

            this.emit('sourcechange', config);
            this.log('Media loaded successfully');

        } catch (error) {
            this.handleError(error);
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
    }
    
    shouldChangeRenderer(src) {
        if (!this.renderer) return true;

        const isYouTube = src.includes('youtube.com') || src.includes('youtu.be');
        const isVimeo = src.includes('vimeo.com');
        const isHLS = src.includes('.m3u8');

        const currentRendererName = this.renderer.constructor.name;

        if (isYouTube && currentRendererName !== 'YouTubeRenderer') return true;
        if (isVimeo && currentRendererName !== 'VimeoRenderer') return true;
        if (isHLS && currentRendererName !== 'HLSRenderer') return true;
        if (!isYouTube && !isVimeo && !isHLS && currentRendererName !== 'HTML5Renderer') return true;

        return false;
    }

    // Playback controls
    play() {
        if (this.renderer) {
            this.renderer.play();
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

        if (newVolume > 0 && this.state.muted) {
            this.state.muted = false;
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

        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        this.state.fullscreen = true;
        this.container.classList.add(`${this.options.classPrefix}-fullscreen`);
        this.emit('fullscreenchange', true);
    }

    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
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

    // Audio Description
    async enableAudioDescription() {
        if (!this.audioDescriptionSrc) {
            console.warn('VidPly: No audio description source provided');
            return;
        }

        // Store current playback state
        const currentTime = this.state.currentTime;
        const wasPlaying = this.state.playing;

        // Switch to audio-described version
        this.element.src = this.audioDescriptionSrc;

        // Wait for new source to load
        await new Promise((resolve) => {
            const onLoadedMetadata = () => {
                this.element.removeEventListener('loadedmetadata', onLoadedMetadata);
                resolve();
            };
            this.element.addEventListener('loadedmetadata', onLoadedMetadata);
        });

        // Restore playback position
        this.seek(currentTime);

        if (wasPlaying) {
            this.play();
        }

        this.state.audioDescriptionEnabled = true;
        this.emit('audiodescriptionenabled');
    }

    async disableAudioDescription() {
        if (!this.originalSrc) {
            return;
        }

        // Store current playback state
        const currentTime = this.state.currentTime;
        const wasPlaying = this.state.playing;

        // Switch back to original version
        this.element.src = this.originalSrc;

        // Wait for new source to load
        await new Promise((resolve) => {
            const onLoadedMetadata = () => {
                this.element.removeEventListener('loadedmetadata', onLoadedMetadata);
                resolve();
            };
            this.element.addEventListener('loadedmetadata', onLoadedMetadata);
        });

        // Restore playback position
        this.seek(currentTime);

        if (wasPlaying) {
            this.play();
        }

        this.state.audioDescriptionEnabled = false;
        this.emit('audiodescriptiondisabled');
    }

    async toggleAudioDescription() {
        // Check if we have description tracks or audio-described video
        const textTracks = Array.from(this.element.textTracks || []);
        const descriptionTrack = textTracks.find(track => track.kind === 'descriptions');
        
        if (descriptionTrack) {
            // Toggle description track
            if (descriptionTrack.mode === 'showing') {
                descriptionTrack.mode = 'hidden';
                this.state.audioDescriptionEnabled = false;
                this.emit('audiodescriptiondisabled');
            } else {
                descriptionTrack.mode = 'showing';
                this.state.audioDescriptionEnabled = true;
                this.emit('audiodescriptionenabled');
            }
        } else if (this.audioDescriptionSrc) {
            // Use audio-described video source
            if (this.state.audioDescriptionEnabled) {
                await this.disableAudioDescription();
            } else {
                await this.enableAudioDescription();
            }
        }
    }

    // Sign Language
    enableSignLanguage() {
        if (!this.signLanguageSrc) {
            console.warn('No sign language video source provided');
            return;
        }

        if (this.signLanguageWrapper) {
            // Already exists, just show it
            this.signLanguageWrapper.style.display = 'block';
            this.state.signLanguageEnabled = true;
            this.emit('signlanguageenabled');
            return;
        }

        // Create wrapper container
        this.signLanguageWrapper = document.createElement('div');
        this.signLanguageWrapper.className = 'vidply-sign-language-wrapper';
        this.signLanguageWrapper.setAttribute('tabindex', '0');
        this.signLanguageWrapper.setAttribute('aria-label', 'Sign Language Video - Press D to drag with keyboard, R to resize');

        // Create sign language video element
        this.signLanguageVideo = document.createElement('video');
        this.signLanguageVideo.className = 'vidply-sign-language-video';
        this.signLanguageVideo.src = this.signLanguageSrc;
        this.signLanguageVideo.setAttribute('aria-label', i18n.t('player.signLanguage'));
        this.signLanguageVideo.muted = true; // Sign language video should be muted

        // Create resize handles
        const resizeHandles = ['nw', 'ne', 'sw', 'se'].map(dir => {
            const handle = document.createElement('div');
            handle.className = `vidply-sign-resize-handle vidply-sign-resize-${dir}`;
            handle.setAttribute('data-direction', dir);
            handle.setAttribute('aria-label', `Resize ${dir.toUpperCase()}`);
            return handle;
        });

        // Append video and handles to wrapper
        this.signLanguageWrapper.appendChild(this.signLanguageVideo);
        resizeHandles.forEach(handle => this.signLanguageWrapper.appendChild(handle));

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

        this.state.signLanguageEnabled = true;
        this.emit('signlanguageenabled');
    }

    disableSignLanguage() {
        if (this.signLanguageWrapper) {
            this.signLanguageWrapper.style.display = 'none';
        }
        this.state.signLanguageEnabled = false;
        this.emit('signlanguagedisabled');
    }

    toggleSignLanguage() {
        if (this.state.signLanguageEnabled) {
            this.disableSignLanguage();
        } else {
            this.enableSignLanguage();
        }
    }

    setupSignLanguageInteraction() {
        if (!this.signLanguageWrapper) return;

        let isDragging = false;
        let isResizing = false;
        let resizeDirection = null;
        let startX = 0;
        let startY = 0;
        let startLeft = 0;
        let startTop = 0;
        let startWidth = 0;
        let startHeight = 0;
        let dragMode = false;
        let resizeMode = false;

        // Mouse drag on video element
        const onMouseDownVideo = (e) => {
            if (e.target !== this.signLanguageVideo) return;
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.signLanguageWrapper.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            this.signLanguageWrapper.classList.add('vidply-sign-dragging');
        };

        // Mouse resize on handles
        const onMouseDownHandle = (e) => {
            if (!e.target.classList.contains('vidply-sign-resize-handle')) return;
            e.preventDefault();
            e.stopPropagation();
            isResizing = true;
            resizeDirection = e.target.getAttribute('data-direction');
            startX = e.clientX;
            startY = e.clientY;
            const rect = this.signLanguageWrapper.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            startWidth = rect.width;
            startHeight = rect.height;
            this.signLanguageWrapper.classList.add('vidply-sign-resizing');
        };

        const onMouseMove = (e) => {
            if (isDragging) {
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                // Get videoWrapper and container dimensions
                const videoWrapperRect = this.videoWrapper.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                const wrapperRect = this.signLanguageWrapper.getBoundingClientRect();
                
                // Calculate videoWrapper position relative to container
                const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
                const videoWrapperTop = videoWrapperRect.top - containerRect.top;
                
                // Calculate new position (in client coordinates)
                let newLeft = startLeft + deltaX - containerRect.left;
                let newTop = startTop + deltaY - containerRect.top;
                
                const controlsHeight = 95; // Height of controls when visible
                
                // Constrain to videoWrapper bounds (ensuring it stays above controls)
                newLeft = Math.max(videoWrapperLeft, Math.min(newLeft, videoWrapperLeft + videoWrapperRect.width - wrapperRect.width));
                newTop = Math.max(videoWrapperTop, Math.min(newTop, videoWrapperTop + videoWrapperRect.height - wrapperRect.height - controlsHeight));
                
                this.signLanguageWrapper.style.left = `${newLeft}px`;
                this.signLanguageWrapper.style.top = `${newTop}px`;
                this.signLanguageWrapper.style.right = 'auto';
                this.signLanguageWrapper.style.bottom = 'auto';
                // Remove position classes
                this.signLanguageWrapper.classList.remove(...Array.from(this.signLanguageWrapper.classList).filter(c => c.startsWith('vidply-sign-position-')));
            } else if (isResizing) {
                const deltaX = e.clientX - startX;
                
                // Get videoWrapper and container dimensions
                const videoWrapperRect = this.videoWrapper.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                
                let newWidth = startWidth;
                let newLeft = startLeft - containerRect.left;

                // Only resize width, let height auto-adjust to maintain aspect ratio
                if (resizeDirection.includes('e')) {
                    newWidth = Math.max(150, startWidth + deltaX);
                    // Constrain width to not exceed videoWrapper right edge
                    const maxWidth = (videoWrapperRect.right - startLeft);
                    newWidth = Math.min(newWidth, maxWidth);
                }
                if (resizeDirection.includes('w')) {
                    const proposedWidth = Math.max(150, startWidth - deltaX);
                    const proposedLeft = startLeft + (startWidth - proposedWidth) - containerRect.left;
                    // Constrain to not go beyond videoWrapper left edge
                    const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
                    if (proposedLeft >= videoWrapperLeft) {
                        newWidth = proposedWidth;
                        newLeft = proposedLeft;
                    }
                }

                this.signLanguageWrapper.style.width = `${newWidth}px`;
                this.signLanguageWrapper.style.height = 'auto'; // Let video maintain aspect ratio
                if (resizeDirection.includes('w')) {
                    this.signLanguageWrapper.style.left = `${newLeft}px`;
                }
                this.signLanguageWrapper.style.right = 'auto';
                this.signLanguageWrapper.style.bottom = 'auto';
                // Remove position classes
                this.signLanguageWrapper.classList.remove(...Array.from(this.signLanguageWrapper.classList).filter(c => c.startsWith('vidply-sign-position-')));
            }
        };

        const onMouseUp = () => {
            if (isDragging || isResizing) {
                this.saveSignLanguagePreferences();
            }
            isDragging = false;
            isResizing = false;
            resizeDirection = null;
            this.signLanguageWrapper.classList.remove('vidply-sign-dragging', 'vidply-sign-resizing');
        };

        // Keyboard controls
        const onKeyDown = (e) => {
            // Toggle drag mode with D key
            if (e.key === 'd' || e.key === 'D') {
                dragMode = !dragMode;
                resizeMode = false;
                this.signLanguageWrapper.classList.toggle('vidply-sign-keyboard-drag', dragMode);
                this.signLanguageWrapper.classList.remove('vidply-sign-keyboard-resize');
                e.preventDefault();
                return;
            }

            // Toggle resize mode with R key
            if (e.key === 'r' || e.key === 'R') {
                resizeMode = !resizeMode;
                dragMode = false;
                this.signLanguageWrapper.classList.toggle('vidply-sign-keyboard-resize', resizeMode);
                this.signLanguageWrapper.classList.remove('vidply-sign-keyboard-drag');
                e.preventDefault();
                return;
            }

            // Escape to exit modes
            if (e.key === 'Escape') {
                dragMode = false;
                resizeMode = false;
                this.signLanguageWrapper.classList.remove('vidply-sign-keyboard-drag', 'vidply-sign-keyboard-resize');
                e.preventDefault();
                return;
            }

            // Arrow keys for drag/resize
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const step = e.shiftKey ? 10 : 5;
                const rect = this.signLanguageWrapper.getBoundingClientRect();
                
                // Get videoWrapper and container bounds
                const videoWrapperRect = this.videoWrapper.getBoundingClientRect();
                const containerRect = this.container.getBoundingClientRect();
                
                // Calculate videoWrapper position relative to container
                const videoWrapperLeft = videoWrapperRect.left - containerRect.left;
                const videoWrapperTop = videoWrapperRect.top - containerRect.top;

                if (dragMode) {
                    // Get current position relative to container
                    let left = rect.left - containerRect.left;
                    let top = rect.top - containerRect.top;

                    if (e.key === 'ArrowLeft') left -= step;
                    if (e.key === 'ArrowRight') left += step;
                    if (e.key === 'ArrowUp') top -= step;
                    if (e.key === 'ArrowDown') top += step;

                    const controlsHeight = 95; // Height of controls when visible
                    
                    // Constrain to videoWrapper bounds (ensuring it stays above controls)
                    left = Math.max(videoWrapperLeft, Math.min(left, videoWrapperLeft + videoWrapperRect.width - rect.width));
                    top = Math.max(videoWrapperTop, Math.min(top, videoWrapperTop + videoWrapperRect.height - rect.height - controlsHeight));

                    this.signLanguageWrapper.style.left = `${left}px`;
                    this.signLanguageWrapper.style.top = `${top}px`;
                    this.signLanguageWrapper.style.right = 'auto';
                    this.signLanguageWrapper.style.bottom = 'auto';
                    // Remove position classes
                    this.signLanguageWrapper.classList.remove(...Array.from(this.signLanguageWrapper.classList).filter(c => c.startsWith('vidply-sign-position-')));
                    this.saveSignLanguagePreferences();
                    e.preventDefault();
                } else if (resizeMode) {
                    let width = rect.width;

                    // Only adjust width, height will auto-adjust to maintain aspect ratio
                    if (e.key === 'ArrowLeft') width -= step;
                    if (e.key === 'ArrowRight') width += step;
                    // Up/Down also adjusts width for simplicity
                    if (e.key === 'ArrowUp') width += step;
                    if (e.key === 'ArrowDown') width -= step;

                    // Constrain width
                    width = Math.max(150, width);
                    // Don't let it exceed videoWrapper width
                    width = Math.min(width, videoWrapperRect.width);

                    this.signLanguageWrapper.style.width = `${width}px`;
                    this.signLanguageWrapper.style.height = 'auto';
                    this.saveSignLanguagePreferences();
                    e.preventDefault();
                }
            }
        };

        // Attach event listeners
        this.signLanguageVideo.addEventListener('mousedown', onMouseDownVideo);
        const handles = this.signLanguageWrapper.querySelectorAll('.vidply-sign-resize-handle');
        handles.forEach(handle => handle.addEventListener('mousedown', onMouseDownHandle));
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        this.signLanguageWrapper.addEventListener('keydown', onKeyDown);

        // Store for cleanup
        this.signLanguageInteractionHandlers = {
            mouseDownVideo: onMouseDownVideo,
            mouseDownHandle: onMouseDownHandle,
            mouseMove: onMouseMove,
            mouseUp: onMouseUp,
            keyDown: onKeyDown,
            handles
        };
    }

    constrainSignLanguagePosition() {
        if (!this.signLanguageWrapper || !this.videoWrapper) return;
        
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

    saveSignLanguagePreferences() {
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
        // Remove event listeners
        if (this.signLanguageHandlers) {
            this.off('play', this.signLanguageHandlers.play);
            this.off('pause', this.signLanguageHandlers.pause);
            this.off('timeupdate', this.signLanguageHandlers.timeupdate);
            this.off('ratechange', this.signLanguageHandlers.ratechange);
            this.signLanguageHandlers = null;
        }

        // Remove interaction handlers
        if (this.signLanguageInteractionHandlers) {
            if (this.signLanguageVideo) {
                this.signLanguageVideo.removeEventListener('mousedown', this.signLanguageInteractionHandlers.mouseDownVideo);
            }
            if (this.signLanguageInteractionHandlers.handles) {
                this.signLanguageInteractionHandlers.handles.forEach(handle => {
                    handle.removeEventListener('mousedown', this.signLanguageInteractionHandlers.mouseDownHandle);
                });
            }
            document.removeEventListener('mousemove', this.signLanguageInteractionHandlers.mouseMove);
            document.removeEventListener('mouseup', this.signLanguageInteractionHandlers.mouseUp);
            if (this.signLanguageWrapper) {
                this.signLanguageWrapper.removeEventListener('keydown', this.signLanguageInteractionHandlers.keyDown);
            }
            this.signLanguageInteractionHandlers = null;
        }

        // Remove video and wrapper elements
        if (this.signLanguageWrapper && this.signLanguageWrapper.parentNode) {
            if (this.signLanguageVideo) {
                this.signLanguageVideo.pause();
                this.signLanguageVideo.src = '';
            }
            this.signLanguageWrapper.parentNode.removeChild(this.signLanguageWrapper);
            this.signLanguageWrapper = null;
            this.signLanguageVideo = null;
        }
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
        this.log('Error:', error, 'error');
        this.emit('error', error);

        if (this.options.onError) {
            this.options.onError.call(this, error);
        }
    }

    // Logging
    log(message, type = 'log') {
        if (this.options.debug) {
            console[type](`[VidPly]`, message);
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
                    this.transcriptManager.positionTranscript();
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
                        this.transcriptManager.positionTranscript();
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
                }
                
                this.emit('fullscreenchange', isFullscreen);
                
                // Update fullscreen button icon
                if (this.controlBar) {
                    this.controlBar.updateFullscreenButton();
                }
                
                // Reposition sign language video after fullscreen transition
                if (this.signLanguageWrapper && this.signLanguageWrapper.style.display !== 'none') {
                    // Use setTimeout to ensure layout has updated after fullscreen transition
                    // Longer delay to account for CSS transition animations and layout recalculation
                    setTimeout(() => {
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

        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.element, this.container);
            this.container.parentNode.removeChild(this.container);
        }

        this.removeAllListeners();
    }
}

// Static instances tracker for pause others functionality
Player.instances = [];

