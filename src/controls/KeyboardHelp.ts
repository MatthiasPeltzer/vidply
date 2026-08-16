/**
 * Keyboard Shortcuts Help Dialog
 *
 * A focus-trapped modal listing the player's active keyboard shortcuts.
 * Built lazily from `player.options.keyboardShortcuts` so it always reflects
 * the live bindings (including consumer overrides). Implements the standard
 * modal focus-trap, escape and return-focus behaviour for an accessible UX.
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { setContainerChildrenInert, trapFocusInContainer } from '../utils/FocusUtils.js';
import type { Player } from '../core/Player.js';
import type { KeyboardShortcuts } from '../types/options.js';

/**
 * Display order for the shortcut rows. Only actions that are both listed here
 * and have at least one bound key are rendered, so removing a binding hides
 * its row automatically.
 */
const ACTION_ORDER: Array<keyof KeyboardShortcuts> = [
  'play-pause',
  'seek-backward',
  'seek-forward',
  'volume-up',
  'volume-down',
  'mute',
  'captions',
  'caption-style-menu',
  'speed-down',
  'speed-up',
  'speed-menu',
  'quality-menu',
  'chapters-menu',
  'transcript-toggle',
  'fullscreen',
  'help'
];

/**
 * Feature-specific actions only make sense when the matching feature actually
 * exists on this player (e.g. there's no point listing the captions shortcut
 * for a video without captions). Each value is the key under
 * `player.controlBar.controls` whose presence proves the feature is available
 * and enabled for this player. Actions not listed here (play/pause, seek,
 * volume, mute, help) are always relevant for any audio/video player.
 */
const ACTION_REQUIRES_CONTROL: Partial<Record<keyof KeyboardShortcuts, string>> = {
  captions: 'captions',
  'caption-style-menu': 'captionStyle',
  'speed-down': 'speed',
  'speed-up': 'speed',
  'speed-menu': 'speed',
  'quality-menu': 'quality',
  'chapters-menu': 'chapters',
  'transcript-toggle': 'transcript',
  fullscreen: 'fullscreen'
};

export class KeyboardHelp {
  player: Player;
  isOpen = false;
  overlay: HTMLElement | null = null;
  private _triggerElement: HTMLElement | null = null;
  private _keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private _content: HTMLElement | null = null;
  private _inertedElements: Element[] = [];

  constructor(player: Player) {
    this.player = player;
  }

  private get prefix(): string {
    return this.player.options.classPrefix;
  }

  /**
   * Turn a raw KeyboardEvent.key value into a human-readable label. Arrow
   * keys become universally understood glyphs; the space bar and single
   * letters are normalised for legibility.
   */
  private formatKey(key: string): string {
    switch (key) {
      case ' ':
        return i18n.t('help.keys.space');
      case 'ArrowUp':
        return '\u2191';
      case 'ArrowDown':
        return '\u2193';
      case 'ArrowLeft':
        return '\u2190';
      case 'ArrowRight':
        return '\u2192';
      case 'Escape':
        return 'Esc';
      default:
        return key.length === 1 ? key.toUpperCase() : key;
    }
  }

  private createElement(): HTMLElement {
    const titleId = `${this.prefix}-help-title-${this.player.instanceId}`;

    const overlay = DOMUtils.createElement('div', {
      className: `${this.prefix}-settings-overlay ${this.prefix}-help-overlay`,
      attributes: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId
      }
    });
    overlay.style.display = 'none';

    const dialog = DOMUtils.createElement('div', {
      className: `${this.prefix}-settings-dialog ${this.prefix}-help-dialog`
    });

    const header = DOMUtils.createElement('div', {
      className: `${this.prefix}-settings-header`
    });

    const title = DOMUtils.createElement('h2', {
      textContent: i18n.t('help.title'),
      attributes: { id: titleId }
    });

    const closeButton = DOMUtils.createElement('button', {
      className: `${this.prefix}-button ${this.prefix}-settings-close`,
      attributes: {
        type: 'button',
        'aria-label': i18n.t('help.close')
      }
    });
    closeButton.appendChild(createIconElement('close'));
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeButton);

    const content = DOMUtils.createElement('div', {
      className: `${this.prefix}-settings-content`
    });
    this._content = content;
    content.appendChild(this.buildShortcutList());

    dialog.appendChild(header);
    dialog.appendChild(content);
    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e: MouseEvent) => {
      if (e.target === overlay) {
        this.hide();
      }
    });

    this._keydownHandler = (e: KeyboardEvent) => {
      if (!this.isOpen || !this.overlay) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
        return;
      }

      // Trap Tab within the dialog (WCAG 2.1.2, 2.4.3).
      if (e.key === 'Tab') {
        trapFocusInContainer(e, this.overlay);
      }
    };
    const lifecycleSignal = (this.player as { lifecycleSignal?: AbortSignal }).lifecycleSignal;
    document.addEventListener(
      'keydown',
      this._keydownHandler,
      lifecycleSignal ? { signal: lifecycleSignal } : undefined
    );

    return overlay;
  }

  /**
   * Whether a shortcut row is worth showing for *this* player. Feature actions
   * are hidden when their control isn't present (e.g. no captions track, an
   * audio-only player with no fullscreen). Core actions are always relevant.
   *
   * When the player has no control bar we can't infer availability, so nothing
   * is hidden — the shortcuts still work and we'd rather over-show than mislead.
   */
  private isActionRelevant(action: keyof KeyboardShortcuts): boolean {
    const requiredControl = ACTION_REQUIRES_CONTROL[action];
    if (!requiredControl) return true;

    const controlBar = (this.player as { controlBar?: { controls?: Record<string, unknown> } }).controlBar;
    if (!controlBar || !controlBar.controls) return true;

    return Boolean(controlBar.controls[requiredControl]);
  }

  private buildShortcutList(): HTMLElement {
    const list = DOMUtils.createElement('dl', {
      className: `${this.prefix}-help-list`
    });

    const shortcuts = this.player.options.keyboardShortcuts as unknown as Record<string, string[] | undefined>;

    for (const action of ACTION_ORDER) {
      const keys = shortcuts[action];
      if (!Array.isArray(keys) || keys.length === 0) continue;
      if (!this.isActionRelevant(action)) continue;

      const term = DOMUtils.createElement('dt', {
        className: `${this.prefix}-help-action`,
        textContent: i18n.t(`help.actions.${action}`)
      });

      const desc = DOMUtils.createElement('dd', {
        className: `${this.prefix}-help-keys`
      });

      keys.forEach((key, index) => {
        if (index > 0) {
          desc.appendChild(
            DOMUtils.createElement('span', {
              className: `${this.prefix}-help-key-sep`,
              textContent: i18n.t('help.or')
            })
          );
        }
        desc.appendChild(
          DOMUtils.createElement('kbd', {
            className: `${this.prefix}-help-key`,
            textContent: this.formatKey(key)
          })
        );
      });

      list.appendChild(term);
      list.appendChild(desc);
    }

    return list;
  }

  show(): void {
    if (this.isOpen) return;

    if (!this.overlay) {
      this.overlay = this.createElement();
      this.player.container.appendChild(this.overlay);
    } else if (this._content) {
      // Rebuild so feature availability that changed since last open
      // (e.g. HLS captions/qualities loaded later) is reflected.
      this._content.replaceChildren(this.buildShortcutList());
    }

    const active = (typeof document !== 'undefined' ? document.activeElement : null) as HTMLElement | null;
    this._triggerElement = active && typeof active.focus === 'function' ? active : null;

    this.overlay.style.display = 'flex';
    this.player.container?.classList.add(`${this.prefix}-modal-open`);
    if (this.player.container && this.overlay) {
      this._inertedElements = setContainerChildrenInert(
        this.player.container,
        this.overlay,
        true,
        this._inertedElements
      );
    }
    this.isOpen = true;

    const closeButton = this.overlay.querySelector<HTMLElement>(`.${this.prefix}-settings-close`);
    closeButton?.focus({ preventScroll: true });

    this.player.emit('keyboardhelpopen');
  }

  hide(): void {
    if (!this.overlay) return;

    this.overlay.style.display = 'none';
    this.player.container?.classList.remove(`${this.prefix}-modal-open`);
    if (this.player.container) {
      this._inertedElements = setContainerChildrenInert(
        this.player.container,
        null,
        false,
        this._inertedElements
      );
    }
    this.isOpen = false;

    const trigger = this._triggerElement;
    this._triggerElement = null;
    if (trigger && document.contains(trigger)) {
      try {
        trigger.focus({ preventScroll: true });
      } catch {
        this.player.container?.focus();
      }
    } else {
      this.player.container?.focus();
    }

    this.player.emit('keyboardhelpclose');
  }

  toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }

  destroy(): void {
    if (this._keydownHandler) {
      document.removeEventListener('keydown', this._keydownHandler);
      this._keydownHandler = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (this.player.container) {
      this._inertedElements = setContainerChildrenInert(
        this.player.container,
        null,
        false,
        this._inertedElements
      );
    }
    this.player.container?.classList.remove(`${this.prefix}-modal-open`);
    this.overlay = null;
    this._content = null;
    this._triggerElement = null;
    this.isOpen = false;
  }
}
