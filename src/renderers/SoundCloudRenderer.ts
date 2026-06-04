import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import { loadScriptOnce } from '../utils/ScriptLoader.js';

/**
 * Subset of the SoundCloud Widget event payloads we actually consume.
 * The Widget API is callback-shaped and does not export TS types, so we
 * narrow `unknown` arguments locally as they enter our handlers.
 */
interface SCSoundInfo {
  duration: number;
  title?: string;
}

interface SCProgressData {
  currentPosition: number;
  loadedProgress?: number;
}

interface SCWidgetError {
  message?: string;
}

export class SoundCloudRenderer implements Renderer {
  player: Player;
  media: HTMLMediaElement;
  widget: SCWidget | null;
  trackUrl: string | null;
  isReady: boolean;
  iframe: HTMLIFrameElement | null;
  iframeId: string | null;
  _previousVolume: number;
  // Pending init timeout (rejects after 10s); cleared once READY fires or on
  // destroy so it can't reject / touch a torn-down player afterwards.
  private _initTimeoutId: ReturnType<typeof setTimeout> | null;
  // Detaches the iframe 'load' listener on destroy.
  private _initController: AbortController | null;

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this.widget = null;
    this.trackUrl = null;
    this.isReady = false;
    this.iframe = null;
    this.iframeId = null;
    this._previousVolume = 100;
    this._initTimeoutId = null;
    this._initController = null;
  }

  async init() {
    // Extract track URL - use currentSource which works for external renderers
    this.trackUrl = this.player.currentSource || this.player.element.src || this.player.element.querySelector('source')?.src || null;
    
    if (!this.trackUrl || !this.isValidSoundCloudUrl(this.trackUrl)) {
      throw new Error('Invalid SoundCloud URL');
    }

    // Load SoundCloud Widget API
    await this.loadSoundCloudAPI();

    // Create iframe
    this.createIframe();

    // Initialize widget
    await this.initializeWidget();
  }

  /**
   * Validate a SoundCloud URL by parsing it with the URL constructor and
   * checking the protocol + hostname against an explicit allow-list.
   * Substring checks like `url.includes('soundcloud.com')` accept things
   * like `https://evil.com/?leak=soundcloud.com` or
   * `https://soundcloud.com.attacker.example`.
   */
  isValidSoundCloudUrl(url: string): boolean {
    if (typeof url !== 'string' || !url) return false;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (parsed.protocol !== 'https:') return false;
    const allowedHosts = new Set([
      'soundcloud.com',
      'www.soundcloud.com',
      'm.soundcloud.com',
      'api.soundcloud.com',
      'api-v2.soundcloud.com'
    ]);
    return allowedHosts.has(parsed.hostname.toLowerCase());
  }

  /**
   * Check if URL is a playlist/set
   */
  isPlaylist() {
    return this.trackUrl && this.trackUrl.includes('/sets/');
  }

  /**
   * Extract track/playlist info from URL for embed
   * SoundCloud URLs can be:
   * - https://soundcloud.com/artist/track
   * - https://soundcloud.com/artist/sets/playlist
   * - https://api.soundcloud.com/tracks/123456
   */
  getEmbedUrl() {
    const trackUrl = this.trackUrl;
    if (!trackUrl) {
      throw new Error('SoundCloudRenderer.getEmbedUrl(): trackUrl is not set');
    }
    
    // Build widget URL with parameters
    const params = new URLSearchParams({
      url: trackUrl,
      auto_play: this.player.options.autoplay ? 'true' : 'false',
      hide_related: 'true',
      show_comments: 'false',
      show_user: 'true',
      show_reposts: 'false',
      show_teaser: 'false',
      visual: 'false', // Use classic player for better control
      color: '%23007bff'
    });
    
    return `https://w.soundcloud.com/player/?${params.toString()}`;
  }

  async loadSoundCloudAPI() {
    // Check if API is already loaded
    if (typeof window.SC !== 'undefined') {
      return Promise.resolve();
    }

    // SC.Widget can become available a tick after the script's load event, so
    // resolve via the readiness predicate rather than load alone.
    return loadScriptOnce('https://w.soundcloud.com/player/api.js', {
      isReady: () => typeof window.SC !== 'undefined'
    });
  }

  createIframe() {
    // Hide original element and remove poster (SoundCloud has its own visual widget)
    this.player.element.style.display = 'none';
    this.player.element.removeAttribute('poster');
    
    // Remove poster overlay from video wrapper if present
    if (this.player.videoWrapper) {
      this.player.videoWrapper.classList.remove('vidply-forced-poster');
      this.player.videoWrapper.style.removeProperty('--vidply-poster-image');
    }

    // Generate unique ID for iframe
    this.iframeId = `soundcloud-player-${Math.random().toString(36).substr(2, 9)}`;

    // Create iframe for SoundCloud widget
    this.iframe = document.createElement('iframe');
    this.iframe.id = this.iframeId;
    this.iframe.scrolling = 'no';
    this.iframe.frameBorder = 'no';
    this.iframe.allow = 'autoplay';
    this.iframe.src = this.getEmbedUrl();
    this.iframe.style.width = '100%';
    this.iframe.style.display = 'block';
    
    // Use different aspect ratio for playlists vs single tracks
    // Playlists need more height to show the track list
    if (this.isPlaylist()) {
      this.iframe.classList.add('vidply-soundcloud-iframe', 'vidply-soundcloud-playlist');
    } else {
      this.iframe.classList.add('vidply-soundcloud-iframe');
    }
    this.iframe.style.maxHeight = '100%';
    
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }

  async initializeWidget() {
    return new Promise<void>((resolve, reject) => {
      const iframe = this.iframe;
      if (!iframe || typeof window.SC === 'undefined') {
        reject(new Error('SoundCloud widget cannot initialize'));
        return;
      }

      const SC = window.SC;
      if (!SC) {
        reject(new Error('SoundCloud widget cannot initialize'));
        return;
      }

      // Wait for iframe to load. Registered through an AbortController so
      // destroy() can detach it if init never completes.
      this._initController = new AbortController();
      iframe.addEventListener('load', () => {
        try {
          const widget = SC.Widget(iframe);
          this.widget = widget;

          widget.bind(SC.Widget.Events.READY, () => {
            this.isReady = true;
            // Init succeeded — cancel the pending timeout so it can't reject.
            if (this._initTimeoutId !== null) {
              clearTimeout(this._initTimeoutId);
              this._initTimeoutId = null;
            }
            this.attachEvents();

            // Hide VidPly controls - SoundCloud has its own
            if (this.player.container) {
              this.player.container.classList.add('vidply-external-controls');
            }

            // Get initial sound info
            widget.getCurrentSound((sound: unknown) => {
              const info = sound as SCSoundInfo | null;
              if (info) {
                this.player.state.duration = info.duration / 1000; // ms -> s
                this.player.emit('loadedmetadata');
              }
            });

            resolve();
          });

          widget.bind(SC.Widget.Events.ERROR, (...args: unknown[]) => {
            const error = args[0] as SCWidgetError | undefined;
            this.player.handleError(new Error(`SoundCloud error: ${error?.message || 'Unknown error'}`));
          });
        } catch (error) {
          reject(error);
        }
      }, { signal: this._initController.signal });
      
      // Timeout after 10 seconds
      this._initTimeoutId = setTimeout(() => {
        this._initTimeoutId = null;
        if (!this.isReady) {
          reject(new Error('SoundCloud widget initialization timeout'));
        }
      }, 10000);
    });
  }

  attachEvents() {
    const widget = this.widget;
    const SC = window.SC;
    if (!widget || !SC) return;

    const Events = SC.Widget.Events;

    widget.bind(Events.PLAY, () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      this.player.emit('play');

      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });

    widget.bind(Events.PAUSE, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.emit('pause');

      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });

    widget.bind(Events.FINISH, () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');

      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }

      if (this.player.options.loop) {
        this.seek(0);
        this.play();
      }
    });

    widget.bind(Events.PLAY_PROGRESS, (...args: unknown[]) => {
      const data = args[0] as SCProgressData;
      // data.currentPosition is in milliseconds
      const currentTime = data.currentPosition / 1000;
      this.player.state.currentTime = currentTime;
      this.player.emit('timeupdate', currentTime);

      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, currentTime);
      }
    });

    widget.bind(Events.SEEK, (...args: unknown[]) => {
      const data = args[0] as SCProgressData;
      this.player.state.currentTime = data.currentPosition / 1000;
      this.player.emit('seeked');
    });

    widget.bind(Events.LOAD_PROGRESS, (...args: unknown[]) => {
      const data = args[0] as SCProgressData;
      // data.loadedProgress is 0-1
      if (this.player.state.duration && data.loadedProgress !== undefined) {
        const buffered = data.loadedProgress * this.player.state.duration;
        this.player.emit('progress', buffered);
      }
    });
  }

  play() {
    if (this.isReady && this.widget) {
      // Save scroll position to prevent browser from scrolling
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      this.widget.play();
      
      // Restore scroll position
      window.scrollTo(scrollX, scrollY);
    }
  }

  pause() {
    if (this.isReady && this.widget) {
      this.widget.pause();
    }
  }

  seek(time: number) {
    if (this.isReady && this.widget) {
      // SoundCloud seekTo uses milliseconds
      this.widget.seekTo(time * 1000);
      this.player.state.currentTime = time;
    }
  }

  setVolume(volume: number) {
    if (this.isReady && this.widget) {
      // SoundCloud setVolume expects 0-100
      this.widget.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }

  setMuted(muted: boolean) {
    const widget = this.widget;
    if (this.isReady && widget) {
      // SoundCloud doesn't have a native mute, use volume instead
      if (muted) {
        // Store current volume before muting
        widget.getVolume((vol: number) => {
          this._previousVolume = vol;
          widget.setVolume(0);
        });
      } else {
        widget.setVolume(this._previousVolume || 100);
      }
      this.player.state.muted = muted;
    }
  }

  setPlaybackSpeed(_speed: number) {
    // SoundCloud Widget API doesn't support playback speed
    this.player.log('SoundCloud does not support playback speed control', 'warn');
  }

  /**
   * Get current track info. Returns the raw sound payload from the
   * SoundCloud Widget API (shape is best described as `unknown` since
   * the API exposes many optional fields we don't formally type).
   */
  getCurrentSound(): Promise<unknown | null> {
    return new Promise<unknown | null>((resolve) => {
      if (this.isReady && this.widget) {
        this.widget.getCurrentSound((sound: unknown) => {
          resolve(sound);
        });
      } else {
        resolve(null);
      }
    });
  }

  destroy() {
    // Cancel any pending init timeout and detach the iframe 'load' listener.
    if (this._initTimeoutId !== null) {
      clearTimeout(this._initTimeoutId);
      this._initTimeoutId = null;
    }
    if (this._initController) {
      this._initController.abort();
      this._initController = null;
    }

    // Unbind all events
    if (this.widget && window.SC) {
      const Events = window.SC.Widget.Events;
      try {
        this.widget.unbind(Events.READY);
        this.widget.unbind(Events.PLAY);
        this.widget.unbind(Events.PAUSE);
        this.widget.unbind(Events.FINISH);
        this.widget.unbind(Events.PLAY_PROGRESS);
        this.widget.unbind(Events.SEEK);
        this.widget.unbind(Events.LOAD_PROGRESS);
        this.widget.unbind(Events.ERROR);
      } catch {
        // Ignore unbind errors
      }
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    // Show original element
    if (this.player.element) {
      this.player.element.style.display = '';
    }

    this.widget = null;
    this.isReady = false;
  }
}

export default SoundCloudRenderer;

