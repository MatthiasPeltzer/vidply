/**
 * Owns the settings-menu lifecycle for a `DraggableResizable`-powered
 * floating panel: create, show, hide, outside-click dismissal, keyboard
 * navigation, viewport-aware positioning, and the drag-mode / resize-
 * mode toggle items.
 *
 * `SignLanguageManager` and `TranscriptManager` both present the same
 * pattern: a settings button that opens a menu containing a "Keyboard
 * drag mode" toggle, a "Resize mode" toggle, manager-specific extras,
 * and a close item. This class captures that pattern so each manager
 * only has to describe:
 *   - how to resolve its `DraggableResizable` (for state readback),
 *   - which i18n keys to use on the toggle items,
 *   - where to place the menu in its own layout (via `getMenuParent`),
 *   - how to toggle each mode (`onDragItemClick` / `onResizeItemClick`
 *     run the manager's side effects — announcements, badges, focus),
 *   - any extra menu items (`buildExtraItems`, e.g. style dialog,
 *     timestamp toggle for TranscriptManager).
 *
 * The manager's own public API (`showSettingsMenu`, `toggleKeyboardDragMode`,
 * `hideSettingsMenu`, ...) is preserved by forwarding to this panel.
 * External code that reads `settingsMenuVisible` or the option-button
 * elements keeps working via getters on the manager that proxy the
 * panel's state.
 *
 * Event listeners attached to `document` are tied to the player's
 * `lifecycleSignal` so they are torn down automatically when the
 * player is destroyed.
 */

import { DOMUtils } from './DOMUtils.js';
import { i18n } from '../i18n/i18n.js';
import {
  attachMenuKeyboardNavigation,
  createMenuItem,
  focusFirstMenuItem,
} from './MenuUtils.js';
import {
  positionSettingsMenu,
  positionSettingsMenuDeferred,
  updateToggleMenuItem,
} from './DraggablePanelMenu.js';

import type { Player } from '../core/Player.js';
import type { DraggableResizable } from './DraggableResizable.js';

/**
 * i18n keys used for the drag-mode and resize-mode toggle items and
 * the "Close" item. All values must be translation keys (passed
 * through `i18n.t()` by `createMenuItem`/`updateToggleMenuItem`).
 */
export interface DraggablePanelI18nKeys {
  enableDrag: string;
  disableDrag: string;
  enableDragAria: string;
  disableDragAria: string;
  enableResize: string;
  disableResize: string;
  enableResizeAria: string;
  disableResizeAria: string;
  closeMenu: string;
}

export interface DraggablePanelExtrasContext {
  menu: HTMLElement;
  itemClass: string;
  classPrefix: string;
  /**
   * Strip the tooltip and duplicate `button-text` nodes from a menu
   * item. `createMenuItem` is shared with toolbar buttons that want a
   * hover tooltip; settings-menu rows already show the same text
   * inline, so the tooltip would cause screen readers to read the
   * label twice. Exposed here so manager-provided extras can reuse
   * the same stripping logic the panel applies to its own items.
   */
  stripInlineTooltip: (item: HTMLElement) => void;
}

export interface DraggablePanelOptions {
  player: Player;
  /**
   * Namespace for CSS classes, e.g. `'sign-language'` or `'transcript'`.
   * The final menu class is `{classPrefix}-{namespace}-settings-menu`
   * and item class is `{classPrefix}-{namespace}-settings-item`.
   */
  namespace: string;
  /** The button that opens the menu. */
  settingsButton: HTMLElement;
  /** Lazy draggable lookup (it may be re-created by the manager). */
  getDraggable: () => DraggableResizable | null;
  i18nKeys: DraggablePanelI18nKeys;
  /**
   * Horizontal anchoring of the menu relative to the settings button.
   * - `'left'` : align left edge (Transcript — header-row button).
   * - `'center'` : centre horizontally with viewport clamping (Sign
   *   language — floating near viewport edges).
   */
  menuAlign: 'left' | 'center';
  /** Where to attach the menu node when first created. */
  getMenuParent: () => HTMLElement | null;
  /**
   * Called when the drag-mode item is clicked. The manager is
   * expected to toggle drag mode and run any side effects
   * (announcements, badges, focus). After this runs the panel will
   * refresh menu item state.
   */
  onDragItemClick: (panel: DraggablePanel) => void;
  /** Same for the resize-mode item. */
  onResizeItemClick: (panel: DraggablePanel) => void;
  /**
   * Insert manager-specific items (style dialog, timestamps, ...)
   * between the resize item and the close item.
   */
  buildExtraItems?: (ctx: DraggablePanelExtrasContext) => void;
  /** Optional: vertical gap (px) between button and menu. */
  menuGap?: number;
  /** Optional: breathing room (px) before the menu flips above. */
  menuSpaceReserve?: number;
  /**
   * Where to attach the mode-feedback badge while keyboard drag /
   * pointer resize mode is active. If omitted, {@link DraggablePanel.showBadge}
   * is a no-op (the manager effectively opts out of the badge).
   */
  getBadgeHost?: () => HTMLElement | null;
  /**
   * CSS class for the badge element. Defaults to
   * `{classPrefix}-{namespace}-mode-badge`. Sign-language passes a
   * shorter class (`vidply-sign-mode-badge`) to preserve existing
   * CSS. Transcript uses the default.
   */
  badgeClass?: string;
}

export class DraggablePanel {
  private readonly opts: DraggablePanelOptions;

  /** Populated lazily on first `show()`. */
  settingsMenu: HTMLElement | null = null;
  settingsMenuVisible = false;
  dragOptionButton: HTMLElement | null = null;
  dragOptionText: Element | null = null;
  resizeOptionButton: HTMLElement | null = null;
  resizeOptionText: Element | null = null;

  private _justOpened = false;
  private _justOpenedTimer: ReturnType<typeof setTimeout> | null = null;
  private _keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private _documentClick: ((e: MouseEvent) => void) | null = null;
  private _documentClickAdded = false;
  private _modeBadge: HTMLElement | null = null;

  constructor(opts: DraggablePanelOptions) {
    this.opts = opts;
  }

  /** True while the just-opened debounce window (prevents the same
   *  click that opened the menu from also closing it via document
   *  `mousedown` / `click`). */
  get justOpened(): boolean {
    return this._justOpened;
  }

  get classPrefix(): string {
    return this.opts.player.options.classPrefix;
  }

  get menuClass(): string {
    return `${this.classPrefix}-${this.opts.namespace}-settings-menu`;
  }

  get itemClass(): string {
    return `${this.classPrefix}-${this.opts.namespace}-settings-item`;
  }

  /**
   * Show the menu. First call creates the DOM; subsequent calls reuse
   * it. Refreshes menu item state from the current draggable.
   */
  show(): void {
    this._markJustOpened(350);
    this._ensureDocumentClickHandler();

    if (this.settingsMenu) {
      this.settingsMenu.style.display = 'block';
      this.settingsMenuVisible = true;
      this.opts.settingsButton.setAttribute('aria-expanded', 'true');
      this._attachKeyboardNavigation();
      this._positionImmediate();
      this.refreshState();
      focusFirstMenuItem(this.settingsMenu, `.${this.itemClass}`);
      return;
    }

    this._createMenu();
  }

  /**
   * Hide the menu. By default returns focus to the settings button;
   * callers can opt out when the next interaction should land
   * elsewhere (e.g. on the wrapper after enabling drag mode).
   */
  hide({ focusButton = true }: { focusButton?: boolean } = {}): void {
    if (!this.settingsMenu) return;

    this.settingsMenu.style.display = 'none';
    this.settingsMenuVisible = false;
    this._clearJustOpened();

    if (this._keyHandler) {
      this.settingsMenu.removeEventListener('keydown', this._keyHandler, true);
      this._keyHandler = null;
    }

    const items = this.settingsMenu.querySelectorAll<HTMLElement>(`.${this.itemClass}`);
    items.forEach((item) => item.setAttribute('tabindex', '-1'));

    const { settingsButton } = this.opts;
    settingsButton.setAttribute('aria-expanded', 'false');
    if (focusButton) {
      settingsButton.focus({ preventScroll: true });
    }
  }

  toggle(): void {
    if (this.settingsMenuVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /** Set a short "just opened" guard so the document-click handler
   *  attached for outside-dismissal ignores the originating click. */
  markJustOpenedForClick(): void {
    if (this._documentClick) {
      this._markJustOpened(100);
    }
  }

  /** Refresh the drag and resize toggle item state from the draggable. */
  refreshState(): void {
    this.refreshDragState();
    this.refreshResizeState();
  }

  refreshDragState(): void {
    const draggable = this.opts.getDraggable();
    updateToggleMenuItem(this.dragOptionButton, this.dragOptionText, {
      enabled: Boolean(draggable?.keyboardDragMode),
      enabledText: i18n.t(this.opts.i18nKeys.disableDrag),
      disabledText: i18n.t(this.opts.i18nKeys.enableDrag),
      enabledAria: i18n.t(this.opts.i18nKeys.disableDragAria),
      disabledAria: i18n.t(this.opts.i18nKeys.enableDragAria),
    });
  }

  refreshResizeState(): void {
    const draggable = this.opts.getDraggable();
    updateToggleMenuItem(this.resizeOptionButton, this.resizeOptionText, {
      enabled: Boolean(draggable?.pointerResizeMode),
      enabledText: i18n.t(this.opts.i18nKeys.disableResize),
      disabledText: i18n.t(this.opts.i18nKeys.enableResize),
      enabledAria: i18n.t(this.opts.i18nKeys.disableResizeAria),
      disabledAria: i18n.t(this.opts.i18nKeys.enableResizeAria),
    });
  }

  /**
   * Show a persistent mode-feedback badge (e.g. "Drag mode: arrow
   * keys to move, Esc to exit") anchored to the host element
   * returned by `getBadgeHost`. Replaces any previous badge. The
   * badge is a real DOM element (not a CSS pseudo-element) so its
   * text is translatable, selectable, visible under high-contrast
   * themes, and reflected in browser translation overlays.
   *
   * Marked `aria-hidden` because the accompanying live-region
   * announcement (the manager's responsibility) already conveys the
   * state change to assistive tech.
   */
  showBadge(text: string): void {
    const host = this.opts.getBadgeHost?.();
    if (!host) return;
    this.hideBadge();

    const className =
      this.opts.badgeClass ??
      `${this.classPrefix}-${this.opts.namespace}-mode-badge`;
    const badge = DOMUtils.createElement('span', {
      className,
      textContent: text,
      attributes: { 'aria-hidden': 'true' },
    });
    host.appendChild(badge);
    this._modeBadge = badge;
  }

  /** Remove the mode-feedback badge if one is showing. */
  hideBadge(): void {
    if (this._modeBadge && this._modeBadge.parentNode) {
      this._modeBadge.remove();
    }
    this._modeBadge = null;
  }

  /** RAF-deferred reposition (e.g. after a panel resize). */
  reposition(): void {
    positionSettingsMenuDeferred(this.settingsMenu, this.opts.settingsButton, {
      align: this.opts.menuAlign,
      gap: this.opts.menuGap ?? 4,
      spaceReserve: this.opts.menuSpaceReserve ?? 20,
    });
  }

  /**
   * Tear down any DOM/listeners owned by this panel. Safe to call
   * multiple times. Callers must still drop their own references.
   */
  destroy(): void {
    if (this._justOpenedTimer) {
      clearTimeout(this._justOpenedTimer);
      this._justOpenedTimer = null;
    }
    this._justOpened = false;

    this.hideBadge();

    if (this.settingsMenu) {
      if (this._keyHandler) {
        this.settingsMenu.removeEventListener('keydown', this._keyHandler, true);
      }
      this.settingsMenu.remove();
      this.settingsMenu = null;
    }

    this._keyHandler = null;
    this.settingsMenuVisible = false;
    this.dragOptionButton = null;
    this.dragOptionText = null;
    this.resizeOptionButton = null;
    this.resizeOptionText = null;

    // The document-click listener was attached with the player's
    // lifecycleSignal, so it is cleaned up automatically. We clear
    // the local reference so a later show() re-installs.
    this._documentClick = null;
    this._documentClickAdded = false;
  }

  private _createMenu(): void {
    const { player, settingsButton, i18nKeys } = this.opts;

    const menu = DOMUtils.createElement('div', {
      className: this.menuClass,
      attributes: { role: 'menu' },
    });
    this.settingsMenu = menu;

    const dragOption = createMenuItem({
      classPrefix: this.classPrefix,
      itemClass: this.itemClass,
      icon: 'move',
      label: i18nKeys.enableDrag,
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.opts.onDragItemClick(this);
        this.refreshState();
      },
    });
    dragOption.setAttribute('role', 'switch');
    dragOption.setAttribute('aria-checked', 'false');
    dragOption.setAttribute('data-setting', 'keyboard-drag');
    this._stripInlineTooltip(dragOption);
    this.dragOptionButton = dragOption;
    this.dragOptionText = dragOption.querySelector(`.${this.classPrefix}-settings-text`);

    const resizeOption = createMenuItem({
      classPrefix: this.classPrefix,
      itemClass: this.itemClass,
      icon: 'resize',
      label: i18nKeys.enableResize,
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.opts.onResizeItemClick(this);
        this.refreshState();
      },
    });
    resizeOption.setAttribute('role', 'switch');
    resizeOption.setAttribute('aria-checked', 'false');
    this._stripInlineTooltip(resizeOption);
    this.resizeOptionButton = resizeOption;
    this.resizeOptionText = resizeOption.querySelector(`.${this.classPrefix}-settings-text`);

    menu.appendChild(dragOption);
    menu.appendChild(resizeOption);

    if (this.opts.buildExtraItems) {
      this.opts.buildExtraItems({
        menu,
        itemClass: this.itemClass,
        classPrefix: this.classPrefix,
        stripInlineTooltip: (item) => this._stripInlineTooltip(item),
      });
    }

    const closeOption = createMenuItem({
      classPrefix: this.classPrefix,
      itemClass: this.itemClass,
      icon: 'close',
      label: i18nKeys.closeMenu,
      onClick: () => this.hide(),
    });
    this._stripInlineTooltip(closeOption);
    menu.appendChild(closeOption);

    menu.style.visibility = 'hidden';
    menu.style.display = 'block';

    const parent = this.opts.getMenuParent();
    if (settingsButton.parentNode) {
      settingsButton.insertAdjacentElement('afterend', menu);
    } else if (parent) {
      parent.appendChild(menu);
    }

    this._positionImmediate();

    requestAnimationFrame(() => {
      if (this.settingsMenu) {
        this.settingsMenu.style.visibility = 'visible';
      }
    });

    this._attachKeyboardNavigation();

    this.settingsMenuVisible = true;
    settingsButton.setAttribute('aria-expanded', 'true');
    this.refreshState();

    focusFirstMenuItem(menu, `.${this.itemClass}`);

    // Don't reveal the fact that we created the menu to callers that
    // didn't trigger show() explicitly — but this is always driven
    // by a show() so the `player` reference is just for
    // documentation clarity here.
    void player;
  }

  private _attachKeyboardNavigation(): void {
    const menu = this.settingsMenu;
    if (!menu) return;
    if (this._keyHandler) {
      menu.removeEventListener('keydown', this._keyHandler, true);
    }
    const handler = attachMenuKeyboardNavigation(
      menu,
      this.opts.settingsButton,
      `.${this.itemClass}`,
      () => this.hide({ focusButton: true })
    );
    this._keyHandler = handler ?? null;
  }

  private _positionImmediate(): void {
    positionSettingsMenu(this.settingsMenu, this.opts.settingsButton, {
      align: this.opts.menuAlign,
      gap: this.opts.menuGap ?? 4,
      spaceReserve: this.opts.menuSpaceReserve ?? 20,
    });
  }

  /**
   * Remove tooltip and duplicate button-text nodes from a menu item.
   * `createMenuItem` is used both for toolbar buttons (which want a
   * tooltip) and for settings-menu rows (which show the same text
   * inline). This strips the duplicated pieces so screen readers
   * don't read the label twice.
   */
  private _stripInlineTooltip(item: HTMLElement): void {
    const tooltip = item.querySelector(`.${this.classPrefix}-tooltip`);
    if (tooltip) tooltip.remove();
    const buttonText = item.querySelector(`.${this.classPrefix}-button-text`);
    if (buttonText) buttonText.remove();
  }

  private _markJustOpened(durationMs: number): void {
    this._justOpened = true;
    if (this._justOpenedTimer) {
      clearTimeout(this._justOpenedTimer);
    }
    this._justOpenedTimer = setTimeout(() => {
      this._justOpened = false;
      this._justOpenedTimer = null;
    }, durationMs);
  }

  private _clearJustOpened(): void {
    this._justOpened = false;
    if (this._justOpenedTimer) {
      clearTimeout(this._justOpenedTimer);
      this._justOpenedTimer = null;
    }
  }

  private _ensureDocumentClickHandler(): void {
    if (this._documentClickAdded) return;

    this._documentClick = (event: MouseEvent) => {
      if (this._justOpened) return;
      const target = event.target as Node | null;
      const { settingsButton } = this.opts;

      if (settingsButton === target || (target && settingsButton.contains(target))) {
        return;
      }
      if (this.settingsMenu && target && this.settingsMenu.contains(target)) {
        return;
      }
      if (this.settingsMenuVisible) {
        this.hide();
      }
    };

    // Delay attach so the click that opened the menu doesn't instantly
    // close it even if the justOpened flag somehow races.
    setTimeout(() => {
      const handler = this._documentClick;
      if (!handler) return;
      document.addEventListener('mousedown', handler, {
        capture: true,
        signal: this.opts.player.lifecycleSignal,
      });
      this._documentClickAdded = true;
    }, 300);
  }
}
