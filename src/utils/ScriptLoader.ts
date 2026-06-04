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

const inFlight = new Map<string, Promise<void>>();

function findExistingScript(url: string): HTMLScriptElement | null {
  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (script && script.src === url) {
      return script;
    }
  }
  return null;
}

function waitForReady(
  url: string,
  isReady: () => boolean,
  timeout: number,
  resolve: () => void,
  reject: (err: Error) => void
): void {
  if (isReady()) {
    resolve();
    return;
  }
  const start = Date.now();
  const interval = window.setInterval(() => {
    if (isReady()) {
      window.clearInterval(interval);
      resolve();
    } else if (Date.now() - start >= timeout) {
      window.clearInterval(interval);
      reject(new Error(`Script loaded but did not become ready: ${url}`));
    }
  }, 50);
}

/**
 * Inject (or reuse) a `<script>` for `url`, resolving once it has loaded (and,
 * if provided, once `isReady()` is satisfied). Repeated calls for the same URL
 * return the same Promise. A failed load is evicted from the cache so a later
 * call can retry.
 */
export function loadScriptOnce(url: string, options: LoadScriptOptions = {}): Promise<void> {
  const cached = inFlight.get(url);
  if (cached) {
    return cached;
  }

  const { integrity, crossOrigin, referrerPolicy, isReady, readyTimeout = 1000 } = options;

  const promise = new Promise<void>((resolve, reject) => {
    const onLoad = () => {
      if (isReady) {
        waitForReady(url, isReady, readyTimeout, resolve, reject);
      } else {
        resolve();
      }
    };

    const existing = findExistingScript(url);
    if (existing) {
      // A matching script is already in the document (host page or another
      // player). If the SDK global is already available, resolve immediately;
      // otherwise attach to its load/error events.
      if (isReady && isReady()) {
        resolve();
        return;
      }
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load script: ${url}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = crossOrigin ?? 'anonymous';
      script.referrerPolicy = referrerPolicy ?? 'no-referrer';
    } else if (crossOrigin !== undefined && crossOrigin !== null) {
      script.crossOrigin = crossOrigin;
    }
    script.onload = onLoad;
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });

  // Evict failures so a subsequent attempt can re-inject the script.
  const tracked = promise.catch((err: unknown) => {
    inFlight.delete(url);
    throw err;
  });

  inFlight.set(url, tracked);
  return tracked;
}

/** Test-only hook to reset the dedupe cache between cases. */
export function _resetScriptLoaderCache(): void {
  inFlight.clear();
}
