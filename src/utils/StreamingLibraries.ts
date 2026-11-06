/**
 * Version-pinned hls.js / dash.js loaders shared by the streaming renderers
 * and {@link StreamingSourceLoader} (sign-language overlay), so every caller
 * loads the same build with the same Subresource Integrity hash.
 *
 * Recompute a hash whenever a pin changes:
 *   curl -sSL <url> | openssl dgst -sha384 -binary | openssl base64 -A
 * and prefix it with `sha384-`.
 */
import { loadPinnedScript } from './ScriptLoader.js';

export const HLS_JS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js';
export const HLS_JS_INTEGRITY =
  'sha384-p9vgU/7IYJWd3I4STrtqxqR/2cAQlhIX7D/HrTnIMEjjcUox165b7se7sxmm3zDg';

export const DASH_JS_URL =
  'https://cdn.jsdelivr.net/npm/dashjs@5.2.1/dist/modern/umd/dash.all.min.js';
export const DASH_JS_INTEGRITY =
  'sha384-NwbBGevMmVf2Lv50ZqQWLZ0dLH69dxVHYeS+8t54klP9odovQ2+Ms0J4SWfKzPkr';

/** Self-hosting overrides, as accepted by the player options of the same name. */
export interface StreamingLibraryOptions {
  hlsScriptUrl?: unknown;
  hlsScriptIntegrity?: unknown;
  dashScriptUrl?: unknown;
  dashScriptIntegrity?: unknown;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined;
}

/** Load hls.js unless `window.Hls` is already there (e.g. shipped by the CMS). */
export async function loadHlsLibrary(options: StreamingLibraryOptions = {}): Promise<void> {
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

/** Load dash.js unless `window.dashjs` is already there. */
export async function loadDashLibrary(options: StreamingLibraryOptions = {}): Promise<void> {
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
