/**
 * Metadata-track alert handling extracted from Player.
 *
 * The alert system lets a `kind=metadata` text track drive
 * accessibility affordances on the page — pausing the video,
 * focusing an element, showing or hiding a marked-up alert region,
 * wiring a "Continue" button. All of that lives here rather than on
 * Player so the code can be skipped entirely (via tree-shaking) when
 * the `metadataAlerts`/`metadataDirectives` options are disabled.
 *
 * Public-ish entry points (Player exposes them through thin
 * delegates that keep the same names):
 *
 * - `setupHandling()` — wire the `cuechange` listener
 * - `handleCue(cue)` — parse a single cue and dispatch directives
 * - `handleAlert(selector, options)` — manually drive the alert UI
 * - `handleHashtags(tags)` — resolve a list of cue hashtags
 * - `cleanup()` — called from Player.destroy()
 */

import type { Player } from './Player.js';

/** Per-selector metadata alert configuration. */
export interface MetadataAlertConfig {
  titleSelector?: string;
  messageSelector?: string;
  title?: string;
  message?: string;
  focus?: boolean;
  focusOnShow?: boolean;
  focusTarget?: string;
  focusDelay?: number;
  label?: string;
  role?: string;
  show?: boolean;
  display?: string;
  hideDisplay?: string;
  autoScroll?: boolean;
  selector?: string;
  alert?: string;
  target?: string;
  continueButton?: string;
  hideOnContinue?: boolean;
  resume?: boolean;
  resetContent?: boolean;
  notification?: string;
  persist?: boolean;

  [key: string]: unknown;
}

/** Options accepted by `handleAlert`. */
export interface MetadataAlertOptions {
  element?: HTMLElement | null;
  reason?: string;
  cue?: VTTCue | null;
  show?: boolean;
  focus?: boolean;
  autoScroll?: boolean;
}

interface AlertHandlerEntry {
  button: HTMLElement | null;
  handler: EventListener | null;
}

export class MetadataAlertsManager {
  private readonly player: Player;
  private cueChangeHandler: (() => void) | null = null;
  private readonly alertHandlers: Map<string, AlertHandlerEntry> = new Map();

  constructor(player: Player) {
    this.player = player;
  }

  /** The `cuechange` handler this manager installed on the metadata
   *  track. Exposed so Player can mirror it onto itself for legacy
   *  access (some tests poke at `player.metadataCueChangeHandler`). */
  get cuechangeListener(): (() => void) | null {
    return this.cueChangeHandler;
  }

  setupHandling(): void {
    const player = this.player;

    const setupMetadata = () => {
      const textTracks = player.textTracks;
      const metadataTrack = textTracks.find((track) => track.kind === 'metadata');

      if (!metadataTrack) {
        if (player.options.debug) player.log('[Metadata] No metadata track found');
        return;
      }

      // `disabled` suppresses cuechange entirely; `hidden` still fires
      // events without rendering the track.
      if (metadataTrack.mode === 'disabled') {
        metadataTrack.mode = 'hidden';
      }

      if (this.cueChangeHandler) {
        metadataTrack.removeEventListener('cuechange', this.cueChangeHandler);
      }

      this.cueChangeHandler = () => {
        const activeCues = Array.from(metadataTrack.activeCues || []) as VTTCue[];
        if (activeCues.length > 0 && player.options.debug) {
          player.log('[Metadata] Active cues:', activeCues.map((c) => ({
            start: c.startTime,
            end: c.endTime,
            text: c.text
          })));
        }
        activeCues.forEach((cue) => this.handleCue(cue));
      };

      metadataTrack.addEventListener('cuechange', this.cueChangeHandler);
      // Mirror onto player for existing destroy() cleanup path.
      player.metadataCueChangeHandler = this.cueChangeHandler;

      if (player.options.debug) {
        const cueCount = metadataTrack.cues ? metadataTrack.cues.length : 0;
        player.log('[Metadata] Track enabled,', cueCount, 'cues available');
      }
    };

    setupMetadata();
    player.on('loadedmetadata', setupMetadata);
  }

  /**
   * Sanitise a user-supplied selector string. Returns `null` for
   * anything that isn't obviously safe: non-string input, empty
   * after trimming, or too long to bound selector-engine cost.
   */
  normalizeSelector(selector: unknown): string | null {
    if (typeof selector !== 'string') return null;
    const trimmed = selector.trim();
    if (!trimmed) return null;
    if (trimmed.length > 200) return null;
    if (trimmed.startsWith('#') || trimmed.startsWith('.') || trimmed.startsWith('[')) {
      return trimmed;
    }
    return `#${trimmed}`;
  }

  resolveConfig(
    map: Record<string, unknown> | null | undefined,
    key: string | null | undefined
  ): MetadataAlertConfig | null {
    if (!map || !key) return null;
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key] as MetadataAlertConfig;
    }
    const withoutHash = key.replace(/^#/, '');
    if (Object.prototype.hasOwnProperty.call(map, withoutHash)) {
      return map[withoutHash] as MetadataAlertConfig;
    }
    return null;
  }

  /**
   * Remember the original title/message text before a hashtag cue
   * overwrites them, so `restoreContent` can roll back on the next
   * cue boundary. Idempotent — a second call for the same element
   * does not overwrite the already-cached value.
   */
  cacheContent(element: HTMLElement | null | undefined, config: MetadataAlertConfig = {}): void {
    if (!element) return;
    const titleSelector = config.titleSelector || '[data-vidply-alert-title], h3, header';
    const messageSelector = config.messageSelector || '[data-vidply-alert-message], p';

    const titleEl = element.querySelector<HTMLElement>(titleSelector);
    if (titleEl && !titleEl.dataset.vidplyAlertTitleOriginal) {
      titleEl.dataset.vidplyAlertTitleOriginal = titleEl.textContent?.trim() ?? '';
    }

    const messageEl = element.querySelector<HTMLElement>(messageSelector);
    if (messageEl && !messageEl.dataset.vidplyAlertMessageOriginal) {
      messageEl.dataset.vidplyAlertMessageOriginal = messageEl.textContent?.trim() ?? '';
    }
  }

  restoreContent(element: HTMLElement | null | undefined, config: MetadataAlertConfig = {}): void {
    if (!element) return;
    const titleSelector = config.titleSelector || '[data-vidply-alert-title], h3, header';
    const messageSelector = config.messageSelector || '[data-vidply-alert-message], p';

    const titleEl = element.querySelector<HTMLElement>(titleSelector);
    if (titleEl && titleEl.dataset.vidplyAlertTitleOriginal) {
      titleEl.textContent = titleEl.dataset.vidplyAlertTitleOriginal;
    }

    const messageEl = element.querySelector<HTMLElement>(messageSelector);
    if (messageEl && messageEl.dataset.vidplyAlertMessageOriginal) {
      messageEl.textContent = messageEl.dataset.vidplyAlertMessageOriginal;
    }
  }

  /**
   * Move focus to one of the well-known targets understood by the
   * alert system, or to a named selector. Never silently errors — an
   * unresolved target is simply a no-op.
   */
  focusTarget(target: string | null | undefined, fallbackElement: HTMLElement | null = null): void {
    if (!target || target === 'none') return;

    if (target === 'alert' && fallbackElement) {
      fallbackElement.focus({ preventScroll: true });
      return;
    }

    const player = this.player;

    if (target === 'player') {
      player.container?.focus({ preventScroll: true });
      return;
    }

    if (target === 'media') {
      player.element.focus({ preventScroll: true });
      return;
    }

    if (target === 'playButton') {
      const playButton = player.controlBar?.controls?.playPause;
      playButton?.focus({ preventScroll: true });
      return;
    }

    if (typeof target === 'string') {
      const targetElement = document.querySelector(target) as HTMLElement | null;
      if (targetElement) {
        if (targetElement.tabIndex === -1 && !targetElement.hasAttribute('tabindex')) {
          targetElement.setAttribute('tabindex', '-1');
        }
        targetElement.focus({ preventScroll: true });
      }
    }
  }

  /**
   * The public alert entry point. Pulls config out of
   * `options.metadataAlerts`, locates the DOM element, and applies
   * show/focus/continue logic per configuration.
   */
  handleAlert(selector: string, options: MetadataAlertOptions = {}): HTMLElement | undefined {
    const player = this.player;
    if (!selector) return undefined;

    const config: MetadataAlertConfig =
      this.resolveConfig(player.options.metadataAlerts as Record<string, unknown> | null | undefined, selector) || {};

    // Container-scoped resolution by default; only fall back to a
    // global lookup when `metadataDirectives === 'global' | true`.
    const element = options.element || this.resolveElement(selector);

    if (!element) {
      if (player.options.debug) player.log('[Metadata] Alert element not found:', selector);
      return undefined;
    }

    if (player.options.debug) {
      player.log('[Metadata] Handling alert', selector, { reason: options.reason, config });
    }

    this.cacheContent(element, config);

    if (!element.dataset.vidplyAlertOriginalDisplay) {
      element.dataset.vidplyAlertOriginalDisplay = element.style.display || '';
    }

    if (!element.dataset.vidplyAlertDisplay) {
      element.dataset.vidplyAlertDisplay = config.display || 'block';
    }

    const shouldShow = options.show !== undefined ? options.show : (config.show !== false);
    if (shouldShow) {
      const displayValue = config.display || element.dataset.vidplyAlertDisplay || 'block';
      element.style.display = displayValue;
      element.hidden = false;
      element.removeAttribute('hidden');
      element.setAttribute('aria-hidden', 'false');
      element.setAttribute('data-vidply-alert-active', 'true');
    }

    const shouldReset = config.resetContent !== false && options.reason === 'focus';
    if (shouldReset) this.restoreContent(element, config);

    const shouldFocus = options.focus !== undefined
      ? options.focus
      : (config.focusOnShow ?? (options.reason !== 'focus'));

    if (shouldShow && shouldFocus) {
      if (element.tabIndex === -1 && !element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', '-1');
      }
      element.focus({ preventScroll: true });
    }

    if (shouldShow && config.autoScroll !== false && options.autoScroll !== false) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const continueSelector = config.continueButton;
    if (continueSelector) {
      let continueButton: HTMLElement | null = null;
      if (continueSelector === 'self') {
        continueButton = element;
      } else if (element.matches(continueSelector)) {
        continueButton = element;
      } else {
        continueButton =
          element.querySelector<HTMLElement>(continueSelector) ||
          document.querySelector<HTMLElement>(continueSelector);
      }

      if (continueButton && !this.alertHandlers.has(selector)) {
        const handler = () => {
          const hideOnContinue = config.hideOnContinue !== false;
          if (hideOnContinue) {
            const originalDisplay = element.dataset.vidplyAlertOriginalDisplay || '';
            element.style.display = config.hideDisplay || originalDisplay || 'none';
            element.setAttribute('aria-hidden', 'true');
            element.removeAttribute('data-vidply-alert-active');
          }

          if (config.resume !== false && player.state.paused) {
            player.play();
          }

          const focusTarget = config.focusTarget || 'playButton';
          player.setManagedTimeout(() => {
            this.focusTarget(focusTarget, element);
          }, config.focusDelay ?? 100);
        };

        continueButton.addEventListener('click', handler);
        this.alertHandlers.set(selector, { button: continueButton, handler });
      }
    }

    return element;
  }

  handleHashtags(hashtags: string[] | null | undefined): void {
    if (!Array.isArray(hashtags) || hashtags.length === 0) return;

    const player = this.player;
    const configMap = player.options.metadataHashtags as Record<string, unknown> | null | undefined;
    if (!configMap) return;

    hashtags.forEach((tag) => {
      const config = this.resolveConfig(configMap, tag);
      if (!config) return;

      const selector = this.normalizeSelector(config.alert || config.selector || config.target);
      if (!selector) return;

      const element = this.resolveElement(selector);
      if (!element) {
        if (player.options.debug) player.log('[Metadata] Hashtag target not found:', selector);
        return;
      }

      if (player.options.debug) {
        player.log('[Metadata] Handling hashtag', tag, { selector, config });
      }

      this.cacheContent(element, config);

      if (config.title) {
        const titleSelector = config.titleSelector || '[data-vidply-alert-title], h3, header';
        const titleEl = element.querySelector<HTMLElement>(titleSelector);
        if (titleEl) titleEl.textContent = config.title;
      }

      if (config.message) {
        const messageSelector = config.messageSelector || '[data-vidply-alert-message], p';
        const messageEl = element.querySelector<HTMLElement>(messageSelector);
        if (messageEl) messageEl.textContent = config.message;
      }

      const show = config.show !== false;
      const focus = config.focus !== undefined ? config.focus : false;

      this.handleAlert(selector, {
        element,
        show,
        focus,
        autoScroll: config.autoScroll,
        reason: 'hashtag'
      });
    });
  }

  /**
   * Parse a single metadata cue for directives (`PAUSE`, `FOCUS:x`,
   * `#hashtag`), emit the corresponding public events, and execute
   * DOM side-effects only when `options.metadataDirectives` is set.
   */
  handleCue(cue: VTTCue | TextTrackCue): void {
    const player = this.player;
    const text = (cue as VTTCue).text.trim();

    if (player.options.debug) {
      player.log('[Metadata] Processing cue:', { time: cue.startTime, text });
    }

    // Public event fires regardless of directive opt-in so consumers
    // can always observe metadata without granting DOM side-effects.
    player.emit('metadata', {
      time: cue.startTime,
      endTime: cue.endTime,
      text,
      cue
    });

    if (text.includes('PAUSE')) {
      if (!player.state.paused) {
        if (player.options.debug) player.log('[Metadata] Pausing video at', cue.startTime);
        player.pause();
      }
      player.emit('metadata:pause', { time: cue.startTime, text });
    }

    const focusMatch = text.match(/FOCUS:([\w#-]{1,128})/);
    if (focusMatch) {
      const targetSelector = focusMatch[1];
      const normalizedSelector = this.normalizeSelector(targetSelector);
      const targetElement = this.resolveElement(normalizedSelector);
      if (targetElement) {
        if (player.options.debug) player.log('[Metadata] Focusing element:', normalizedSelector);
        if (targetElement.tabIndex === -1 && !targetElement.hasAttribute('tabindex')) {
          targetElement.setAttribute('tabindex', '-1');
        }
        player.setManagedTimeout(() => {
          targetElement.focus({ preventScroll: true });
        }, 10);
      } else if (player.options.debug && player.options.metadataDirectives) {
        player.log('[Metadata] Element not found:', normalizedSelector || targetSelector);
      }
      player.emit('metadata:focus', {
        time: cue.startTime,
        target: targetSelector,
        selector: normalizedSelector,
        element: targetElement,
        text
      });

      if (player.options.metadataDirectives && normalizedSelector) {
        this.handleAlert(normalizedSelector, {
          element: targetElement,
          reason: 'focus'
        });
      }
    }

    const hashtags = text.match(/#[\w-]{1,64}/g);
    if (hashtags && hashtags.length > 0) {
      // Cap at 32 hashtags per cue to bound subsequent work.
      const safeTags = hashtags.slice(0, 32);
      if (player.options.debug) player.log('[Metadata] Hashtags found:', safeTags);
      player.emit('metadata:hashtags', {
        time: cue.startTime,
        hashtags: safeTags,
        text
      });

      if (player.options.metadataDirectives) this.handleHashtags(safeTags);
    }
  }

  /**
   * Resolve a metadata-cue selector inside the configured directive
   * scope. Returns `null` when directives are disabled or the
   * selector doesn't resolve. Container-scoped resolution is the
   * default so a malicious caption cannot focus a login-form input
   * or trigger a dialog elsewhere on the page.
   */
  private resolveElement(selector: string | null): HTMLElement | null {
    const player = this.player;
    const mode = player.options.metadataDirectives;
    if (!mode) return null;
    if (!selector) return null;
    try {
      if (mode === true || mode === 'global') {
        return document.querySelector(selector) as HTMLElement | null;
      }
      const root = player.container || player.element.parentElement || document;
      return (root as ParentNode).querySelector(selector) as HTMLElement | null;
    } catch {
      // Bad selector — never surface to the page.
      return null;
    }
  }

  /** Tear down the per-alert click handlers and the cuechange
   *  listener. Called from Player.destroy(). */
  cleanup(): void {
    // The cuechange listener is removed by the Player destroy path
    // because the underlying TextTrack still exists and Player
    // already knows how to walk textTracks. We only need to release
    // the per-alert click handlers we installed.
    if (this.alertHandlers.size > 0) {
      this.alertHandlers.forEach(({ button, handler }) => {
        if (button && handler) button.removeEventListener('click', handler);
      });
      this.alertHandlers.clear();
    }
    this.cueChangeHandler = null;
  }
}
