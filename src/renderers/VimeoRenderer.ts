import type { EmbedCaptionTrack, Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import {
  applyChromelessIdlePosterFromElement,
  applyPosterImageToVideoWrapper,
  clearEmbedIdleCover,
  setEmbedIdleCover
} from '../utils/EmbedIdleCover.js';
import { loadScriptOnce } from '../utils/ScriptLoader.js';
import { isIOS } from '../utils/PerformanceUtils.js';
import { syncVimeoEmbedAspectRatio } from '../utils/VimeoEmbedAspectRatio.js';
import { resolveVimeoThumbnailPosterUrl } from '../utils/VimeoThumbnailPoster.js';

export class VimeoRenderer implements Renderer {
  readonly rendererType = 'vimeo' as const;
  player: Player;
  media: HTMLMediaElement;
  vimeo: VimeoPlayer | null;
  videoId: string | null;
  isReady: boolean;
  iframe: HTMLDivElement | null;

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this.vimeo = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }

  async init() {
    // Extract video ID from URL - use currentSource which works for external renderers
    const src = this.player.currentSource || this.player.element.src;
    this.videoId = this.extractVideoId(src);
    
    if (!this.videoId) {
      throw new Error('Invalid Vimeo URL');
    }

    this.player.syncEmbedChromeClass('vimeo');

    try {
      // Load Vimeo Player API
      await this.loadVimeoAPI();

      // Create iframe
      this.createIframe();

      // Initialize player
      await this.initializePlayer();
    } catch (error) {
      this.clearEmbedChromeClassesOnInitFailure();
      throw error;
    }
  }

  private clearEmbedChromeClassesOnInitFailure(): void {
    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.remove(`${prefix}-external-controls`);
    this.player.container?.classList.remove(`${prefix}-embed-chrome-vidply`);
  }

  private usesProviderChrome(): boolean {
    return this.player.usesProviderNativeChrome('vimeo');
  }

  private chromelessEmbedActive(): boolean {
    return !this.usesProviderChrome();
  }

  private applyChromelessIdlePoster(): void {
    applyChromelessIdlePosterFromElement(this.player);
    void this.applyVimeoThumbnailIdlePoster();
  }

  private async applyVimeoThumbnailIdlePoster(): Promise<void> {
    const videoId = this.videoId;
    if (!videoId || !this.chromelessEmbedActive()) {
      return;
    }
    const hasPoster = this.player.element.getAttribute('poster')
      ?? (typeof this.player.options.poster === 'string' ? this.player.options.poster : null);
    if (hasPoster) {
      return;
    }

    const thumbnailUrl = await resolveVimeoThumbnailPosterUrl(videoId);
    if (!thumbnailUrl || videoId !== this.videoId) {
      return;
    }

    applyPosterImageToVideoWrapper(this.player, thumbnailUrl);
  }

  private setVimeoIdleCover(active: boolean): void {
    if (!this.chromelessEmbedActive()) {
      return;
    }
    if (active) {
      this.applyChromelessIdlePoster();
    }
    setEmbedIdleCover(this.player, active);
  }

  extractVideoId(url: string) {
    const patterns = [
      /vimeo\.com\/(\d+)/,
      /vimeo\.com\/video\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  async loadVimeoAPI() {
    // Check if API is already loaded
    if (window.Vimeo && window.Vimeo.Player) {
      return Promise.resolve();
    }

    return loadScriptOnce('https://player.vimeo.com/api/player.js', {
      isReady: () => Boolean(window.Vimeo && window.Vimeo.Player)
    });
  }

  createIframe() {
    // Hide original element
    this.player.element.style.display = 'none';
    if (this.chromelessEmbedActive()) {
      this.setVimeoIdleCover(true);
    } else {
      this.player.clearVideoPosterForExternalEmbed?.();
    }

    // Create container for iframe
    this.iframe = document.createElement('div');
    this.iframe.id = `vimeo-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = '100%';
    this.iframe.style.maxHeight = '100%';
    
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }

  async initializePlayer() {
    const providerChrome = this.usesProviderChrome();
    const options: Record<string, unknown> = {
      id: this.videoId,
      width: '100%',
      height: '100%',
      controls: providerChrome,
      autoplay: isIOS() ? false : this.player.options.autoplay,
      muted: this.player.options.muted,
      loop: this.player.options.loop,
      keyboard: false
    };

    if (this.player.options.startTime > 0) {
      options.startTime = this.player.options.startTime;
    }

    if (!window.Vimeo || !this.iframe) {
      // The SDK never became available (or the iframe container is missing).
      // Reject so Player.init() surfaces a real failure instead of treating a
      // non-functional embed as a successful initialization.
      throw new Error('Vimeo Player API is not available');
    }
    this.vimeo = new window.Vimeo.Player(this.iframe.id, options as VimeoPlayerOptions);

    // Wait for player to be ready
    await this.vimeo.ready();
    this.isReady = true;
    
    // Ensure the iframe has 100% width and height
    const vimeoIframe = this.iframe?.querySelector('iframe');
    if (vimeoIframe) {
      vimeoIframe.style.width = '100%';
      vimeoIframe.style.height = '100%';
      vimeoIframe.setAttribute('width', '100%');
      vimeoIframe.setAttribute('height', '100%');
    }
    
    this.player.syncEmbedChromeClass('vimeo');

    this.attachEvents();

    // Get initial duration
    try {
      const duration = await this.vimeo.getDuration();
      this.player.state.duration = duration;
      this.player.emit('loadedmetadata');
    } catch (error) {
      this.player.log('Error getting duration:', error, 'warn');
    }

    void this.player.captionManager?.refreshTracks();
    void syncVimeoEmbedAspectRatio(this.player, this.vimeo);
  }

  attachEvents() {
    const vimeo = this.vimeo;
    if (!vimeo) return;

    // Vimeo's on() callback signature is (...args: unknown[]) => void, so
    // each handler narrows its own payload before reading fields.
    vimeo.on('play', () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      if (!this.usesProviderChrome()) {
        this.setVimeoIdleCover(false);
        this.player.setEmbedChromeReproducing(true);
      }
      this.player.emit('play');

      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });

    vimeo.on('pause', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      if (!this.usesProviderChrome()) {
        this.player.setEmbedChromeReproducing(false);
      }
      this.player.emit('pause');

      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });

    vimeo.on('ended', () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit('ended');

      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
    });

    vimeo.on('timeupdate', (...args: unknown[]) => {
      const data = args[0] as { seconds: number; duration: number };
      this.player.state.currentTime = data.seconds;
      this.player.state.duration = data.duration;
      this.player.emit('timeupdate', data.seconds);

      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, data.seconds);
      }
    });

    vimeo.on('volumechange', (...args: unknown[]) => {
      const data = args[0] as { volume: number };
      this.player.state.volume = data.volume;
      this.player.emit('volumechange', data.volume);
    });

    vimeo.on('bufferstart', () => {
      this.player.state.buffering = true;
      this.player.emit('waiting');
    });

    vimeo.on('bufferend', () => {
      this.player.state.buffering = false;
      this.player.emit('canplay');
    });

    vimeo.on('seeking', () => {
      this.player.state.seeking = true;
      this.player.emit('seeking');
    });

    vimeo.on('seeked', () => {
      this.player.state.seeking = false;
      this.player.emit('seeked');
    });

    vimeo.on('playbackratechange', (...args: unknown[]) => {
      const data = args[0] as { playbackRate: number };
      this.player.state.playbackSpeed = data.playbackRate;
      this.player.emit('ratechange', data.playbackRate);
    });

    vimeo.on('error', (...args: unknown[]) => {
      const error = args[0] as { message?: string } | undefined;
      this.player.handleError(new Error(`Vimeo error: ${error?.message ?? 'unknown'}`));
    });

    vimeo.on('texttrackchange', () => {
      void this.player.captionManager?.refreshTracks();
    });
  }

  /**
   * Switch to another Vimeo video without recreating the embed player.
   */
  async loadSource(src: string) {
    const videoId = this.extractVideoId(src);
    if (!videoId) {
      throw new Error('Invalid Vimeo URL');
    }

    if (videoId === this.videoId) {
      return;
    }

    this.videoId = videoId;
    this.player.currentSource = src;

    if (this.isReady && this.vimeo) {
      await this.vimeo.loadVideo(Number(videoId));
      void syncVimeoEmbedAspectRatio(this.player, this.vimeo);
      if (this.chromelessEmbedActive()) {
        this.setVimeoIdleCover(true);
        void this.applyVimeoThumbnailIdlePoster();
      }
    }
  }

  play() {
    if (this.isReady && this.vimeo) {
      this.vimeo.play().catch((error: unknown) => {
        this.player.log('Play error:', error, 'warn');
      });
    }
  }

  pause() {
    if (this.isReady && this.vimeo) {
      this.vimeo.pause().catch((error: unknown) => {
        this.player.log('Pause error:', error, 'warn');
      });
    }
  }

  seek(time: number) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setCurrentTime(time).catch((error: unknown) => {
        this.player.log('Seek error:', error, 'warn');
      });
    }
  }

  setVolume(volume: number) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setVolume(volume).catch((error: unknown) => {
        this.player.log('Volume error:', error, 'warn');
      });
      this.player.state.volume = volume;
    }
  }

  setMuted(muted: boolean) {
    if (this.isReady && this.vimeo) {
      if (muted) {
        this.vimeo.setVolume(0);
      } else {
        this.vimeo.setVolume(this.player.state.volume);
      }
      this.player.state.muted = muted;
    }
  }

  setPlaybackSpeed(speed: number) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setPlaybackRate(speed).catch((error: unknown) => {
        this.player.log('Playback rate error:', error, 'warn');
      });
      this.player.state.playbackSpeed = speed;
    }
  }

  handlesOwnCaptions(): boolean {
    return !this.usesProviderChrome();
  }

  async getEmbedCaptionTracks(): Promise<EmbedCaptionTrack[]> {
    const vimeo = this.vimeo;
    if (!vimeo?.getTextTracks || this.usesProviderChrome()) {
      return [];
    }
    try {
      const tracks = await vimeo.getTextTracks();
      return tracks
        .filter((track) => track.kind === 'captions' || track.kind === 'subtitles')
        .map((track) => ({
          id: `${track.language}|${track.kind}`,
          language: track.language,
          label: track.label || track.language
        }));
    } catch {
      return [];
    }
  }

  async setEmbedCaptionTrack(trackId: string | null): Promise<void> {
    const vimeo = this.vimeo;
    if (!vimeo || this.usesProviderChrome()) {
      return;
    }
    if (trackId === null) {
      await vimeo.disableTextTrack();
      return;
    }
    const [language, kind] = trackId.split('|');
    if (language) {
      await vimeo.enableTextTrack(language, kind || 'captions');
    }
  }

  destroy() {
    if (this.vimeo && this.vimeo.destroy) {
      this.vimeo.destroy();
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    clearEmbedIdleCover(this.player);
    this.player.setEmbedChromeReproducing?.(false);
    this.player.clearEmbedAspectRatio?.();

    // Show original element
    if (this.player.element) {
      this.player.element.style.display = '';
    }
  }
}

