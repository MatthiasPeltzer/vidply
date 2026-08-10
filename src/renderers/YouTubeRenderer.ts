import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
import { loadScriptOnce } from '../utils/ScriptLoader.js';

export class YouTubeRenderer implements Renderer {
  readonly rendererType = 'youtube' as const;
  player: Player;
  media: HTMLMediaElement;
  youtube: YTPlayer | null;
  videoId: string | null;
  isReady: boolean;
  iframe: HTMLDivElement | null;
  timeUpdateInterval?: ReturnType<typeof setInterval>;

  constructor(player: Player) {
    this.player = player;
    this.media = player.element;
    this.youtube = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }

  async init() {
    // Extract video ID from URL - use currentSource which works for external renderers
    const src = this.player.currentSource || this.player.element.src;
    this.videoId = this.extractVideoId(src);
    
    if (!this.videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Load YouTube IFrame API
    await this.loadYouTubeAPI();

    // Create iframe
    this.createIframe();

    // Initialize player
    await this.initializePlayer();
  }

  extractVideoId(url: string) {
    // The capture group stops at the first query/hash/path delimiter so a
    // trailing `?t=`, `&list=`, `#…` or extra path segment can't leak into the
    // returned ID (previously `[^&\s]+` swallowed `?…` on youtu.be/embed URLs).
    const id = '([^&?#/\\s]+)';
    const host = '(?:youtube\\.com|youtube-nocookie\\.com)';
    const patterns = [
      // watch URLs — `v` may be any query parameter, not only the first.
      new RegExp(`${host}\\/watch\\?(?:[^\\s]*&)?v=${id}`),
      // Short links.
      new RegExp(`youtu\\.be\\/${id}`),
      // /embed/, /shorts/ and legacy /v/ path forms.
      new RegExp(`${host}\\/(?:embed|shorts|v)\\/${id}`)
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  async loadYouTubeAPI() {
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    // The IFrame API exposes window.YT.Player a short time after its script
    // loads (it signals readiness via the global onYouTubeIframeAPIReady
    // callback). loadScriptOnce dedupes the injection and the readiness
    // predicate polls for YT.Player, also covering the case where the host
    // page already included the API script.
    return loadScriptOnce('https://www.youtube.com/iframe_api', {
      isReady: () => Boolean(window.YT && window.YT.Player),
      readyTimeout: 8000
    });
  }

  createIframe() {
    // Hide original element
    this.player.element.style.display = 'none';

    // Create container for iframe
    this.iframe = document.createElement('div');
    this.iframe.id = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = '100%';
    this.iframe.style.maxHeight = '100%';
    
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }

  async initializePlayer() {
    return new Promise<void>((resolve, reject) => {
      if (!window.YT || !this.iframe) {
        // The SDK never became available (or the iframe container is missing).
        // Reject so Player.init() surfaces a real failure instead of treating
        // a non-functional embed as a successful initialization.
        reject(new Error('YouTube IFrame API is not available'));
        return;
      }
      this.youtube = new window.YT.Player(this.iframe.id, {
        videoId: this.videoId ?? undefined,
        width: '100%',
        height: '100%',
        playerVars: {
          controls: 1, // Use YouTube native controls
          disablekb: 0, // Allow keyboard controls
          fs: 1, // Allow fullscreen
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          autoplay: this.player.options.autoplay ? 1 : 0,
          mute: this.player.options.muted ? 1 : 0,
          start: this.player.options.startTime || 0
        },
        events: {
          onReady: (_event: unknown) => {
            this.isReady = true;
            this.attachEvents();
            // Hide VidPly controls - YouTube has its own
            if (this.player.container) {
              this.player.container.classList.add('vidply-external-controls');
            }
            resolve();
          },
          onStateChange: (event: unknown) => this.handleStateChange(event as { data: number }),
          onError: (event: unknown) => this.handleError(event as { data: 2 | 5 | 100 | 101 | 150 })
        }
      });
    });
  }

  attachEvents() {
    // Set up polling for time updates (YouTube doesn't provide timeupdate events)
    this.timeUpdateInterval = setInterval(() => {
      const youtube = this.youtube;
      if (this.isReady && youtube) {
        const currentTime = youtube.getCurrentTime();
        const duration = youtube.getDuration();

        this.player.state.currentTime = currentTime;
        this.player.state.duration = duration;

        this.player.emit('timeupdate', currentTime);
      }
    }, 250);

    // Initial metadata
    const youtube = this.youtube;
    if (youtube && youtube.getDuration) {
      this.player.state.duration = youtube.getDuration();
      this.player.emit('loadedmetadata');
    }
  }

  handleStateChange(event: { data: number }) {
    const states = window.YT?.PlayerState;
    if (!states) return;

    switch (event.data) {
      case states.PLAYING:
        this.player.state.playing = true;
        this.player.state.paused = false;
        this.player.state.ended = false;
        this.player.state.buffering = false;
        this.player.emit('play');
        this.player.emit('playing');
        
        if (this.player.options.onPlay) {
          this.player.options.onPlay.call(this.player);
        }
        break;

      case states.PAUSED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.emit('pause');
        
        if (this.player.options.onPause) {
          this.player.options.onPause.call(this.player);
        }
        break;

      case states.ENDED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.state.ended = true;
        this.player.emit('ended');

        if (this.player.options.onEnded) {
          this.player.options.onEnded.call(this.player);
        }

        if (this.player.options.loop && this.youtube) {
          this.youtube.seekTo(0);
          this.youtube.playVideo();
        }
        break;

      case states.BUFFERING:
        this.player.state.buffering = true;
        this.player.emit('waiting');
        break;

      case states.CUED:
        this.player.emit('loadedmetadata');
        break;
    }
  }

  handleError(event: { data: 2 | 5 | 100 | 101 | 150 }) {
    const errors = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found',
      101: 'Video not allowed to be played in embedded players',
      150: 'Video not allowed to be played in embedded players'
    };

    const error = new Error(errors[event.data] || 'YouTube player error');
    this.player.handleError(error);
  }

  /**
   * Switch to another YouTube video without recreating the iframe player.
   * Used by playlist track changes when the renderer type stays `youtube`.
   */
  loadSource(src: string) {
    const videoId = this.extractVideoId(src);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    if (videoId === this.videoId) {
      return;
    }

    this.videoId = videoId;
    this.player.currentSource = src;

    if (this.isReady && this.youtube) {
      // Cue only — PlaylistManager / Player.play() starts playback explicitly.
      this.youtube.cueVideoById(videoId);
    }
  }

  play() {
    if (this.isReady && this.youtube) {
      // Save scroll position to prevent browser from scrolling to video
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      
      this.youtube.playVideo();
      
      // Restore scroll position immediately to prevent auto-scroll
      window.scrollTo(scrollX, scrollY);
    }
  }

  pause() {
    if (this.isReady && this.youtube) {
      this.youtube.pauseVideo();
    }
  }

  seek(time: number) {
    if (this.isReady && this.youtube) {
      this.youtube.seekTo(time, true);
    }
  }

  setVolume(volume: number) {
    if (this.isReady && this.youtube) {
      this.youtube.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }

  setMuted(muted: boolean) {
    if (this.isReady && this.youtube) {
      if (muted) {
        this.youtube.mute();
      } else {
        this.youtube.unMute();
      }
      this.player.state.muted = muted;
    }
  }

  setPlaybackSpeed(speed: number) {
    if (this.isReady && this.youtube) {
      this.youtube.setPlaybackRate(speed);
      this.player.state.playbackSpeed = speed;
    }
  }

  destroy() {
    if (this.timeUpdateInterval) {
      clearInterval(this.timeUpdateInterval);
    }

    if (this.youtube && this.youtube.destroy) {
      this.youtube.destroy();
    }

    if (this.iframe && this.iframe.parentNode) {
      this.iframe.parentNode.removeChild(this.iframe);
    }

    // Show original element
    if (this.player.element) {
      this.player.element.style.display = '';
    }
  }
}

