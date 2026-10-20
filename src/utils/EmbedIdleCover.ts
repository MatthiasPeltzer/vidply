import type { Player } from '../core/Player.js';
import { PosterManager } from '../core/PosterManager.js';

export function applyPosterImageToVideoWrapper(player: Player, resolvedUrl: string): void {
  const wrapper = player.videoWrapper;
  if (!wrapper) {
    return;
  }
  const cssPoster = PosterManager.toSafeCssPoster(resolvedUrl);
  if (!cssPoster) {
    return;
  }
  wrapper.style.setProperty('--vidply-poster-image', cssPoster);
  wrapper.classList.add(`${player.options.classPrefix}-forced-poster`);
}

/** Apply `poster` / options poster on the video wrapper for chromeless embed idle state. */
export function applyChromelessIdlePosterFromElement(player: Player): void {
  const raw = player.element.getAttribute('poster')
    ?? (typeof player.options.poster === 'string' ? player.options.poster : null);
  if (!raw) {
    return;
  }
  applyPosterImageToVideoWrapper(player, player.resolvePosterPath(raw));
}

/** Poster + large play overlay until playback starts (YouTube/Vimeo chromeless). */
export function setEmbedIdleCover(player: Player, active: boolean): void {
  const prefix = player.options.classPrefix;
  player.container?.classList.toggle(`${prefix}-embed-idle-cover`, active);
  if (active) {
    player.showPosterOverlay?.();
    const overlayNode = player.getPlayButtonOverlayNode?.();
    if (overlayNode instanceof HTMLElement || overlayNode instanceof SVGSVGElement) {
      overlayNode.style.display = '';
      overlayNode.style.opacity = '1';
      overlayNode.style.pointerEvents = 'auto';
    }
    const overlayButton = player.playButtonOverlayButton;
    if (overlayButton) {
      overlayButton.style.display = '';
      overlayButton.style.opacity = '1';
      overlayButton.style.pointerEvents = 'auto';
    }
  } else {
    player.hidePosterOverlay?.();
    player.syncPlayOverlayVisibility?.();
  }
}

export function clearEmbedIdleCover(player: Player): void {
  player.container?.classList.remove(`${player.options.classPrefix}-embed-idle-cover`);
}
