/**
 * Pseudo-fullscreen fallback for browsers / platforms (chiefly iOS
 * Safari) where the real Fullscreen API is unavailable for video
 * elements.
 *
 * Extracted from the Player class so the scroll-lock, background-inert
 * and viewport-hijack logic lives in one focussed place. The Player
 * still owns `state.fullscreen` and emits the `fullscreenchange`
 * events — this controller only drives the DOM side effects.
 */
import type { Player } from './Player.js';
export declare class PseudoFullscreenController {
    private readonly player;
    private originalScrollX?;
    private originalScrollY?;
    private originalBodyOverflow?;
    private originalBodyPosition?;
    private originalBodyWidth?;
    private originalBodyHeight?;
    private originalHtmlOverflow?;
    private originalBodyBackground?;
    private originalHtmlBackground?;
    private originalViewport?;
    private inertElements;
    constructor(player: Player);
    enable(): void;
    /**
     * Make every sibling of the player container (walking up to the body)
     * `inert`. Scripts/styles are skipped so layout-time mutations still
     * work. Elements that were already inert are left alone so we don't
     * accidentally clear another author's inert marker on exit.
     *
     * Public because the real Fullscreen API handler also calls it — we
     * need the same inert treatment when the browser grants real
     * fullscreen, not only in the pseudo-fallback path.
     */
    makeBackgroundInert(): void;
    /** Public counterpart of {@link makeBackgroundInert}. */
    restoreBackgroundInteractivity(): void;
    disable(): void;
}
//# sourceMappingURL=PseudoFullscreen.d.ts.map