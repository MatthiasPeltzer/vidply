/**
 * Shared external-script loader.
 *
 * Centralizes the otherwise copy-pasted `<script>` injection logic used by the
 * streaming engines (hls.js / dash.js) and the embed SDKs (YouTube / Vimeo /
 * SoundCloud). Loads each URL at most once: concurrent requests for the same
 * URL share a single in-flight Promise, and an already-present matching
 * `<script>` tag is reused instead of injecting a duplicate when several
 * players mount on one page.
 *
 * Subresource Integrity is opt-in via `integrity`; when provided, the script
 * is loaded `crossorigin="anonymous"` with `referrerpolicy="no-referrer"` so
 * the browser can verify the hash.
 */
export interface LoadScriptOptions {
    /** Subresource Integrity hash, e.g. `sha384-…`. Enables crossorigin loading. */
    integrity?: string;
    /** Overrides the default `anonymous` crossOrigin used when `integrity` is set. */
    crossOrigin?: string | null;
    /** Referrer policy applied when `integrity` is set. Defaults to `no-referrer`. */
    referrerPolicy?: ReferrerPolicy;
    /**
     * Optional readiness predicate evaluated after the script's `load` event.
     * Some SDKs expose their global a tick after the script loads; when this
     * returns false the loader polls briefly before rejecting.
     */
    isReady?: () => boolean;
    /** Max time (ms) to wait for `isReady()` after load. Defaults to 1000. */
    readyTimeout?: number;
}
/**
 * Inject (or reuse) a `<script>` for `url`, resolving once it has loaded (and,
 * if provided, once `isReady()` is satisfied). Repeated calls for the same URL
 * return the same Promise. A failed load is evicted from the cache so a later
 * call can retry.
 */
export declare function loadScriptOnce(url: string, options?: LoadScriptOptions): Promise<void>;
export interface PinnedScriptConfig {
    /** Pinned default CDN URL used when no override URL is supplied. */
    defaultUrl: string;
    /** Subresource Integrity hash matching `defaultUrl`. */
    defaultIntegrity: string;
    /** Embedder override URL (self-hosted / alternative CDN). */
    url?: string;
    /** Embedder override integrity for a custom `url`. */
    integrity?: string;
}
/**
 * Load a version-pinned third-party script (hls.js / dash.js) with its built-in
 * Subresource Integrity hash. The security-relevant rule lives in one place:
 * the built-in `defaultIntegrity` is only applied when the effective URL is the
 * pinned default; a custom URL must bring its own `integrity` (we can't know its
 * hash) and otherwise loads without SRI.
 */
export declare function loadPinnedScript(config: PinnedScriptConfig): Promise<void>;
/** Test-only hook to reset the dedupe cache between cases. */
export declare function _resetScriptLoaderCache(): void;
//# sourceMappingURL=ScriptLoader.d.ts.map