/**
 * Poster / artwork helpers lifted out of Player.
 *
 * The manager owns:
 * - relative -> absolute URL resolution;
 * - the canvas-based "grab a frame from the video as poster" logic;
 * - the `.vidply-forced-poster` overlay that shows the poster while
 *   the underlying `<video>` is in a paused / not-yet-loaded state.
 *
 * Player keeps public delegating methods (`resolvePosterPath`,
 * `showPosterOverlay`, etc.) so the existing external API is
 * unchanged — only the implementation has moved.
 */

import { captureVideoFrame } from '../utils/VideoFrameCapture.js';
import { sanitizePosterUrl, cssEscapeUrl } from '../utils/UrlSafe.js';
import type { Player } from './Player.js';

export class PosterManager {
  private readonly player: Player;

  constructor(player: Player) {
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
  static toSafeCssPoster(resolved: string | null | undefined): string | null {
    if (typeof resolved !== 'string' || !resolved) return null;
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
  resolvePath(posterPath: string | null | undefined): string {
    if (!posterPath) return '';

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
  async generateFromVideo(time = 10): Promise<string | null> {
    const player = this.player;
    if (player.element.tagName !== 'VIDEO') return null;

    const renderer = player.renderer;
    if (!renderer || !renderer.media || renderer.media.tagName !== 'VIDEO') {
      return null;
    }

    const video = renderer.media as HTMLVideoElement;

    if (!video.duration || video.duration < time) {
      time = Math.min(time, Math.max(1, video.duration * 0.1));
    }

    let videoToUse: HTMLVideoElement = video;
    if (player.controlBar && player.controlBar.previewVideo && player.controlBar.previewSupported) {
      videoToUse = player.controlBar.previewVideo as HTMLVideoElement;
    }

    // If we're using the main video we have to put its currentTime /
    // paused state back; for the preview video nobody is watching so
    // we can skip the restore.
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
  async autoGenerate(): Promise<void> {
    const player = this.player;

    const hasPoster =
      player.element.getAttribute('poster') ||
      (player.element as HTMLVideoElement).poster ||
      player.options.poster;

    if (hasPoster) return;
    if (player.element.tagName !== 'VIDEO') return;

    // Wait for metadata so `duration` is known before we seek.
    if (!player.state.duration || player.state.duration === 0) {
      await new Promise<void>((resolve) => {
        const onLoadedMetadata = () => {
          player.element.removeEventListener('loadedmetadata', onLoadedMetadata);
          resolve();
        };

        if (player.element.readyState >= 1) {
          resolve();
        } else {
          player.element.addEventListener('loadedmetadata', onLoadedMetadata);
        }
      });
    }

    const posterDataURL = await this.generateFromVideo(10);

    if (posterDataURL) {
      (player.element as HTMLVideoElement).poster = posterDataURL;
      player.log('Auto-generated poster from video frame at 10 seconds', 'info');
      this.showOverlay();
    }
  }

  /**
   * Apply the poster as a CSS background on the video wrapper. This is
   * used to keep the poster visible behind the play button when the
   * browser wouldn't render `<video>.poster` itself (e.g. during
   * fallback / transitional states).
   */
  showOverlay(): void {
    const player = this.player;
    if (!player.videoWrapper || player.element.tagName !== 'VIDEO') return;

    const poster =
      player.element.getAttribute('poster') ||
      (player.element as HTMLVideoElement).poster ||
      player.options.poster;

    if (!poster) return;

    // Data URLs are already absolute and opaque; only normal URLs need
    // resolving into absolute form for the CSS `url(...)` value.
    const resolvedPoster = poster.startsWith('data:') ? poster : this.resolvePath(poster);
    // Poster values can originate from attacker-influenced data (playlist
    // manifests, data-* attributes), so escape before interpolating: a
    // crafted value like `x"),url("//evil` must not break out of the
    // `url(...)` context. Auto-generated posters are large `data:image`
    // URLs (from a captured video frame) which the allow-list length-caps
    // — those are already opaque, so we only require the `image/*` scheme
    // and lean on `cssEscapeUrl` for the `"`/`(`/`)`/`\` escaping. When
    // the URL fails validation we leave the overlay off entirely.
    const cssPoster = PosterManager.toSafeCssPoster(resolvedPoster);
    if (!cssPoster) return;
    player.videoWrapper.style.setProperty('--vidply-poster-image', cssPoster);
    player.videoWrapper.classList.add('vidply-forced-poster');

    // Audio-as-video content uses a wider aspect ratio so the poster
    // doesn't get stretched into a tall letter-boxed frame.
    if (player._isAudioContent && player.container) {
      player.container.classList.add('vidply-audio-content');
    } else if (player.container) {
      player.container.classList.remove('vidply-audio-content');
    }
  }

  hideOverlay(): void {
    const player = this.player;
    if (!player.videoWrapper) return;

    player.videoWrapper.classList.remove('vidply-forced-poster');
    player.videoWrapper.style.removeProperty('--vidply-poster-image');

    // NOTE: `vidply-audio-content` intentionally stays applied — it
    // drives the aspect ratio for the entire duration of audio-in-a-
    // video-element playback, not just while the poster is visible.
  }
}
