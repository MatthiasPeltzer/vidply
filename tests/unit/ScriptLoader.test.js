/**
 * Unit Tests: ScriptLoader
 * Tests the shared external-script loader: single injection, dedupe across
 * concurrent calls, reuse of an existing tag, SRI attributes, readiness
 * polling, and cache eviction on failure.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadScriptOnce, loadPinnedScript, _resetScriptLoaderCache } from '../../src/utils/ScriptLoader.js';

const PINNED = {
  defaultUrl: 'https://cdn.example.com/lib@1.0.0/lib.min.js',
  defaultIntegrity: 'sha384-DEFAULT'
};

function scriptsFor(url) {
  return Array.from(document.getElementsByTagName('script')).filter((s) => s.src === url);
}

function fireLoad(url) {
  const [script] = scriptsFor(url);
  if (script) {
    script.dispatchEvent(new Event('load'));
  }
  return script;
}

function fireError(url) {
  const [script] = scriptsFor(url);
  if (script) {
    script.dispatchEvent(new Event('error'));
  }
  return script;
}

describe('ScriptLoader', () => {
  beforeEach(() => {
    _resetScriptLoaderCache();
    document.querySelectorAll('script').forEach((s) => s.remove());
  });

  afterEach(() => {
    document.querySelectorAll('script').forEach((s) => s.remove());
  });

  it('injects a single script and resolves on load', async () => {
    const url = 'https://example.com/a.js';
    const promise = loadScriptOnce(url);

    expect(scriptsFor(url)).toHaveLength(1);

    fireLoad(url);
    await expect(promise).resolves.toBeUndefined();
  });

  it('sets SRI attributes when integrity is provided', () => {
    const url = 'https://example.com/sri.js';
    loadScriptOnce(url, { integrity: 'sha384-abc' });

    const [script] = scriptsFor(url);
    expect(script.integrity).toBe('sha384-abc');
    expect(script.crossOrigin).toBe('anonymous');
    expect(script.referrerPolicy).toBe('no-referrer');
  });

  it('does not set crossOrigin without integrity', () => {
    const url = 'https://example.com/plain.js';
    loadScriptOnce(url);

    const [script] = scriptsFor(url);
    expect(script.getAttribute('integrity')).toBeNull();
    expect(script.crossOrigin).toBeNull();
  });

  it('dedupes concurrent calls for the same URL to one tag', async () => {
    const url = 'https://example.com/dedupe.js';
    const p1 = loadScriptOnce(url);
    const p2 = loadScriptOnce(url);

    expect(p1).toBe(p2);
    expect(scriptsFor(url)).toHaveLength(1);

    fireLoad(url);
    await Promise.all([p1, p2]);
  });

  it('reuses an existing matching script tag instead of injecting a duplicate', async () => {
    const url = 'https://example.com/existing.js';
    const existing = document.createElement('script');
    existing.src = url;
    document.head.appendChild(existing);

    const promise = loadScriptOnce(url);
    expect(scriptsFor(url)).toHaveLength(1);

    existing.dispatchEvent(new Event('load'));
    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects on load error and evicts the cache so a retry re-injects', async () => {
    const url = 'https://example.com/fail.js';
    const promise = loadScriptOnce(url);
    fireError(url);
    await expect(promise).rejects.toThrow(/Failed to load script/);

    // After failure the cache is cleared: a new call injects a fresh tag.
    document.querySelectorAll('script').forEach((s) => s.remove());
    const retry = loadScriptOnce(url);
    expect(scriptsFor(url)).toHaveLength(1);
    fireLoad(url);
    await expect(retry).resolves.toBeUndefined();
  });

  describe('loadPinnedScript', () => {
    it('loads the default URL with its built-in integrity when no override is given', () => {
      loadPinnedScript({ ...PINNED });
      const [script] = scriptsFor(PINNED.defaultUrl);
      expect(script).toBeTruthy();
      expect(script.integrity).toBe('sha384-DEFAULT');
      expect(script.crossOrigin).toBe('anonymous');
    });

    it('drops the built-in integrity for a custom URL with no explicit integrity', () => {
      const url = 'https://self-hosted.example/lib.js';
      loadPinnedScript({ ...PINNED, url });
      const [script] = scriptsFor(url);
      expect(script).toBeTruthy();
      expect(script.getAttribute('integrity')).toBeNull();
      expect(script.crossOrigin).toBeNull();
      // The default hash must never be applied to a non-default URL.
      expect(scriptsFor(PINNED.defaultUrl)).toHaveLength(0);
    });

    it('applies an explicit integrity to a custom URL', () => {
      const url = 'https://cdn.example.com/lib@2.0.0/lib.min.js';
      loadPinnedScript({ ...PINNED, url, integrity: 'sha384-CUSTOM' });
      const [script] = scriptsFor(url);
      expect(script.integrity).toBe('sha384-CUSTOM');
    });

    it('lets an explicit integrity override even for the default URL', () => {
      loadPinnedScript({ ...PINNED, integrity: 'sha384-OVERRIDE' });
      const [script] = scriptsFor(PINNED.defaultUrl);
      expect(script.integrity).toBe('sha384-OVERRIDE');
    });
  });

  describe('readiness polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('resolves once isReady() becomes true after load', async () => {
      const url = 'https://example.com/ready.js';
      let ready = false;
      const promise = loadScriptOnce(url, { isReady: () => ready });
      const assertion = expect(promise).resolves.toBeUndefined();

      fireLoad(url);
      // Not ready yet: still pending while polling.
      ready = true;
      await vi.advanceTimersByTimeAsync(50);
      await assertion;
    });

    it('rejects if isReady() never becomes true within readyTimeout', async () => {
      const url = 'https://example.com/never.js';
      const promise = loadScriptOnce(url, { isReady: () => false, readyTimeout: 200 });
      // Attach the rejection assertion before advancing timers so the
      // rejection is never momentarily unhandled.
      const assertion = expect(promise).rejects.toThrow(/did not become ready/);

      fireLoad(url);
      await vi.advanceTimersByTimeAsync(250);
      await assertion;
    });
  });
});
