/*!
 * VidPly v1.2.25 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/RendererType.ts
function classifyRendererType(src) {
  if (src.includes("youtube.com") || src.includes("youtu.be") || src.includes("youtube-nocookie.com"))
    return "youtube";
  if (src.includes("vimeo.com")) return "vimeo";
  if (src.includes(".m3u8")) return "hls";
  if (src.includes(".mpd")) return "dash";
  if (src.includes("soundcloud.com") || src.includes("api.soundcloud.com")) return "soundcloud";
  return "html5";
}
function requiresRendererSwap(currentSrc, currentRendererType, targetSrc) {
  return classifyRendererType(targetSrc) !== "html5" || classifyRendererType(currentSrc) !== "html5" || currentRendererType !== null && currentRendererType !== "html5";
}

export {
  classifyRendererType,
  requiresRendererSwap
};
//# sourceMappingURL=vidply.chunk-MWOZ4DBA.js.map
