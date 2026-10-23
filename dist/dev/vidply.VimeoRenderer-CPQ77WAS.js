/*!
 * VidPly v1.2.24 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  applyChromelessIdlePosterFromElement,
  applyPosterImageToVideoWrapper,
  clearEmbedIdleCover,
  setEmbedIdleCover
} from "./vidply.chunk-H55VMYX5.js";
import {
  loadScriptOnce
} from "./vidply.chunk-BDL2XSJF.js";
import "./vidply.chunk-RUHYLTQC.js";
import {
  isIOS
} from "./vidply.chunk-A2QVHDUC.js";

// src/utils/VimeoEmbedAspectRatio.ts
async function syncVimeoEmbedAspectRatio(player, vimeo) {
  if (typeof vimeo.getVideoWidth !== "function" || typeof vimeo.getVideoHeight !== "function") {
    return;
  }
  try {
    const [width, height] = await Promise.all([
      vimeo.getVideoWidth(),
      vimeo.getVideoHeight()
    ]);
    player.setEmbedAspectRatio(width, height);
  } catch {
  }
}

// src/utils/VimeoThumbnailPoster.ts
async function resolveVimeoThumbnailPosterUrl(videoId) {
  if (!videoId || typeof fetch !== "function") {
    return null;
  }
  const pageUrl = `https://vimeo.com/${encodeURIComponent(videoId)}`;
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`;
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return typeof data.thumbnail_url === "string" && data.thumbnail_url.length > 0 ? data.thumbnail_url : null;
  } catch {
    return null;
  }
}

// src/renderers/VimeoRenderer.ts
var VimeoRenderer = class {
  rendererType = "vimeo";
  player;
  media;
  vimeo;
  videoId;
  isReady;
  iframe;
  constructor(player) {
    this.player = player;
    this.media = player.element;
    this.vimeo = null;
    this.videoId = null;
    this.isReady = false;
    this.iframe = null;
  }
  async init() {
    const src = this.player.currentSource || this.player.element.src;
    this.videoId = this.extractVideoId(src);
    if (!this.videoId) {
      throw new Error("Invalid Vimeo URL");
    }
    this.player.syncEmbedChromeClass("vimeo");
    try {
      await this.loadVimeoAPI();
      this.createIframe();
      await this.initializePlayer();
    } catch (error) {
      this.clearEmbedChromeClassesOnInitFailure();
      throw error;
    }
  }
  clearEmbedChromeClassesOnInitFailure() {
    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.remove(`${prefix}-external-controls`);
    this.player.container?.classList.remove(`${prefix}-embed-chrome-vidply`);
  }
  usesProviderChrome() {
    return this.player.usesProviderNativeChrome("vimeo");
  }
  chromelessEmbedActive() {
    return !this.usesProviderChrome();
  }
  applyChromelessIdlePoster() {
    applyChromelessIdlePosterFromElement(this.player);
    void this.applyVimeoThumbnailIdlePoster();
  }
  async applyVimeoThumbnailIdlePoster() {
    const videoId = this.videoId;
    if (!videoId || !this.chromelessEmbedActive()) {
      return;
    }
    const hasPoster = this.player.element.getAttribute("poster") ?? (typeof this.player.options.poster === "string" ? this.player.options.poster : null);
    if (hasPoster) {
      return;
    }
    const thumbnailUrl = await resolveVimeoThumbnailPosterUrl(videoId);
    if (!thumbnailUrl || videoId !== this.videoId) {
      return;
    }
    applyPosterImageToVideoWrapper(this.player, thumbnailUrl);
  }
  setVimeoIdleCover(active) {
    if (!this.chromelessEmbedActive()) {
      return;
    }
    if (active) {
      this.applyChromelessIdlePoster();
    }
    setEmbedIdleCover(this.player, active);
  }
  extractVideoId(url) {
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
    if (window.Vimeo && window.Vimeo.Player) {
      return Promise.resolve();
    }
    return loadScriptOnce("https://player.vimeo.com/api/player.js", {
      isReady: () => Boolean(window.Vimeo && window.Vimeo.Player)
    });
  }
  createIframe() {
    this.player.element.style.display = "none";
    if (this.chromelessEmbedActive()) {
      this.setVimeoIdleCover(true);
    } else {
      this.player.clearVideoPosterForExternalEmbed?.();
    }
    this.iframe = document.createElement("div");
    this.iframe.id = `vimeo-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe.style.width = "100%";
    this.iframe.style.maxHeight = "100%";
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }
  async initializePlayer() {
    const providerChrome = this.usesProviderChrome();
    const options = {
      id: this.videoId,
      width: "100%",
      height: "100%",
      controls: providerChrome,
      autoplay: isIOS() ? false : this.player.options.autoplay,
      muted: this.player.options.muted,
      loop: this.player.options.loop,
      keyboard: false,
      // Do Not Track: no session data or analytics cookies from the embed.
      dnt: true
    };
    if (this.player.options.startTime > 0) {
      options.startTime = this.player.options.startTime;
    }
    if (!window.Vimeo || !this.iframe) {
      throw new Error("Vimeo Player API is not available");
    }
    this.vimeo = new window.Vimeo.Player(this.iframe.id, options);
    await this.vimeo.ready();
    this.isReady = true;
    const vimeoIframe = this.iframe?.querySelector("iframe");
    if (vimeoIframe) {
      vimeoIframe.style.width = "100%";
      vimeoIframe.style.height = "100%";
      vimeoIframe.setAttribute("width", "100%");
      vimeoIframe.setAttribute("height", "100%");
    }
    this.player.syncEmbedChromeClass("vimeo");
    this.attachEvents();
    try {
      const duration = await this.vimeo.getDuration();
      this.player.state.duration = duration;
      this.player.emit("loadedmetadata");
    } catch (error) {
      this.player.log("Error getting duration:", error, "warn");
    }
    void this.player.captionManager?.refreshTracks();
    void syncVimeoEmbedAspectRatio(this.player, this.vimeo);
  }
  attachEvents() {
    const vimeo = this.vimeo;
    if (!vimeo) return;
    vimeo.on("play", () => {
      this.player.state.playing = true;
      this.player.state.paused = false;
      this.player.state.ended = false;
      if (!this.usesProviderChrome()) {
        this.setVimeoIdleCover(false);
        this.player.setEmbedChromeReproducing(true);
      }
      this.player.emit("play");
      if (this.player.options.onPlay) {
        this.player.options.onPlay.call(this.player);
      }
    });
    vimeo.on("pause", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      if (!this.usesProviderChrome()) {
        this.player.setEmbedChromeReproducing(false);
      }
      this.player.emit("pause");
      if (this.player.options.onPause) {
        this.player.options.onPause.call(this.player);
      }
    });
    vimeo.on("ended", () => {
      this.player.state.playing = false;
      this.player.state.paused = true;
      this.player.state.ended = true;
      this.player.emit("ended");
      if (this.player.options.onEnded) {
        this.player.options.onEnded.call(this.player);
      }
    });
    vimeo.on("timeupdate", (...args) => {
      const data = args[0];
      this.player.state.currentTime = data.seconds;
      this.player.state.duration = data.duration;
      this.player.emit("timeupdate", data.seconds);
      if (this.player.options.onTimeUpdate) {
        this.player.options.onTimeUpdate.call(this.player, data.seconds);
      }
    });
    vimeo.on("volumechange", (...args) => {
      const data = args[0];
      this.player.state.volume = data.volume;
      this.player.emit("volumechange", data.volume);
    });
    vimeo.on("bufferstart", () => {
      this.player.state.buffering = true;
      this.player.emit("waiting");
    });
    vimeo.on("bufferend", () => {
      this.player.state.buffering = false;
      this.player.emit("canplay");
    });
    vimeo.on("seeking", () => {
      this.player.state.seeking = true;
      this.player.emit("seeking");
    });
    vimeo.on("seeked", () => {
      this.player.state.seeking = false;
      this.player.emit("seeked");
    });
    vimeo.on("playbackratechange", (...args) => {
      const data = args[0];
      this.player.state.playbackSpeed = data.playbackRate;
      this.player.emit("ratechange", data.playbackRate);
    });
    vimeo.on("error", (...args) => {
      const error = args[0];
      this.player.handleError(new Error(`Vimeo error: ${error?.message ?? "unknown"}`));
    });
    vimeo.on("texttrackchange", () => {
      void this.player.captionManager?.refreshTracks();
    });
  }
  /**
   * Switch to another Vimeo video without recreating the embed player.
   */
  async loadSource(src) {
    const videoId = this.extractVideoId(src);
    if (!videoId) {
      throw new Error("Invalid Vimeo URL");
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
      this.vimeo.play().catch((error) => {
        this.player.log("Play error:", error, "warn");
      });
    }
  }
  pause() {
    if (this.isReady && this.vimeo) {
      this.vimeo.pause().catch((error) => {
        this.player.log("Pause error:", error, "warn");
      });
    }
  }
  seek(time) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setCurrentTime(time).catch((error) => {
        this.player.log("Seek error:", error, "warn");
      });
    }
  }
  setVolume(volume) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setVolume(volume).catch((error) => {
        this.player.log("Volume error:", error, "warn");
      });
      this.player.state.volume = volume;
    }
  }
  setMuted(muted) {
    if (this.isReady && this.vimeo) {
      if (muted) {
        this.vimeo.setVolume(0);
      } else {
        this.vimeo.setVolume(this.player.state.volume);
      }
      this.player.state.muted = muted;
    }
  }
  setPlaybackSpeed(speed) {
    if (this.isReady && this.vimeo) {
      this.vimeo.setPlaybackRate(speed).catch((error) => {
        this.player.log("Playback rate error:", error, "warn");
      });
      this.player.state.playbackSpeed = speed;
    }
  }
  handlesOwnCaptions() {
    return !this.usesProviderChrome();
  }
  async getEmbedCaptionTracks() {
    const vimeo = this.vimeo;
    if (!vimeo?.getTextTracks || this.usesProviderChrome()) {
      return [];
    }
    try {
      const tracks = await vimeo.getTextTracks();
      return tracks.filter((track) => track.kind === "captions" || track.kind === "subtitles").map((track) => ({
        id: `${track.language}|${track.kind}`,
        language: track.language,
        label: track.label || track.language
      }));
    } catch {
      return [];
    }
  }
  async setEmbedCaptionTrack(trackId) {
    const vimeo = this.vimeo;
    if (!vimeo || this.usesProviderChrome()) {
      return;
    }
    if (trackId === null) {
      await vimeo.disableTextTrack();
      return;
    }
    const [language, kind] = trackId.split("|");
    if (language) {
      await vimeo.enableTextTrack(language, kind || "captions");
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
    if (this.player.element) {
      this.player.element.style.display = "";
    }
  }
};
export {
  VimeoRenderer
};
//# sourceMappingURL=vidply.VimeoRenderer-CPQ77WAS.js.map
