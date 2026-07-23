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
import type { Player } from './Player.js';
export declare class PosterManager {
    private readonly player;
    constructor(player: Player);
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
    static toSafeCssPoster(resolved: string | null | undefined): string | null;
    /**
     * Convert a relative poster path into an absolute URL. Absolute URLs
     * (http/https) and root-relative paths (`/foo`) are returned as-is.
     * Falls back to the raw string on any parse error — a malformed URL
     * is still better than throwing and breaking the caller.
     */
    resolvePath(posterPath: string | null | undefined): string;
    /**
     * Capture a frame from the underlying video as a data URL suitable
     * for use as `<video>.poster`. Returns `null` when the element is
     * not a video, the renderer isn't ready, or the capture fails.
     *
     * When the control bar has a hidden "preview video" element (used
     * for the seek hover thumbnail), we prefer that so we don't disturb
     * the user's current playback position.
     */
    generateFromVideo(time?: number): Promise<string | null>;
    /**
     * Auto-generate a poster from the video at the 10-second mark if the
     * content doesn't already have one. No-op for audio elements and for
     * media that ships with a poster attribute or option.
     */
    autoGenerate(): Promise<void>;
    /**
     * Apply the poster as a CSS background on the video wrapper. This is
     * used to keep the poster visible behind the play button when the
     * browser wouldn't render `<video>.poster` itself (e.g. during
     * fallback / transitional states).
     */
    showOverlay(): void;
    hideOverlay(): void;
}
//# sourceMappingURL=PosterManager.d.ts.map