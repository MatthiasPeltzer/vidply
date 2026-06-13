/*!
 * VidPly v1.2.0 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/ScriptLoader.ts
var inFlight = /* @__PURE__ */ new Map();
function findExistingScript(url) {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i++) {
    const script = scripts[i];
    if (script && script.src === url) {
      return script;
    }
  }
  return null;
}
function waitForReady(url, isReady, timeout, resolve, reject) {
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
function loadScriptOnce(url, options = {}) {
  const cached = inFlight.get(url);
  if (cached) {
    return cached;
  }
  const { integrity, crossOrigin, referrerPolicy, isReady, readyTimeout = 1e3 } = options;
  const promise = new Promise((resolve, reject) => {
    const onLoad = () => {
      if (isReady) {
        waitForReady(url, isReady, readyTimeout, resolve, reject);
      } else {
        resolve();
      }
    };
    const existing = findExistingScript(url);
    if (existing) {
      if (isReady && isReady()) {
        resolve();
        return;
      }
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error(`Failed to load script: ${url}`)),
        { once: true }
      );
      return;
    }
    const script = document.createElement("script");
    script.src = url;
    if (integrity) {
      script.integrity = integrity;
      script.crossOrigin = crossOrigin ?? "anonymous";
      script.referrerPolicy = referrerPolicy ?? "no-referrer";
    } else if (crossOrigin !== void 0 && crossOrigin !== null) {
      script.crossOrigin = crossOrigin;
    }
    script.onload = onLoad;
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.head.appendChild(script);
  });
  const tracked = promise.catch((err) => {
    inFlight.delete(url);
    throw err;
  });
  inFlight.set(url, tracked);
  return tracked;
}

export {
  loadScriptOnce
};
//# sourceMappingURL=vidply.chunk-SFVMD4OH.js.map
