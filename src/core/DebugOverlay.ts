/**
 * On-screen debug log for iOS Safari (no Mac Web Inspector required).
 * Enabled via `options.debug`, `options.debugOverlay`, or `?vidplyDebug=1` / `#vidplyDebug=1`.
 */

import type { Player } from './Player.js';

const MAX_LINES = 80;

function formatMediaSnapshot(el: HTMLMediaElement): string {
  const src = el.currentSrc || el.src || '';
  const tail = src.length > 48 ? `…${src.slice(-48)}` : src;
  return `rs=${el.readyState} ns=${el.networkState} paused=${el.paused} src=${tail || '(empty)'}`;
}

function isVidplyDebugQueryEnabled(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get('vidplyDebug') === '1') {
      return true;
    }
    const hash = window.location.hash.replace(/^#/, '');
    if (hash === 'vidplyDebug=1' || hash === 'vidplyDebug') {
      return true;
    }
    return sessionStorage.getItem('vidplyDebug') === '1';
  } catch {
    return false;
  }
}

export class DebugOverlay {
  private static shared: DebugOverlay | null = null;
  private static refCount = 0;

  /** One overlay for the whole page (videos demo has many players). */
  static acquire(player: Player): DebugOverlay {
    if (!DebugOverlay.shared) {
      DebugOverlay.shared = new DebugOverlay();
    }
    DebugOverlay.refCount += 1;
    DebugOverlay.shared.setActivePlayer(player);
    return DebugOverlay.shared;
  }

  static release(): void {
    DebugOverlay.refCount = Math.max(0, DebugOverlay.refCount - 1);
    if (DebugOverlay.refCount === 0 && DebugOverlay.shared) {
      DebugOverlay.shared.destroyInternal();
      DebugOverlay.shared = null;
    }
  }

  static shouldEnable(options: { debug?: boolean; debugOverlay?: boolean }): boolean {
    if (options.debug || options.debugOverlay) {
      return true;
    }
    return isVidplyDebugQueryEnabled();
  }

  private player: Player | null = null;
  private root: HTMLElement | null = null;
  private logEl: HTMLElement | null = null;
  private lines: string[] = [];
  private mediaListenerController: AbortController | null = null;

  private constructor() {}

  setActivePlayer(player: Player): void {
    this.player = player;
    if (this.root) {
      this.attachMediaListeners();
    }
  }

  mount(): void {
    if (this.root || typeof document === 'undefined') {
      return;
    }

    const root = document.createElement('div');
    root.className = 'vidply-debug-overlay';
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText =
      'position:fixed;top:12px;right:12px;left:auto;bottom:auto;width:min(420px,calc(100vw - 24px));' +
      'max-height:min(50vh,480px);z-index:2147483646;' +
      'background:rgba(0,0,0,.92);color:#0f0;font:12px/1.35 ui-monospace,monospace;' +
      'padding:8px 10px;overflow:hidden;display:flex;flex-direction:column;gap:6px;' +
      'pointer-events:auto;border:2px solid #fc0;box-shadow:0 4px 24px rgba(0,0,0,.45);';

    const toolbar = document.createElement('div');
    toolbar.style.cssText = 'display:flex;gap:8px;align-items:center;flex-shrink:0;flex-wrap:wrap;';

    const title = document.createElement('span');
    title.textContent = 'VidPly debug';
    title.style.cssText = 'color:#fff;font-weight:700;';

    const hint = document.createElement('span');
    hint.textContent = '(top-right · ?vidplyDebug=1)';
    hint.style.cssText = 'color:#aaa;font-size:10px;';

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText =
      'font:inherit;color:#fff;background:#333;border:1px solid #666;padding:2px 8px;border-radius:4px;';

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = copyBtn.style.cssText;

    const logEl = document.createElement('pre');
    logEl.style.cssText = 'margin:0;overflow:auto;flex:1;white-space:pre-wrap;word-break:break-word;';

    copyBtn.addEventListener('click', () => {
      void navigator.clipboard?.writeText(this.lines.join('\n')).catch(() => {
        // ignore
      });
    });
    clearBtn.addEventListener('click', () => {
      this.lines = [];
      this.render();
    });

    toolbar.appendChild(title);
    toolbar.appendChild(hint);
    toolbar.appendChild(copyBtn);
    toolbar.appendChild(clearBtn);
    root.appendChild(toolbar);
    root.appendChild(logEl);
    document.body.appendChild(root);

    this.root = root;
    this.logEl = logEl;
    this.attachMediaListeners();
    this.append('overlay ready');
  }

  destroy(): void {
    DebugOverlay.release();
  }

  private destroyInternal(): void {
    this.mediaListenerController?.abort();
    this.mediaListenerController = null;
    this.root?.remove();
    this.root = null;
    this.logEl = null;
    this.player = null;
  }

  append(message: string, player?: Player): void {
    const active = player ?? this.player;
    const el = active?.element;
    const stamp = new Date().toISOString().slice(11, 23);
    const snap = el instanceof HTMLMediaElement ? formatMediaSnapshot(el) : 'no-element';
    const line = `${stamp} ${message} | ${snap}`;
    this.lines.push(line);
    if (this.lines.length > MAX_LINES) {
      this.lines.shift();
    }
    this.render();
  }

  private render(): void {
    if (this.logEl) {
      this.logEl.textContent = this.lines.join('\n');
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
  }

  private attachMediaListeners(): void {
    const media = this.player?.element;
    if (!(media instanceof HTMLMediaElement)) {
      return;
    }
    this.mediaListenerController?.abort();
    const controller = new AbortController();
    this.mediaListenerController = controller;
    const { signal } = controller;
    const activePlayer = this.player;

    const events = [
      'loadstart',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'play',
      'playing',
      'pause',
      'waiting',
      'stalled',
      'suspend',
      'abort',
      'emptied',
      'error',
    ] as const;

    for (const type of events) {
      media.addEventListener(
        type,
        () => {
          let extra = '';
          if (type === 'error' && media.error) {
            const labels: Record<number, string> = {
              1: 'ABORTED',
              2: 'NETWORK',
              3: 'DECODE',
              4: 'SRC_NOT_SUPPORTED',
            };
            const label = labels[media.error.code] ?? String(media.error.code);
            const msg = media.error.message?.trim();
            extra = msg ? ` ${label}: ${msg}` : ` ${label}`;
          }
          this.append(`media:${type}${extra}`, activePlayer ?? undefined);
        },
        { signal },
      );
    }
  }
}
