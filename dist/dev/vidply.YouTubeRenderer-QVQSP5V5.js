/*!
 * VidPly v1.2.17 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  loadScriptOnce
} from "./vidply.chunk-JZSIQF5G.js";
import {
  isIOS,
  isLikelyUnsupportedYoutubeEmbedHost,
  shouldUseYoutubeIosLanFallback
} from "./vidply.chunk-KH7YUEQO.js";

// src/renderers/YouTubeRenderer.ts
var YouTubeRenderer = class _YouTubeRenderer {
  rendererType = "youtube";
  player;
  media;
  youtube;
  videoId;
  isReady;
  iframe;
  timeUpdateInterval;
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.youtube = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }
  /** origin + widget_referrer for YouTube's embed client-identity checks (iOS). */
  static embedIdentityPlayerVars() {
    if (typeof window === "undefined" || isLikelyUnsupportedYoutubeEmbedHost()) {
      return {};
    }
    const vars = {};
    if (window.location?.origin) {
      vars.origin = window.location.origin;
    }
    if (window.location?.href) {
      vars.widget_referrer = window.location.href;
    }
    return vars;
  }
  static applyEmbedReferrerPolicy(youtube) {
    const iframe = youtube?.getIframe?.();
    if (iframe instanceof HTMLIFrameElement) {
      iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    }
  }
  showIosLanFallback() {
    this.player.element.style.display = "none";
    this.iframe = document.createElement("div");
    this.iframe.className = "vidply-youtube-ios-lan-fallback-host";
    this.iframe.style.width = "100%";
    this.iframe.style.maxHeight = "100%";
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
    const wrap = document.createElement("div");
    wrap.className = "vidply-youtube-ios-lan-fallback";
    const videoId = this.videoId ?? "";
    const pageLang = (document.documentElement.lang || "").toLowerCase();
    const linkLabel = pageLang.startsWith("de") ? "Video in YouTube abspielen" : "Play video in YouTube";
    const hint = pageLang.startsWith("de") ? "Der eingebettete Player ist auf dem iPhone bei Entwicklungs-Adressen (LAN, IP, sslip.io, DDEV, …) nicht verfügbar. Bitte YouTube öffnen." : "The embedded player is not available on iPhone on development URLs (LAN, IP, sslip.io, DDEV, …). Please open YouTube.";
    const openLink = document.createElement("a");
    openLink.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    openLink.className = "vidply-youtube-ios-lan-fallback__link";
    openLink.target = "_blank";
    openLink.rel = "noopener noreferrer";
    openLink.textContent = linkLabel;
    const message = document.createElement("p");
    message.className = "vidply-youtube-ios-lan-fallback__hint";
    message.textContent = hint;
    wrap.appendChild(openLink);
    wrap.appendChild(message);
    this.iframe.appendChild(wrap);
    this.isReady = true;
    if (this.player.container) {
      this.player.container.classList.add("vidply-external-controls");
    }
    this.player.emit("loadedmetadata");
  }
  async init() {
    const src = this.player.currentSource || this.player.element.src;
    this.videoId = this.extractVideoId(src);
    if (!this.videoId) {
      throw new Error("Invalid YouTube URL");
    }
    if (shouldUseYoutubeIosLanFallback()) {
      this.showIosLanFallback();
      return;
    }
    await this.loadYouTubeAPI();
    this.createIframe();
    await this.initializePlayer();
  }
  extractVideoId(url) {
    const id = "([^&?#/\\s]+)";
    const host = "(?:youtube\\.com|youtube-nocookie\\.com)";
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
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }
    return loadScriptOnce("https://www.youtube.com/iframe_api", {
      isReady: () => Boolean(window.YT && window.YT.Player),
      readyTimeout: 8e3
    });
  }
  createIframe() {
    this.player.element.style.display = "none";
    this.iframe = document.createElement("div");
    this.iframe.id = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = "100%";
    this.iframe.style.maxHeight = "100%";
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }
  async initializePlayer() {
    return new Promise((resolve, reject) => {
      if (!window.YT || !this.iframe) {
        reject(new Error("YouTube IFrame API is not available"));
        return;
      }
      this.youtube = new window.YT.Player(this.iframe.id, {
        videoId: this.videoId ?? void 0,
        width: "100%",
        height: "100%",
        playerVars: {
          controls: 1,
          // Use YouTube native controls
          disablekb: 0,
          // Allow keyboard controls
          fs: 1,
          // Allow fullscreen
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
          // iOS rejects programmatic/autoplay starts inside cross-origin embeds; leave
          // the video cued so the visitor starts it with a tap on YouTube's control.
          autoplay: isIOS() ? 0 : this.player.options.autoplay ? 1 : 0,
          mute: this.player.options.muted ? 1 : 0,
          start: this.player.options.startTime || 0,
          ..._YouTubeRenderer.embedIdentityPlayerVars()
        },
        events: {
          onReady: (_event) => {
            this.isReady = true;
            _YouTubeRenderer.applyEmbedReferrerPolicy(this.youtube);
            this.attachEvents();
            if (this.player.container) {
              this.player.container.classList.add("vidply-external-controls");
            }
            resolve();
          },
          onStateChange: (event) => this.handleStateChange(event),
          onError: (event) => this.handleError(event)
        }
      });
    });
  }
  attachEvents() {
    this.timeUpdateInterval = setInterval(() => {
      const youtube2 = this.youtube;
      if (this.isReady && youtube2) {
        const currentTime = youtube2.getCurrentTime();
        const duration = youtube2.getDuration();
        this.player.state.currentTime = currentTime;
        this.player.state.duration = duration;
        this.player.emit("timeupdate", currentTime);
      }
    }, 250);
    const youtube = this.youtube;
    if (youtube && youtube.getDuration) {
      this.player.state.duration = youtube.getDuration();
      this.player.emit("loadedmetadata");
    }
  }
  handleStateChange(event) {
    const states = window.YT?.PlayerState;
    if (!states) return;
    switch (event.data) {
      case states.PLAYING:
        this.player.state.playing = true;
        this.player.state.paused = false;
        this.player.state.ended = false;
        this.player.state.buffering = false;
        this.player.emit("play");
        this.player.emit("playing");
        if (this.player.options.onPlay) {
          this.player.options.onPlay.call(this.player);
        }
        break;
      case states.PAUSED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.emit("pause");
        if (this.player.options.onPause) {
          this.player.options.onPause.call(this.player);
        }
        break;
      case states.ENDED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        this.player.state.ended = true;
        this.player.emit("ended");
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
        this.player.emit("waiting");
        break;
      case states.CUED:
        this.player.emit("loadedmetadata");
        break;
    }
  }
  handleError(event) {
    const errors = {
      2: "Invalid video ID",
      5: "HTML5 player error",
      100: "Video not found",
      101: "Video not allowed to be played in embedded players",
      150: "Video not allowed to be played in embedded players"
    };
    const error = new Error(errors[event.data] || "YouTube player error");
    this.player.handleError(error);
  }
  /**
   * Switch to another YouTube video without recreating the iframe player.
   * Used by playlist track changes when the renderer type stays `youtube`.
   */
  loadSource(src) {
    const videoId = this.extractVideoId(src);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }
    if (videoId === this.videoId) {
      return;
    }
    this.videoId = videoId;
    this.player.currentSource = src;
    if (this.isReady && this.youtube) {
      this.youtube.cueVideoById(videoId);
    }
  }
  play() {
    if (this.isReady && this.youtube) {
      this.youtube.playVideo();
    }
  }
  pause() {
    if (this.isReady && this.youtube) {
      this.youtube.pauseVideo();
    }
  }
  seek(time) {
    if (this.isReady && this.youtube) {
      this.youtube.seekTo(time, true);
    }
  }
  setVolume(volume) {
    if (this.isReady && this.youtube) {
      this.youtube.setVolume(volume * 100);
      this.player.state.volume = volume;
    }
  }
  setMuted(muted) {
    if (this.isReady && this.youtube) {
      if (muted) {
        this.youtube.mute();
      } else {
        this.youtube.unMute();
      }
      this.player.state.muted = muted;
    }
  }
  setPlaybackSpeed(speed) {
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
    if (this.player.element) {
      this.player.element.style.display = "";
    }
  }
};
export {
  YouTubeRenderer
};
//# sourceMappingURL=vidply.YouTubeRenderer-QVQSP5V5.js.map
