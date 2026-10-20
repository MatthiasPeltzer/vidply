/*!
 * VidPly v1.2.21 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  applyPosterImageToVideoWrapper,
  clearEmbedIdleCover,
  setEmbedIdleCover
} from "./vidply.chunk-MNJDDBCB.js";
import {
  loadScriptOnce
} from "./vidply.chunk-P32UB2BG.js";
import "./vidply.chunk-DWNBQMGZ.js";
import {
  isIOS,
  isLikelyUnsupportedYoutubeEmbedHost,
  shouldUseYoutubeIosLanFallback
} from "./vidply.chunk-4BYV3MA7.js";

// src/utils/YoutubeThumbnailPoster.ts
function youtubeThumbnailUrl(videoId, variant) {
  const id = encodeURIComponent(videoId);
  return `https://i.ytimg.com/vi/${id}/${variant}default.jpg`;
}
function loadThumbnailImage(url, minWidth = 0) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (minWidth > 0 && img.naturalWidth <= minWidth) {
        reject(new Error("YouTube thumbnail too small"));
        return;
      }
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error("YouTube thumbnail has no dimensions"));
        return;
      }
      resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error("YouTube thumbnail failed to load"));
    img.src = url;
  });
}
function loadThumbnailCandidate(url, minWidth = 0) {
  return loadThumbnailImage(url, minWidth).then((result) => result.url);
}
async function resolveYoutubeThumbnailPosterUrl(videoId) {
  if (!videoId) {
    return null;
  }
  try {
    return await loadThumbnailCandidate(youtubeThumbnailUrl(videoId, "maxres"), 121);
  } catch {
  }
  try {
    return await loadThumbnailCandidate(youtubeThumbnailUrl(videoId, "sd"), 121);
  } catch {
  }
  try {
    return await loadThumbnailCandidate(youtubeThumbnailUrl(videoId, "hq"));
  } catch {
    return null;
  }
}
async function resolveYoutubeThumbnailDimensions(videoId) {
  if (!videoId) {
    return null;
  }
  for (const variant of ["maxres", "sd", "hq"]) {
    try {
      const loaded = await loadThumbnailImage(youtubeThumbnailUrl(videoId, variant), variant === "maxres" ? 121 : 0);
      return { width: loaded.width, height: loaded.height };
    } catch {
    }
  }
  return null;
}
function youtubeChromelessCropRecommended(width, height) {
  if (width <= 0 || height <= 0) {
    return true;
  }
  const ratio = width / height;
  return ratio > 1.55 && ratio < 1.85;
}

// src/utils/YoutubeEmbedAspectRatio.ts
async function syncYoutubeEmbedAspectRatio(player, videoId, host) {
  if (!videoId) {
    return;
  }
  const dimensions = await resolveYoutubeThumbnailDimensions(videoId);
  if (!dimensions) {
    return;
  }
  player.setEmbedAspectRatio(dimensions.width, dimensions.height);
  if (!host) {
    return;
  }
  const prefix = player.options.classPrefix;
  const useCrop = youtubeChromelessCropRecommended(dimensions.width, dimensions.height);
  host.classList.toggle(`${prefix}-youtube-chromeless-crop`, useCrop);
}

// src/renderers/YouTubeRenderer.ts
var YouTubeRenderer = class _YouTubeRenderer {
  rendererType = "youtube";
  player;
  media;
  youtube;
  videoId;
  isReady;
  iframe;
  /** Inner mount node passed to `YT.Player` when chromeless crop wrapper is used. */
  youtubeMount = null;
  timeUpdateInterval;
  endScreenPreempted = false;
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
  /**
   * Chromeless mode: VidPly owns keyboard focus. Keep the cross-origin iframe
   * out of the tab order and assistive-tech traversal (YouTube still injects
   * links/overlays inside the frame).
   */
  applyChromelessEmbedAccessibility() {
    const providerChrome = this.usesProviderChrome();
    const host = this.iframe;
    const iframe = this.youtube?.getIframe?.();
    if (host) {
      if (providerChrome) {
        host.removeAttribute("inert");
      } else {
        host.setAttribute("inert", "");
      }
    }
    if (iframe instanceof HTMLIFrameElement) {
      if (providerChrome) {
        iframe.removeAttribute("tabindex");
        iframe.removeAttribute("aria-hidden");
      } else {
        iframe.setAttribute("tabindex", "-1");
        iframe.setAttribute("aria-hidden", "true");
      }
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
    this.player._forceProviderEmbedChrome = true;
    this.player.syncEmbedChromeClass("youtube");
    this.player.emit("loadedmetadata");
  }
  usesProviderChrome() {
    return this.player.usesProviderNativeChrome("youtube");
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
    this.player.syncEmbedChromeClass("youtube");
    try {
      await this.loadYouTubeAPI();
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
  chromelessEmbedActive() {
    return !this.usesProviderChrome();
  }
  /** YouTube captions never render: VidPly only shows its own sidecar WebVTT tracks. */
  disableInFrameCaptions() {
    const youtube = this.youtube;
    if (!youtube) {
      return;
    }
    try {
      youtube.setOption?.("captions", "track", {});
      youtube.unloadModule?.("captions");
    } catch {
    }
  }
  refreshSidecarCaptionControls() {
    void Promise.resolve(this.player.captionManager?.refreshTracks()).then(() => {
      this.player.controlBar?.syncCaptionControlsFromTracks();
    });
  }
  syncChromelessHostClasses(ready) {
    if (!this.chromelessEmbedActive() || !this.iframe) {
      return;
    }
    const prefix = this.player.options.classPrefix;
    this.iframe.classList.add(`${prefix}-youtube-chromeless-host`);
    this.iframe.classList.toggle(`${prefix}-youtube-chromeless-ready`, ready);
    this.player.container?.classList.toggle(`${prefix}-embed-youtube`, ready);
  }
  applyChromelessIdlePoster() {
    const raw = this.player.element.getAttribute("poster") ?? (typeof this.player.options.poster === "string" ? this.player.options.poster : null);
    if (raw) {
      applyPosterImageToVideoWrapper(this.player, this.player.resolvePosterPath(raw));
      return;
    }
    void this.applyYoutubeThumbnailIdlePoster();
  }
  async applyYoutubeThumbnailIdlePoster() {
    const videoId = this.videoId;
    if (!videoId || !this.chromelessEmbedActive()) {
      return;
    }
    const thumbnailUrl = await resolveYoutubeThumbnailPosterUrl(videoId);
    if (!thumbnailUrl || videoId !== this.videoId) {
      return;
    }
    applyPosterImageToVideoWrapper(this.player, thumbnailUrl);
  }
  setYoutubeIdleCover(active) {
    if (!this.chromelessEmbedActive()) {
      return;
    }
    if (active) {
      this.applyChromelessIdlePoster();
    }
    setEmbedIdleCover(this.player, active);
  }
  createIframe() {
    this.player.element.style.display = "none";
    if (this.chromelessEmbedActive()) {
      this.setYoutubeIdleCover(true);
    } else {
      this.player.clearVideoPosterForExternalEmbed?.();
    }
    const prefix = this.player.options.classPrefix;
    const playerId = `youtube-player-${Math.random().toString(36).substr(2, 9)}`;
    this.iframe = document.createElement("div");
    this.iframe.id = playerId;
    this.iframe.style.width = "100%";
    this.iframe.style.maxHeight = "100%";
    if (this.chromelessEmbedActive()) {
      const crop = document.createElement("div");
      crop.className = `${prefix}-youtube-crop`;
      this.youtubeMount = document.createElement("div");
      this.youtubeMount.id = `${playerId}-mount`;
      crop.appendChild(this.youtubeMount);
      this.iframe.appendChild(crop);
    } else {
      this.youtubeMount = null;
    }
    this.syncChromelessHostClasses(false);
    this.player.element.parentNode?.insertBefore(this.iframe, this.player.element);
  }
  youtubePlayerElementId() {
    return this.youtubeMount?.id ?? this.iframe?.id ?? "";
  }
  async initializePlayer() {
    return new Promise((resolve, reject) => {
      const playerElementId = this.youtubePlayerElementId();
      if (!window.YT || !this.iframe || !playerElementId) {
        reject(new Error("YouTube IFrame API is not available"));
        return;
      }
      const providerChrome = this.usesProviderChrome();
      this.youtube = new window.YT.Player(playerElementId, {
        videoId: this.videoId ?? void 0,
        width: "100%",
        height: "100%",
        playerVars: {
          enablejsapi: 1,
          controls: providerChrome ? 1 : 0,
          disablekb: providerChrome ? 0 : 1,
          fs: providerChrome ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          // iOS rejects programmatic/autoplay starts inside cross-origin embeds; leave
          // the video cued so the visitor starts it with a tap on YouTube's control.
          autoplay: isIOS() ? 0 : this.player.options.autoplay ? 1 : 0,
          mute: this.player.options.muted ? 1 : 0,
          start: this.player.options.startTime || 0,
          ...!providerChrome && this.player.options.loop && this.videoId ? { loop: 1, playlist: this.videoId } : {},
          ..._YouTubeRenderer.embedIdentityPlayerVars()
        },
        events: {
          onReady: (_event) => {
            this.isReady = true;
            _YouTubeRenderer.applyEmbedReferrerPolicy(this.youtube);
            this.applyChromelessEmbedAccessibility();
            this.attachEvents();
            this.player.syncEmbedChromeClass("youtube");
            this.syncChromelessHostClasses(true);
            if (this.chromelessEmbedActive()) {
              this.setYoutubeIdleCover(true);
            }
            this.disableInFrameCaptions();
            void syncYoutubeEmbedAspectRatio(this.player, this.videoId, this.iframe);
            this.refreshSidecarCaptionControls();
            resolve();
          },
          // YouTube may load its captions module after ready; switch it off again.
          onApiChange: () => {
            this.disableInFrameCaptions();
          },
          onStateChange: (event) => this.handleStateChange(event),
          onError: (event) => this.handleError(event)
        }
      });
    });
  }
  /**
   * YouTube paints the end-screen before the ENDED event; stop slightly early and
   * restore the VidPly poster cover (Google does not allow disabling that UI).
   */
  maybePreemptYoutubeEndScreen(currentTime, duration) {
    if (this.usesProviderChrome() || !this.youtube || this.endScreenPreempted) {
      return;
    }
    if (this.player.options.loop || duration <= 0) {
      return;
    }
    const remaining = duration - currentTime;
    if (remaining > 0.45 || remaining < 0) {
      return;
    }
    this.endScreenPreempted = true;
    this.youtube.pauseVideo();
    this.youtube.seekTo(0, true);
    this.player.state.playing = false;
    this.player.state.paused = true;
    this.player.state.ended = true;
    this.player.state.currentTime = 0;
    this.setYoutubeIdleCover(true);
    this.player.controlBar?.updatePlayPauseButton();
    this.player.emit("ended");
  }
  attachEvents() {
    this.timeUpdateInterval = setInterval(() => {
      const youtube2 = this.youtube;
      if (this.isReady && youtube2) {
        const currentTime = youtube2.getCurrentTime();
        const duration = youtube2.getDuration();
        this.player.state.currentTime = currentTime;
        this.player.state.duration = duration;
        this.maybePreemptYoutubeEndScreen(currentTime, duration);
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
        if (!this.usesProviderChrome()) {
          this.endScreenPreempted = false;
          this.setYoutubeIdleCover(false);
          this.player.setEmbedChromeReproducing(true);
        }
        this.disableInFrameCaptions();
        this.player.emit("play");
        this.player.emit("playing");
        if (this.player.options.onPlay) {
          this.player.options.onPlay.call(this.player);
        }
        break;
      case states.PAUSED:
        this.player.state.playing = false;
        this.player.state.paused = true;
        if (!this.usesProviderChrome()) {
          this.player.setEmbedChromeReproducing(false);
          this.player.positionPlayOverlayOnMobile();
        }
        this.player.emit("pause");
        if (this.player.options.onPause) {
          this.player.options.onPause.call(this.player);
        }
        break;
      case states.ENDED:
        if (this.endScreenPreempted) {
          this.endScreenPreempted = false;
          break;
        }
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
        } else if (!this.usesProviderChrome() && this.youtube) {
          this.youtube.pauseVideo();
          this.youtube.seekTo(0, true);
          this.player.setEmbedChromeReproducing(false);
          this.setYoutubeIdleCover(true);
          this.player.controlBar?.updatePlayPauseButton();
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
    this.endScreenPreempted = false;
    if (this.isReady && this.youtube) {
      this.youtube.cueVideoById(videoId);
      if (this.chromelessEmbedActive()) {
        this.setYoutubeIdleCover(true);
      }
      void syncYoutubeEmbedAspectRatio(this.player, this.videoId, this.iframe);
      this.refreshSidecarCaptionControls();
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
    if (this.iframe) {
      this.iframe.removeAttribute("inert");
      if (this.iframe.parentNode) {
        this.iframe.parentNode.removeChild(this.iframe);
      }
    }
    this.youtubeMount = null;
    const prefix = this.player.options.classPrefix;
    this.player.container?.classList.remove(`${prefix}-embed-youtube`);
    clearEmbedIdleCover(this.player);
    this.player.setEmbedChromeReproducing(false);
    this.player.clearEmbedAspectRatio?.();
    if (this.player.element) {
      this.player.element.style.display = "";
    }
  }
};
export {
  YouTubeRenderer
};
//# sourceMappingURL=vidply.YouTubeRenderer-M4XEMYRZ.js.map
