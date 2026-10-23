/*!
 * VidPly v1.2.24 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/UrlSafe.ts
function sanitizePosterUrl(input) {
  if (typeof input !== "string" || input.length === 0 || input.length > 4096) {
    return null;
  }
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/[\s"'<>\\]/.test(trimmed)) return null;
  if (trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed, typeof window !== "undefined" ? window.location.href : "http://localhost/");
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
    if (url.protocol === "data:" && /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);/i.test(trimmed)) {
      return trimmed;
    }
  } catch {
    return null;
  }
  return null;
}
function cssEscapeUrl(url) {
  return url.replace(/["()\\]/g, (m) => `\\${m}`);
}
function toCssBackgroundImage(input) {
  const safe = sanitizePosterUrl(input);
  if (!safe) return null;
  return `url("${cssEscapeUrl(safe)}")`;
}

// src/utils/VideoFrameCapture.ts
async function captureVideoFrame(video, time, options = {}) {
  if (!video || video.tagName !== "VIDEO") {
    return null;
  }
  const { restoreState = true, quality = 0.9, maxWidth, maxHeight } = options;
  const wasPlaying = !video.paused;
  const originalTime = video.currentTime;
  const originalMuted = video.muted;
  if (restoreState) {
    video.muted = true;
  }
  return new Promise((resolve) => {
    const captureFrame = () => {
      try {
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;
        if (maxWidth && width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        if (maxHeight && height > maxHeight) {
          const ratio = maxHeight / height;
          height = maxHeight;
          width = Math.round(width * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        const dataURL = canvas.toDataURL("image/jpeg", quality);
        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch((e) => {
              if (typeof console !== "undefined" && console.debug) {
                console.debug("[VidPly] preview play() rejected:", e);
              }
            });
          }
        }
        resolve(dataURL);
      } catch (e) {
        if (typeof console !== "undefined" && console.debug) {
          console.debug("[VidPly] frame capture failed:", e);
        }
        if (restoreState) {
          video.currentTime = originalTime;
          video.muted = originalMuted;
          if (wasPlaying && !video.paused) {
            video.play().catch((err) => {
              if (typeof console !== "undefined" && console.debug) {
                console.debug("[VidPly] preview play() rejected:", err);
              }
            });
          }
        }
        resolve(null);
      }
    };
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      requestAnimationFrame(() => {
        requestAnimationFrame(captureFrame);
      });
    };
    const timeDiff = Math.abs(video.currentTime - time);
    if (timeDiff < 0.1 && video.readyState >= 2) {
      captureFrame();
    } else if (video.readyState >= 1) {
      video.addEventListener("seeked", onSeeked);
      video.currentTime = time;
    } else {
      const onLoadedMetadata = () => {
        video.removeEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("seeked", onSeeked);
        video.currentTime = time;
      };
      video.addEventListener("loadedmetadata", onLoadedMetadata);
    }
  });
}

// src/core/PosterManager.ts
var PosterManager = class _PosterManager {
  player;
  constructor(player) {
    this.player = player;
  }
  /**
   * Build a CSS `url("...")` value for a poster that is safe to
   * interpolate into a custom property / `background-image`.
   *
   * - `data:image/*` URLs (e.g. an auto-captured frame) are opaque and
   *   frequently exceed the allow-list length cap, so they bypass
   *   {@link sanitizePosterUrl} but are still CSS-escaped and required to
   *   carry an `image/*` MIME type.
   * - Everything else goes through the poster allow-list.
   *
   * Returns `null` for anything unsafe so callers can skip the overlay.
   */
  static toSafeCssPoster(resolved) {
    if (typeof resolved !== "string" || !resolved) return null;
    if (/^data:/i.test(resolved)) {
      if (!/^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);/i.test(resolved)) return null;
      return `url("${cssEscapeUrl(resolved)}")`;
    }
    const safe = sanitizePosterUrl(resolved);
    if (!safe) return null;
    return `url("${cssEscapeUrl(safe)}")`;
  }
  /**
   * Convert a relative poster path into an absolute URL. Absolute URLs
   * (http/https) and root-relative paths (`/foo`) are returned as-is.
   * Falls back to the raw string on any parse error — a malformed URL
   * is still better than throwing and breaking the caller.
   */
  resolvePath(posterPath) {
    if (!posterPath) return "";
    if (posterPath.match(/^(https?:|\/)/)) {
      return posterPath;
    }
    try {
      const posterUrl = new URL(posterPath, window.location.href);
      return posterUrl.href;
    } catch {
      return posterPath;
    }
  }
  /**
   * Capture a frame from the underlying video as a data URL suitable
   * for use as `<video>.poster`. Returns `null` when the element is
   * not a video, the renderer isn't ready, or the capture fails.
   *
   * When the control bar has a hidden "preview video" element (used
   * for the seek hover thumbnail), we prefer that so we don't disturb
   * the user's current playback position.
   */
  async generateFromVideo(time = 10) {
    const player = this.player;
    if (player.element.tagName !== "VIDEO") return null;
    const renderer = player.renderer;
    if (!renderer || !renderer.media || renderer.media.tagName !== "VIDEO") {
      return null;
    }
    const video = renderer.media;
    if (!video.duration || video.duration < time) {
      time = Math.min(time, Math.max(1, video.duration * 0.1));
    }
    let videoToUse = video;
    if (player.controlBar && player.controlBar.previewVideo && player.controlBar.previewSupported) {
      videoToUse = player.controlBar.previewVideo;
    }
    const restoreState = videoToUse === video;
    return await captureVideoFrame(videoToUse, time, {
      restoreState,
      quality: 0.9
    });
  }
  /**
   * Auto-generate a poster from the video at the 10-second mark if the
   * content doesn't already have one. No-op for audio elements and for
   * media that ships with a poster attribute or option.
   */
  async autoGenerate() {
    const player = this.player;
    const hasPoster = player.element.getAttribute("poster") || player.element.poster || player.options.poster;
    if (hasPoster) return;
    if (player.element.tagName !== "VIDEO") return;
    if (!player.state.duration || player.state.duration === 0) {
      await new Promise((resolve) => {
        const onLoadedMetadata = () => {
          player.element.removeEventListener("loadedmetadata", onLoadedMetadata);
          resolve();
        };
        if (player.element.readyState >= 1) {
          resolve();
        } else {
          player.element.addEventListener("loadedmetadata", onLoadedMetadata);
        }
      });
    }
    const posterDataURL = await this.generateFromVideo(10);
    if (posterDataURL) {
      player.element.poster = posterDataURL;
      player.log("Auto-generated poster from video frame at 10 seconds", "info");
      this.showOverlay();
    }
  }
  /**
   * Apply the poster as a CSS background on the video wrapper. This is
   * used to keep the poster visible behind the play button when the
   * browser wouldn't render `<video>.poster` itself (e.g. during
   * fallback / transitional states).
   */
  showOverlay() {
    const player = this.player;
    if (!player.videoWrapper || player.element.tagName !== "VIDEO") return;
    const poster = player.element.getAttribute("poster") || player.element.poster || player.options.poster;
    if (!poster) return;
    const resolvedPoster = poster.startsWith("data:") ? poster : this.resolvePath(poster);
    const cssPoster = _PosterManager.toSafeCssPoster(resolvedPoster);
    if (!cssPoster) return;
    player.videoWrapper.style.setProperty("--vidply-poster-image", cssPoster);
    player.videoWrapper.classList.add("vidply-forced-poster");
    if (player._isAudioContent && player.container) {
      player.container.classList.add("vidply-audio-content");
    } else if (player.container) {
      player.container.classList.remove("vidply-audio-content");
    }
  }
  hideOverlay() {
    const player = this.player;
    if (!player.videoWrapper) return;
    player.videoWrapper.classList.remove("vidply-forced-poster");
    player.videoWrapper.style.removeProperty("--vidply-poster-image");
  }
};

export {
  captureVideoFrame,
  sanitizePosterUrl,
  cssEscapeUrl,
  toCssBackgroundImage,
  PosterManager
};
//# sourceMappingURL=vidply.chunk-RUHYLTQC.js.map
