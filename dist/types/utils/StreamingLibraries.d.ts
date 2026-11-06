export declare const HLS_JS_URL = "https://cdn.jsdelivr.net/npm/hls.js@1.7.4/dist/hls.min.js";
export declare const HLS_JS_INTEGRITY = "sha384-p9vgU/7IYJWd3I4STrtqxqR/2cAQlhIX7D/HrTnIMEjjcUox165b7se7sxmm3zDg";
export declare const DASH_JS_URL = "https://cdn.jsdelivr.net/npm/dashjs@5.2.1/dist/modern/umd/dash.all.min.js";
export declare const DASH_JS_INTEGRITY = "sha384-NwbBGevMmVf2Lv50ZqQWLZ0dLH69dxVHYeS+8t54klP9odovQ2+Ms0J4SWfKzPkr";
/** Self-hosting overrides, as accepted by the player options of the same name. */
export interface StreamingLibraryOptions {
    hlsScriptUrl?: unknown;
    hlsScriptIntegrity?: unknown;
    dashScriptUrl?: unknown;
    dashScriptIntegrity?: unknown;
}
/** Load hls.js unless `window.Hls` is already there (e.g. shipped by the CMS). */
export declare function loadHlsLibrary(options?: StreamingLibraryOptions): Promise<void>;
/** Load dash.js unless `window.dashjs` is already there. */
export declare function loadDashLibrary(options?: StreamingLibraryOptions): Promise<void>;
//# sourceMappingURL=StreamingLibraries.d.ts.map