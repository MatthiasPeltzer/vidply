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

export class PseudoFullscreenController {
  private readonly player: Player;

  // All of the "remember current style / scroll / viewport" slots used
  // to restore state on exit. Kept private so the rest of the code
  // base cannot poke into them.
  private originalScrollX?: number;
  private originalScrollY?: number;
  private originalBodyOverflow?: string;
  private originalBodyPosition?: string;
  private originalBodyWidth?: string;
  private originalBodyHeight?: string;
  private originalHtmlOverflow?: string;
  private originalBodyBackground?: string;
  private originalHtmlBackground?: string;
  private originalViewport?: string | null;
  private inertElements: Element[] = [];

  constructor(player: Player) {
    this.player = player;
  }

  enable(): void {
    const { player } = this;
    player.state.fullscreen = true;
    player.container.classList.add(`${player.options.classPrefix}-fullscreen`);

    // CSS fallback for browsers without :has() support.
    document.body.classList.add('vidply-fullscreen-active');

    // Stash the current scroll position so we can restore it on exit.
    this.originalScrollX = window.scrollX || window.pageXOffset;
    this.originalScrollY = window.scrollY || window.pageYOffset;

    // Prevent body/html from scrolling while the player covers the viewport.
    this.originalBodyOverflow = document.body.style.overflow;
    this.originalBodyPosition = document.body.style.position;
    this.originalBodyWidth = document.body.style.width;
    this.originalBodyHeight = document.body.style.height;
    this.originalHtmlOverflow = document.documentElement.style.overflow;
    this.originalBodyBackground = document.body.style.background;
    this.originalHtmlBackground = document.documentElement.style.background;

    document.body.style.overflow = 'hidden';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.body.style.background = '#000';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.background = '#000';

    // iOS: reset the viewport scale so the player fills the screen, but never
    // disable user scaling. Setting maximum-scale=1.0 / user-scalable=no would
    // block pinch-zoom and fail WCAG 1.4.4 (Resize Text) and 1.4.10 (Reflow).
    this.originalViewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content');
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');
    }

    // Scroll to top on iOS to prevent positioning issues.
    window.scrollTo(0, 0);

    // Make the rest of the page inert so keyboard focus cannot escape
    // to background content that is visually covered but still alive.
    this.makeBackgroundInert();

    player.emit('fullscreenchange', true);
    player.emit('enterfullscreen');
  }

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
  makeBackgroundInert(): void {
    this.inertElements = [];
    let current: HTMLElement | null = this.player.container;
    while (current && current !== document.body && current !== document.documentElement) {
      const parentElement: HTMLElement | null = current.parentElement;
      if (parentElement) {
        Array.from(parentElement.children).forEach((sibling: Element) => {
          if (
            sibling !== current &&
            sibling.nodeType === Node.ELEMENT_NODE &&
            !sibling.hasAttribute('inert') &&
            sibling.tagName !== 'SCRIPT' &&
            sibling.tagName !== 'STYLE' &&
            sibling.tagName !== 'LINK' &&
            sibling.tagName !== 'META'
          ) {
            sibling.setAttribute('inert', '');
            this.inertElements.push(sibling);
          }
        });
      }
      current = parentElement;
    }
  }

  /** Public counterpart of {@link makeBackgroundInert}. */
  restoreBackgroundInteractivity(): void {
    if (this.inertElements.length > 0) {
      for (const el of this.inertElements) {
        el.removeAttribute('inert');
      }
      this.inertElements = [];
    }
  }

  disable(): void {
    document.body.classList.remove('vidply-fullscreen-active');

    this.restoreBackgroundInteractivity();

    if (this.originalBodyOverflow !== undefined) {
      document.body.style.overflow = this.originalBodyOverflow;
      this.originalBodyOverflow = undefined;
    }
    if (this.originalBodyPosition !== undefined) {
      document.body.style.position = this.originalBodyPosition;
      this.originalBodyPosition = undefined;
    }
    if (this.originalBodyWidth !== undefined) {
      document.body.style.width = this.originalBodyWidth;
      this.originalBodyWidth = undefined;
    }
    if (this.originalBodyHeight !== undefined) {
      document.body.style.height = this.originalBodyHeight;
      this.originalBodyHeight = undefined;
    }
    if (this.originalHtmlOverflow !== undefined) {
      document.documentElement.style.overflow = this.originalHtmlOverflow;
      this.originalHtmlOverflow = undefined;
    }
    if (this.originalBodyBackground !== undefined) {
      document.body.style.background = this.originalBodyBackground;
      this.originalBodyBackground = undefined;
    }
    if (this.originalHtmlBackground !== undefined) {
      document.documentElement.style.background = this.originalHtmlBackground;
      this.originalHtmlBackground = undefined;
    }

    if (this.originalViewport !== undefined) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport && this.originalViewport !== null) {
        viewport.setAttribute('content', this.originalViewport);
      }
      this.originalViewport = undefined;
    }

    if (this.originalScrollX !== undefined && this.originalScrollY !== undefined) {
      window.scrollTo(this.originalScrollX, this.originalScrollY);
      this.originalScrollX = undefined;
      this.originalScrollY = undefined;
    }

    this.player.emit('exitfullscreen');
  }
}
