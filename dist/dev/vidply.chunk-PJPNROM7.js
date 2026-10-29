/*!
 * VidPly v1.2.25 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  PosterManager
} from "./vidply.chunk-ZWDA4WLZ.js";

// src/utils/EmbedIdleCover.ts
function applyPosterImageToVideoWrapper(player, resolvedUrl) {
  const wrapper = player.videoWrapper;
  if (!wrapper) {
    return;
  }
  const cssPoster = PosterManager.toSafeCssPoster(resolvedUrl);
  if (!cssPoster) {
    return;
  }
  wrapper.style.setProperty("--vidply-poster-image", cssPoster);
  wrapper.classList.add(`${player.options.classPrefix}-forced-poster`);
}
function applyChromelessIdlePosterFromElement(player) {
  const raw = player.element.getAttribute("poster") ?? (typeof player.options.poster === "string" ? player.options.poster : null);
  if (!raw) {
    return;
  }
  applyPosterImageToVideoWrapper(player, player.resolvePosterPath(raw));
}
function setEmbedIdleCover(player, active) {
  const prefix = player.options.classPrefix;
  player.container?.classList.toggle(`${prefix}-embed-idle-cover`, active);
  if (active) {
    player.showPosterOverlay?.();
    const overlayNode = player.getPlayButtonOverlayNode?.();
    if (overlayNode instanceof HTMLElement || overlayNode instanceof SVGSVGElement) {
      overlayNode.style.display = "";
      overlayNode.style.opacity = "1";
      overlayNode.style.pointerEvents = "auto";
    }
    const overlayButton = player.playButtonOverlayButton;
    if (overlayButton) {
      overlayButton.style.display = "";
      overlayButton.style.opacity = "1";
      overlayButton.style.pointerEvents = "auto";
    }
  } else {
    player.hidePosterOverlay?.();
    player.syncPlayOverlayVisibility?.();
  }
}
function clearEmbedIdleCover(player) {
  player.container?.classList.remove(`${player.options.classPrefix}-embed-idle-cover`);
}

export {
  applyPosterImageToVideoWrapper,
  applyChromelessIdlePosterFromElement,
  setEmbedIdleCover,
  clearEmbedIdleCover
};
//# sourceMappingURL=vidply.chunk-PJPNROM7.js.map
