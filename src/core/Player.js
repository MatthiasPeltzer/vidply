/**
 * VidPly - Universal Video Player
 * Main Player Class
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { DOMUtils } from '../utils/DOMUtils.js';
import { TimeUtils } from '../utils/TimeUtils.js';
import { ControlBar } from '../controls/ControlBar.js';
import { CaptionManager } from '../controls/CaptionManager.js';
import { KeyboardManager } from '../controls/KeyboardManager.js';
import { SettingsDialog } from '../controls/SettingsDialog.js';
import { TranscriptManager } from '../controls/TranscriptManager.js';
import { HTML5Renderer } from '../renderers/HTML5Renderer.js';
import { YouTubeRenderer } from '../renderers/YouTubeRenderer.js';
import { VimeoRenderer } from '../renderers/VimeoRenderer.js';
import { HLSRenderer } from '../renderers/HLSRenderer.js';
import { i18n } from '../i18n/i18n.js';

export class Player extends EventEmitter {
  constructor(element, options = {}) {
    super();
    
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    if (!this.element) {
      throw new Error('VidPly: Element not found');
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
      pipButton: true,
      
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
        'seek-forward': ['ArrowRight', 'f'],
        'seek-backward': ['ArrowLeft', 'r'],
        'seek-forward-large': ['l'],
        'seek-backward-large': ['j'],
        'mute': ['m'],
        'fullscreen': ['f'],
        'captions': ['c'],
        'speed-up': ['>'],
        'speed-down': ['<'],
        'settings': ['s']
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
      
      // Set language
      i18n.setLanguage(this.options.language);
      
      // Create container
      this.createContainer();
      
      // Detect and initialize renderer
      await this.initializeRenderer();
      
      // Create controls
      if (this.options.controls) {
        this.controlBar = new ControlBar(this);
        this.container.appendChild(this.controlBar.element);
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
      
      // Initialize settings dialog
      if (this.options.settingsButton) {
        this.settingsDialog = new SettingsDialog(this);
      }
      
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

  createContainer() {
    // Create main container
    this.container = DOMUtils.createElement('div', {
      className: `${this.options.classPrefix}-player`,
      attributes: {
        'role': 'region',
        'aria-label': i18n.t('player.label'),
        'tabindex': '-1'
      }
    });

    // Add media type class
    const mediaType = this.element.tagName.toLowerCase();
    this.container.classList.add(`${this.options.classPrefix}-${mediaType}`);

    // Add responsive class
    if (this.options.responsive) {
      this.container.classList.add(`${this.options.classPrefix}-responsive`);
    }

    // Wrap original element
    this.element.parentNode.insertBefore(this.container, this.element);
    this.container.insertBefore(this.element, this.container.firstChild);
    
    // Hide original element
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    
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
  }

  getVolume() {
    return this.state.volume;
  }

  mute() {
    if (this.renderer) {
      this.renderer.setMuted(true);
    }
    this.state.muted = true;
  }

  unmute() {
    if (this.renderer) {
      this.renderer.setMuted(false);
    }
    this.state.muted = false;
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
    this.emit('playbackspeedchange', newSpeed);
  }

  getPlaybackSpeed() {
    return this.state.playbackSpeed;
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
    if (this.state.audioDescriptionEnabled) {
      await this.disableAudioDescription();
    } else {
      await this.enableAudioDescription();
    }
  }

  // Sign Language
  enableSignLanguage() {
    if (!this.signLanguageSrc) {
      console.warn('No sign language video source provided');
      return;
    }

    if (this.signLanguageVideo) {
      // Already exists, just show it
      this.signLanguageVideo.style.display = 'block';
      this.state.signLanguageEnabled = true;
      this.emit('signlanguageenabled');
      return;
    }

    // Create sign language video element
    this.signLanguageVideo = document.createElement('video');
    this.signLanguageVideo.className = 'vidply-sign-language-video';
    this.signLanguageVideo.src = this.signLanguageSrc;
    this.signLanguageVideo.setAttribute('aria-label', this.i18n.t('signLanguageVideo'));
    
    // Set position based on options
    const position = this.options.signLanguagePosition || 'bottom-right';
    this.signLanguageVideo.classList.add(`vidply-sign-position-${position}`);
    
    // Sync with main video
    this.signLanguageVideo.muted = true; // Sign language video should be muted
    this.signLanguageVideo.currentTime = this.state.currentTime;
    if (!this.state.paused) {
      this.signLanguageVideo.play();
    }

    // Add to container
    this.container.appendChild(this.signLanguageVideo);

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
    if (this.signLanguageVideo) {
      this.signLanguageVideo.style.display = 'none';
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

  cleanupSignLanguage() {
    // Remove event listeners
    if (this.signLanguageHandlers) {
      this.off('play', this.signLanguageHandlers.play);
      this.off('pause', this.signLanguageHandlers.pause);
      this.off('timeupdate', this.signLanguageHandlers.timeupdate);
      this.off('ratechange', this.signLanguageHandlers.ratechange);
      this.signLanguageHandlers = null;
    }

    // Remove video element
    if (this.signLanguageVideo && this.signLanguageVideo.parentNode) {
      this.signLanguageVideo.pause();
      this.signLanguageVideo.src = '';
      this.signLanguageVideo.parentNode.removeChild(this.signLanguageVideo);
      this.signLanguageVideo = null;
    }
  }

  // Settings
  showSettings() {
    if (this.settingsDialog) {
      this.settingsDialog.show();
    }
  }

  hideSettings() {
    if (this.settingsDialog) {
      this.settingsDialog.hide();
    }
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
    
    if (this.settingsDialog) {
      this.settingsDialog.destroy();
    }
    
    if (this.transcriptManager) {
      this.transcriptManager.destroy();
    }
    
    // Cleanup sign language video and listeners
    this.cleanupSignLanguage();
    
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

