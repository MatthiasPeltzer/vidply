/**
 * Resize / orientation / fullscreen handling extracted from Player.
 *
 * Three responsibilities live here:
 *
 * 1. Reacting to container size changes (ResizeObserver when
 *    available, `window.resize` fallback otherwise) so the control
 *    bar and the transcript panel stay correctly laid out.
 * 2. Listening for orientation changes on mobile so the transcript
 *    panel re-positions after the viewport rotates.
 * 3. Tracking native fullscreen changes across vendor prefixes so
 *    `state.fullscreen` stays in sync with reality — including the
 *    inert/overlay bookkeeping that's shared with the pseudo-
 *    fullscreen fallback.
 *
 * Every listener is attached with the Player's `lifecycleSignal`
 * (or, for the ResizeObserver / older matchMedia listeners that
 * don't accept AbortSignal, cleaned up explicitly in `cleanup()`).
 */
import type { Player } from './Player.js';
export declare class ResponsiveManager {
    private readonly player;
    private orientationQuery;
    private orientationHandler;
    constructor(player: Player);
    setup(): void;
    private setupResizeTracking;
    private setupOrientationTracking;
    private setupFullscreenTracking;
    /**
     * Tear down listeners that aren't covered by the Player's
     * lifecycle AbortController. The `window.resize` and
     * `document.fullscreenchange` listeners are already cleaned up
     * via `{signal}`; only the ResizeObserver and old-Safari
     * matchMedia listener need an explicit removal.
     */
    cleanup(): void;
}
//# sourceMappingURL=ResponsiveManager.d.ts.map