/*!
 * VidPly v1.2.25 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  loadPinnedScript
} from "./vidply.chunk-NG4YJGLN.js";

// src/utils/StreamingLibraries.ts
var HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js";
var HLS_JS_INTEGRITY = "sha384-p9vgU/7IYJWd3I4STrtqxqR/2cAQlhIX7D/HrTnIMEjjcUox165b7se7sxmm3zDg";
var DASH_JS_URL = "https://cdn.jsdelivr.net/npm/dashjs@5.2.1/dist/modern/umd/dash.all.min.js";
var DASH_JS_INTEGRITY = "sha384-NwbBGevMmVf2Lv50ZqQWLZ0dLH69dxVHYeS+8t54klP9odovQ2+Ms0J4SWfKzPkr";
function optionalString(value) {
  return typeof value === "string" && value !== "" ? value : void 0;
}
async function loadHlsLibrary(options = {}) {
  if (window.Hls) {
    return;
  }
  await loadPinnedScript({
    defaultUrl: HLS_JS_URL,
    defaultIntegrity: HLS_JS_INTEGRITY,
    url: optionalString(options.hlsScriptUrl),
    integrity: optionalString(options.hlsScriptIntegrity)
  });
}
async function loadDashLibrary(options = {}) {
  if (window.dashjs) {
    return;
  }
  await loadPinnedScript({
    defaultUrl: DASH_JS_URL,
    defaultIntegrity: DASH_JS_INTEGRITY,
    url: optionalString(options.dashScriptUrl),
    integrity: optionalString(options.dashScriptIntegrity)
  });
}

export {
  HLS_JS_URL,
  HLS_JS_INTEGRITY,
  DASH_JS_URL,
  DASH_JS_INTEGRITY,
  loadHlsLibrary,
  loadDashLibrary
};
//# sourceMappingURL=vidply.chunk-A3WPZBRW.js.map
