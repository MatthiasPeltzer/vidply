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

import { PseudoFullscreenController } from './PseudoFullscreen.js';
import type { ControlBar } from '../controls/ControlBar.js';
import type { Player } from './Player.js';

export class ResponsiveManager {
  private readonly player: Player;
  private orientationQuery: MediaQueryList | null = null;
  private orientationHandler: ((e: MediaQueryListEvent) => void) | null = null;

  constructor(player: Player) {
    this.player = player;
  }

  setup(): void {
    this.setupResizeTracking();
    this.setupOrientationTracking();
    this.setupFullscreenTracking();
  }

  private setupResizeTracking(): void {
    const player = this.player;

    if (typeof ResizeObserver !== 'undefined') {
      // Preferred path: ResizeObserver fires per-container, not per-viewport,
      // so multiple players on one page don't stomp on each other.
      player.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;

          const controlBar = player.controlBar as (ControlBar & {
            updateControlsForViewport?: (w: number) => void
          }) | null;
          if (controlBar && typeof controlBar.updateControlsForViewport === 'function') {
            controlBar.updateControlsForViewport(width);
          }

          if (player.transcriptManager && player.transcriptManager.isVisible) {
            player.transcriptManager.positionTranscript();
          }
        }
      });

      player.resizeObserver.observe(player.container);
      return;
    }

    // Fallback: `window.resize`. We still respect
    // `draggableResizable.manuallyPositioned` so we don't stomp on a
    // user-chosen transcript location.
    player.resizeHandler = () => {
      const width = player.container.clientWidth;

      const controlBar = player.controlBar as (ControlBar & {
        updateControlsForViewport?: (w: number) => void
      }) | null;
      if (controlBar && typeof controlBar.updateControlsForViewport === 'function') {
        controlBar.updateControlsForViewport(width);
      }

      if (player.transcriptManager && player.transcriptManager.isVisible) {
        if (!player.transcriptManager.draggableResizable
          || !player.transcriptManager.draggableResizable.manuallyPositioned) {
          player.transcriptManager.positionTranscript();
        }
      }
    };

    window.addEventListener('resize', player.resizeHandler, { signal: player.lifecycleSignal });
  }

  private setupOrientationTracking(): void {
    const player = this.player;
    if (!window.matchMedia) return;

    this.orientationHandler = () => {
      // Wait for layout to settle before we recompute positions —
      // otherwise `getBoundingClientRect` still reflects the
      // pre-rotation viewport.
      setTimeout(() => {
        if (player.transcriptManager && player.transcriptManager.isVisible) {
          if (!player.transcriptManager.draggableResizable
            || !player.transcriptManager.draggableResizable.manuallyPositioned) {
            player.transcriptManager.positionTranscript();
          }
        }
      }, 100);
    };

    const orientationQuery = window.matchMedia('(orientation: portrait)');
    if (orientationQuery.addEventListener) {
      // Modern MediaQueryList supports AddEventListenerOptions including
      // `signal`, so teardown happens automatically via the player's
      // lifecycle AbortController.
      orientationQuery.addEventListener('change', this.orientationHandler, {
        signal: player.lifecycleSignal
      });
    } else if ((orientationQuery as MediaQueryList).addListener) {
      // Older Safari: no signal support; `cleanup()` will remove this
      // explicitly below.
      (orientationQuery as MediaQueryList).addListener(this.orientationHandler);
    }

    this.orientationQuery = orientationQuery;
    // Mirror the field onto the player too; some older call sites
    // reach for `player.orientationQuery` directly.
    player.orientationQuery = orientationQuery;
    player.orientationHandler = this.orientationHandler;
  }

  private setupFullscreenTracking(): void {
    const player = this.player;

    player.fullscreenChangeHandler = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        mozFullScreenElement?: Element | null;
        msFullscreenElement?: Element | null;
      };
      const isFullscreen = Boolean(
        document.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );

      if (player.state.fullscreen === isFullscreen) return;

      player.state.fullscreen = isFullscreen;

      if (!player.pseudoFullscreen) {
        player.pseudoFullscreen = new PseudoFullscreenController(player);
      }

      if (isFullscreen) {
        player.container.classList.add(`${player.options.classPrefix}-fullscreen`);
        // CSS fallback for browsers without :has() support.
        document.body.classList.add('vidply-fullscreen-active');
        // Make background content inert even in real-fullscreen mode —
        // the overlay still leaves DOM focus reachable on some browsers.
        player.pseudoFullscreen.makeBackgroundInert();
      } else {
        player.container.classList.remove(`${player.options.classPrefix}-fullscreen`);
        document.body.classList.remove('vidply-fullscreen-active');
        player.pseudoFullscreen.restoreBackgroundInteractivity();
        player._disablePseudoFullscreen();
      }

      player.emit('fullscreenchange', isFullscreen);

      if (player.controlBar) {
        player.controlBar.updateFullscreenButton();
      }

      // Reposition the sign-language overlay after the transition
      // completes; drag/resize affordances differ between windowed
      // and fullscreen on mobile so we re-install them.
      if (player.signLanguageWrapper && player.signLanguageWrapper.style.display !== 'none') {
        const isMobileDevice = window.innerWidth < 768;
        if (isMobileDevice) {
          player.setupSignLanguageInteraction();
        }

        player.setManagedTimeout(() => {
          requestAnimationFrame(() => {
            player.storage.saveSignLanguagePreferences({ size: null });
            if (player.signLanguageWrapper) {
              player.signLanguageWrapper.style.width = isFullscreen ? '400px' : '280px';
            }
            player.constrainSignLanguagePosition();
          });
        }, 500);
      }
    };

    const opts = { signal: player.lifecycleSignal };
    document.addEventListener('fullscreenchange', player.fullscreenChangeHandler, opts);
    document.addEventListener('webkitfullscreenchange', player.fullscreenChangeHandler, opts);
    document.addEventListener('mozfullscreenchange', player.fullscreenChangeHandler, opts);
    document.addEventListener('MSFullscreenChange', player.fullscreenChangeHandler, opts);
  }

  /**
   * Tear down listeners that aren't covered by the Player's
   * lifecycle AbortController. The `window.resize` and
   * `document.fullscreenchange` listeners are already cleaned up
   * via `{signal}`; only the ResizeObserver and old-Safari
   * matchMedia listener need an explicit removal.
   */
  cleanup(): void {
    const player = this.player;

    if (player.resizeObserver) {
      player.resizeObserver.disconnect();
      player.resizeObserver = null;
    }
    player.resizeHandler = null;
    player.fullscreenChangeHandler = null;

    if (this.orientationQuery && this.orientationHandler) {
      if (this.orientationQuery.removeEventListener) {
        this.orientationQuery.removeEventListener('change', this.orientationHandler);
      } else if ((this.orientationQuery as MediaQueryList).removeListener) {
        (this.orientationQuery as MediaQueryList).removeListener(this.orientationHandler);
      }
      this.orientationQuery = null;
      this.orientationHandler = null;
    }
    player.orientationQuery = null;
    player.orientationHandler = null;
  }
}
