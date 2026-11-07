/**
 * Context Menu Manager
 *
 * Replaces the browser context menu on the player with a menu of the
 * player's own functions that looks and behaves like a native menu: it
 * opens at the pointer, flips at the viewport edge, renders in the top
 * layer, opens submenus on hover with a "safe triangle", and supports the
 * full menu keyboard model (arrows, Home/End, type-ahead, Escape per level).
 *
 * Shift + right-click with a mouse, touch and pen long-press, text fields,
 * links and selected text keep the browser's own menu.
 */

import { i18n } from '../i18n/i18n.js';
import { getContextMenuEntries, type ContextMenuEntry } from './PlayerContextActions.js';
import type { Player } from '../core/Player.js';

const SUBMENU_OPEN_DELAY = 250;
const SUBMENU_SWITCH_DELAY = 300;
const TYPEAHEAD_RESET = 500;
/** A `contextmenu` this soon after the Menu key or Shift+F10 came from the keyboard. */
const KEYBOARD_ORIGIN_WINDOW = 600;
const VIEWPORT_MARGIN = 4;
const SUBMENU_OVERLAP = 4;
/** Pointer travel needed before a right-button release activates an item. */
const RELEASE_MOVE_THRESHOLD = 4;

interface Point {
  x: number;
  y: number;
}

interface MenuLevel {
  element: HTMLElement;
  /** Operable items in visual order. */
  items: HTMLElement[];
  entries: Map<HTMLElement, ContextMenuEntry>;
  parentItem: HTMLElement | null;
}

/** Only one context menu is open per page, across all players. */
let openManager: ContextMenuManager | null = null;

function setOpenManager(manager: ContextMenuManager | null): void {
  openManager = manager;
}

function supportsPopover(): boolean {
  return typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
}

function pointInTriangle(p: Point, a: Point, b: Point, c: Point): boolean {
  const sign = (p1: Point, p2: Point, p3: Point) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

export class ContextMenuManager {
  player: Player;
  private levels: MenuLevel[] = [];
  private returnFocus: HTMLElement | null = null;
  private lastPointerType = 'mouse';
  private keyboardRequestAt = 0;
  private openPoint: Point | null = null;
  private pointerMovedSinceOpen = false;
  private lastMouse: Point | null = null;
  private hoveredItem: HTMLElement | null = null;
  private listeners: AbortController | null = null;
  private submenuTimer: ReturnType<typeof setTimeout> | null = null;
  private submenuToken = 0;
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private idCounter = 0;
  private playerHandlers: Array<{ event: string; handler: () => void }> = [];

  constructor(player: Player) {
    this.player = player;
    this.attachEvents();
  }

  get isOpen(): boolean {
    return this.levels.length > 0;
  }

  /** The open menu levels, top level first. */
  get menus(): HTMLElement[] {
    return this.levels.map((level) => level.element);
  }

  private get prefix(): string {
    return this.player.options.classPrefix;
  }

  private attachEvents(): void {
    const container = this.player.container;
    const signal = this.player.lifecycleSignal;

    container.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        this.lastPointerType = e.pointerType || 'mouse';
      },
      { capture: true, signal }
    );
    container.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
          this.keyboardRequestAt = Date.now();
        }
      },
      { capture: true, signal }
    );
    container.addEventListener('contextmenu', (e: MouseEvent) => this.handleContextMenu(e), {
      signal
    });

    const closeEvents = [
      'playlisttrackchange',
      'sourcechange',
      'fullscreenchange',
      'floatingchange'
    ];
    for (const event of closeEvents) {
      const handler = () => this.close(false);
      this.player.on(event as never, handler as never);
      this.playerHandlers.push({ event, handler });
    }
  }

  handleContextMenu(e: MouseEvent): void {
    const target = e.target instanceof Element ? e.target : null;
    if (target && this.levels.some((level) => level.element.contains(target))) {
      e.preventDefault();
      return;
    }
    if (e.defaultPrevented) return;

    const fromKeyboard = Date.now() - this.keyboardRequestAt < KEYBOARD_ORIGIN_WINDOW;
    if (!fromKeyboard) {
      if (this.lastPointerType === 'touch' || this.lastPointerType === 'pen') return;
      if (e.shiftKey) return;
    }
    if (!this.player.isContextMenuActive()) return;
    if (target && this.prefersNativeMenu(target)) return;
    if (this.isBlocked()) return;

    const entries = getContextMenuEntries(this.player);
    if (entries.length === 0) return;

    e.preventDefault();
    e.stopPropagation();
    this.open(
      entries,
      fromKeyboard ? this.keyboardAnchor() : { x: e.clientX, y: e.clientY },
      fromKeyboard
    );
  }

  /** Targets where the browser menu is more useful (paste, open link, copy). */
  private prefersNativeMenu(target: Element): boolean {
    if (
      target.closest(
        'input, textarea, select, [contenteditable=""], [contenteditable="true"], a[href]'
      )
    ) {
      return true;
    }
    const selection = typeof window.getSelection === 'function' ? window.getSelection() : null;
    return Boolean(
      selection &&
      !selection.isCollapsed &&
      selection.toString().trim() !== '' &&
      selection.containsNode(target, true)
    );
  }

  /** Modal dialogs and keyboard drag/resize modes own the interaction. */
  private isBlocked(): boolean {
    if (this.player.keyboardHelp?.isOpen) return true;
    const sign = this.player.signLanguageManager?.draggable;
    if (sign?.keyboardDragMode || sign?.keyboardResizeMode) return true;
    const transcript = this.player.transcriptManager?.draggableResizable;
    if (transcript?.keyboardDragMode || transcript?.keyboardResizeMode) return true;
    const modals = Array.from(
      this.player.container.querySelectorAll<HTMLElement>('[aria-modal="true"]')
    );
    return modals.some((modal) => !modal.hidden && getComputedStyle(modal).display !== 'none');
  }

  private keyboardAnchor(): Point {
    const active = document.activeElement;
    const element =
      active instanceof HTMLElement && this.player.container.contains(active)
        ? active
        : this.player.container;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + Math.min(16, rect.width / 2),
      y: rect.top + Math.min(16, rect.height / 2)
    };
  }

  open(entries: ContextMenuEntry[], point: Point, focusFirstItem = false): void {
    if (openManager && openManager !== this) {
      openManager.close(false);
    }
    this.close(false);
    this.player.controlBar?.closeOpenMenu();
    setOpenManager(this);

    const active = document.activeElement;
    this.returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;
    this.openPoint = point;
    this.pointerMovedSinceOpen = false;
    this.listeners = new AbortController();

    const level = this.createLevel(entries, i18n.t('contextMenu.label'), null);
    this.levels.push(level);
    this.showLevel(level);
    this.positionAtPoint(level.element, point);
    this.attachGlobalListeners(this.listeners.signal);

    if (focusFirstItem) {
      this.focusItem(level, 0);
    } else {
      level.element.focus({ preventScroll: true });
    }
  }

  close(restoreFocus = true): void {
    if (this.levels.length === 0) return;

    this.clearSubmenuTimer();
    this.submenuToken++;
    this.listeners?.abort();
    this.listeners = null;
    this.hoveredItem = null;
    this.typeahead = '';

    for (let level = this.levels.pop(); level; level = this.levels.pop()) {
      this.removeLevel(level);
    }
    if (openManager === this) {
      openManager = null;
    }

    const target = this.returnFocus;
    this.returnFocus = null;
    if (restoreFocus && target?.isConnected) {
      target.focus({ preventScroll: true });
    }
  }

  destroy(): void {
    this.close(false);
    for (const { event, handler } of this.playerHandlers) {
      this.player.off(event as never, handler as never);
    }
    this.playerHandlers = [];
  }

  private attachGlobalListeners(signal: AbortSignal): void {
    const insideMenu = (node: EventTarget | null) =>
      node instanceof Node && this.levels.some((level) => level.element.contains(node));

    document.addEventListener(
      'pointerdown',
      (e: PointerEvent) => {
        if (!insideMenu(e.target)) this.close(false);
      },
      { capture: true, signal }
    );
    // Focusing the player on pointerdown can scroll the page just before the
    // menu opens; that scroll event arrives late, so compare positions.
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    document.addEventListener(
      'scroll',
      (e: Event) => {
        if (insideMenu(e.target)) return;
        if (e.target === document && window.scrollX === scrollX && window.scrollY === scrollY) {
          return;
        }
        this.close(false);
      },
      { capture: true, signal }
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) this.close(false);
      },
      { signal }
    );
    window.addEventListener('blur', () => this.close(false), { signal });
    window.addEventListener('resize', () => this.close(false), { signal });
  }

  private createLevel(
    entries: ContextMenuEntry[],
    label: string,
    parentItem: HTMLElement | null
  ): MenuLevel {
    const menu = document.createElement('div');
    menu.className = `${this.prefix}-context-menu`;
    menu.id = `${this.prefix}-context-menu-${this.player.instanceId}-${++this.idCounter}`;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', label);
    menu.tabIndex = -1;
    if (supportsPopover()) {
      menu.setAttribute('popover', 'manual');
    }

    const level: MenuLevel = { element: menu, items: [], entries: new Map(), parentItem };
    for (const entry of entries) {
      if (entry.type === 'separator') {
        const sep = document.createElement('div');
        sep.className = `${this.prefix}-context-menu-separator`;
        sep.setAttribute('role', 'separator');
        menu.appendChild(sep);
        continue;
      }
      menu.appendChild(this.createItem(entry, level));
    }

    menu.addEventListener('keydown', (e: KeyboardEvent) => this.handleKeydown(e, level));
    menu.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    });
    // Keep clicks inside the menu from reaching player surfaces (play toggle).
    menu.addEventListener('click', (e: MouseEvent) => e.stopPropagation());
    return level;
  }

  private createItem(entry: ContextMenuEntry, level: MenuLevel): HTMLElement {
    const prefix = this.prefix;
    const item = document.createElement('div');
    item.className = `${prefix}-context-menu-item`;
    item.id = `${prefix}-context-menu-item-${this.player.instanceId}-${++this.idCounter}`;
    item.tabIndex = -1;

    const role =
      entry.type === 'checkbox'
        ? 'menuitemcheckbox'
        : entry.type === 'radio'
          ? 'menuitemradio'
          : 'menuitem';
    item.setAttribute('role', role);
    if (entry.type === 'checkbox' || entry.type === 'radio') {
      item.setAttribute('aria-checked', entry.checked ? 'true' : 'false');
    }
    if (entry.type === 'submenu') {
      item.setAttribute('aria-haspopup', 'menu');
      item.setAttribute('aria-expanded', 'false');
    }
    if (entry.ariaShortcut) {
      item.setAttribute('aria-keyshortcuts', entry.ariaShortcut);
    }
    if (entry.disabled) {
      item.setAttribute('aria-disabled', 'true');
    }

    const check = document.createElement('span');
    check.className = `${prefix}-context-menu-check`;
    check.setAttribute('aria-hidden', 'true');
    item.appendChild(check);

    const label = document.createElement('span');
    label.className = `${prefix}-context-menu-label`;
    label.textContent = entry.label ?? '';
    if (entry.lang) {
      label.lang = entry.lang;
    }
    item.appendChild(label);

    if (entry.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = `${prefix}-context-menu-shortcut`;
      shortcut.setAttribute('aria-hidden', 'true');
      shortcut.textContent = entry.shortcut;
      item.appendChild(shortcut);
    }

    if (entry.type === 'submenu') {
      const arrow = document.createElement('span');
      arrow.className = `${prefix}-context-menu-arrow`;
      arrow.setAttribute('aria-hidden', 'true');
      item.appendChild(arrow);
    }

    level.entries.set(item, entry);
    if (!entry.disabled) {
      level.items.push(item);
      item.addEventListener('pointermove', (e: PointerEvent) =>
        this.handlePointerMove(e, item, level)
      );
      item.addEventListener('click', (e: MouseEvent) => {
        if (e.button === 0) this.activate(item, level);
      });
      item.addEventListener('pointerup', (e: PointerEvent) => {
        // macOS opens on press: releasing the right button on an item after
        // moving there selects it, like the native menu.
        if (e.button === 2 && this.pointerMovedSinceOpen) this.activate(item, level);
      });
    }
    return item;
  }

  private showLevel(level: MenuLevel): void {
    const host =
      supportsPopover() || this.player.state.fullscreen ? this.player.container : document.body;
    host.appendChild(level.element);
    if (level.element.hasAttribute('popover')) {
      try {
        level.element.showPopover();
      } catch {
        // Already shown or detached; positioning below still applies.
      }
    }
  }

  private removeLevel(level: MenuLevel): void {
    if (level.element.hasAttribute('popover')) {
      try {
        level.element.hidePopover();
      } catch {
        // Not shown.
      }
    }
    level.element.remove();
    if (level.parentItem) {
      level.parentItem.setAttribute('aria-expanded', 'false');
      level.parentItem.removeAttribute('aria-controls');
    }
  }

  private viewport(): { width: number; height: number } {
    return {
      width: document.documentElement.clientWidth || window.innerWidth,
      height: document.documentElement.clientHeight || window.innerHeight
    };
  }

  /**
   * Top-left corner at the pointer; flip left/up at the viewport edge when the
   * menu fits there, otherwise shift it inside the viewport.
   */
  positionAtPoint(menu: HTMLElement, point: Point): void {
    const { width, height } = this.viewport();
    const rect = menu.getBoundingClientRect();
    let left = point.x + 1;
    let top = point.y + 1;
    if (left + rect.width > width - VIEWPORT_MARGIN && point.x - rect.width >= VIEWPORT_MARGIN) {
      left = point.x - rect.width;
    }
    if (top + rect.height > height - VIEWPORT_MARGIN && point.y - rect.height >= VIEWPORT_MARGIN) {
      top = point.y - rect.height;
    }
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, width - rect.width - VIEWPORT_MARGIN));
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, height - rect.height - VIEWPORT_MARGIN));
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  /** Beside the parent menu, aligned with the parent item; flips left near the edge. */
  positionSubmenu(menu: HTMLElement, parentItem: HTMLElement): void {
    const { width, height } = this.viewport();
    const parentMenu = parentItem.closest('[role="menu"]') ?? parentItem;
    const parentRect = parentMenu.getBoundingClientRect();
    const itemRect = parentItem.getBoundingClientRect();
    const rect = menu.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(menu).paddingTop) || 0;

    let left = parentRect.right - SUBMENU_OVERLAP;
    if (left + rect.width > width - VIEWPORT_MARGIN) {
      left = parentRect.left - rect.width + SUBMENU_OVERLAP;
    }
    let top = itemRect.top - padding;
    if (top + rect.height > height - VIEWPORT_MARGIN) {
      top = height - VIEWPORT_MARGIN - rect.height;
    }
    left = Math.max(VIEWPORT_MARGIN, left);
    top = Math.max(VIEWPORT_MARGIN, top);
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(top)}px`;
  }

  private handlePointerMove(e: PointerEvent, item: HTMLElement, level: MenuLevel): void {
    const point = { x: e.clientX, y: e.clientY };
    const previous = this.lastMouse;
    this.lastMouse = point;
    if (
      this.openPoint &&
      Math.hypot(point.x - this.openPoint.x, point.y - this.openPoint.y) > RELEASE_MOVE_THRESHOLD
    ) {
      this.pointerMovedSinceOpen = true;
    }
    if (this.hoveredItem === item) return;
    this.hoveredItem = item;

    const levelIndex = this.levels.indexOf(level);
    const child = this.levels[levelIndex + 1];
    if (
      child &&
      child.parentItem !== item &&
      previous &&
      this.isHeadingTo(previous, point, child.element)
    ) {
      // Moving diagonally towards the open submenu: do not switch yet.
      this.scheduleSubmenu(() => {
        if (this.hoveredItem === item) this.hoverItem(item, level);
      }, SUBMENU_SWITCH_DELAY);
      return;
    }
    this.hoverItem(item, level);
  }

  private isHeadingTo(from: Point, to: Point, submenu: HTMLElement): boolean {
    const rect = submenu.getBoundingClientRect();
    const edgeX = rect.left >= from.x ? rect.left : rect.right;
    return pointInTriangle(to, from, { x: edgeX, y: rect.top }, { x: edgeX, y: rect.bottom });
  }

  private hoverItem(item: HTMLElement, level: MenuLevel): void {
    this.clearSubmenuTimer();
    const levelIndex = this.levels.indexOf(level);
    if (levelIndex < 0) return;
    item.focus({ preventScroll: true });

    const child = this.levels[levelIndex + 1];
    if (child && child.parentItem !== item) {
      this.closeLevelsAfter(levelIndex);
    }
    const entry = level.entries.get(item);
    if (entry?.type === 'submenu' && !(child && child.parentItem === item)) {
      this.scheduleSubmenu(() => {
        if (this.hoveredItem === item) void this.openSubmenu(item, level, false);
      }, SUBMENU_OPEN_DELAY);
    }
  }

  private scheduleSubmenu(callback: () => void, delay: number): void {
    this.clearSubmenuTimer();
    this.submenuTimer = setTimeout(() => {
      this.submenuTimer = null;
      callback();
    }, delay);
  }

  private clearSubmenuTimer(): void {
    if (this.submenuTimer) {
      clearTimeout(this.submenuTimer);
      this.submenuTimer = null;
    }
  }

  private closeLevelsAfter(levelIndex: number): void {
    this.submenuToken++;
    while (this.levels.length > levelIndex + 1) {
      const level = this.levels.pop();
      if (level) this.removeLevel(level);
    }
  }

  async openSubmenu(item: HTMLElement, level: MenuLevel, focusFirst: boolean): Promise<void> {
    const entry = level.entries.get(item);
    if (!entry || entry.type !== 'submenu') return;
    const levelIndex = this.levels.indexOf(level);
    if (levelIndex < 0) return;

    const existing = this.levels[levelIndex + 1];
    if (existing && existing.parentItem === item) {
      if (focusFirst) this.focusItem(existing, this.checkedIndex(existing));
      return;
    }
    this.closeLevelsAfter(levelIndex);
    const token = ++this.submenuToken;

    const children = entry.children ? await entry.children() : [];
    if (token !== this.submenuToken || !this.levels.includes(level) || !item.isConnected) return;

    const list: ContextMenuEntry[] =
      children.length > 0
        ? children
        : [
            {
              id: `${entry.id}-empty`,
              type: 'action',
              label: entry.emptyLabel ?? '',
              disabled: true
            }
          ];
    const submenu = this.createLevel(list, entry.label ?? '', item);
    item.setAttribute('aria-expanded', 'true');
    item.setAttribute('aria-controls', submenu.element.id);
    this.levels.push(submenu);
    this.showLevel(submenu);
    this.positionSubmenu(submenu.element, item);

    if (focusFirst) {
      if (submenu.items.length > 0) {
        this.focusItem(submenu, this.checkedIndex(submenu));
      } else {
        submenu.element.focus({ preventScroll: true });
      }
    }
  }

  private checkedIndex(level: MenuLevel): number {
    const index = level.items.findIndex((item) => item.getAttribute('aria-checked') === 'true');
    return index >= 0 ? index : 0;
  }

  private focusItem(level: MenuLevel, index: number): void {
    const item = level.items[index];
    if (item) {
      this.hoveredItem = null;
      item.focus({ preventScroll: true });
      item.scrollIntoView?.({ block: 'nearest' });
    }
  }

  activate(item: HTMLElement, level: MenuLevel): void {
    const entry = level.entries.get(item);
    if (!entry || entry.disabled) return;
    if (entry.type === 'submenu') {
      void this.openSubmenu(item, level, true);
      return;
    }
    this.close(true);
    entry.run?.();
  }

  handleKeydown(e: KeyboardEvent, level: MenuLevel): void {
    const levelIndex = this.levels.indexOf(level);
    if (levelIndex < 0) return;
    const items = level.items;
    const current = items.indexOf(document.activeElement as HTMLElement);
    const last = items.length - 1;
    let handled = true;

    switch (e.key) {
      case 'ArrowDown':
        this.focusItem(level, current < 0 || current >= last ? 0 : current + 1);
        break;
      case 'ArrowUp':
        this.focusItem(level, current <= 0 ? last : current - 1);
        break;
      case 'Home':
        this.focusItem(level, 0);
        break;
      case 'End':
        this.focusItem(level, last);
        break;
      case 'ArrowRight': {
        const item = items[current];
        if (item && level.entries.get(item)?.type === 'submenu') {
          void this.openSubmenu(item, level, true);
        }
        break;
      }
      case 'ArrowLeft':
        if (levelIndex > 0) this.closeLevel(levelIndex);
        break;
      case 'Escape':
        if (levelIndex > 0) {
          this.closeLevel(levelIndex);
        } else {
          this.close(true);
        }
        break;
      case 'Enter':
      case ' ': {
        const item = items[current];
        if (item) this.activate(item, level);
        break;
      }
      case 'Tab':
        this.close(true);
        break;
      default:
        handled = this.handleTypeahead(e, level, current);
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  private closeLevel(levelIndex: number): void {
    const parentItem = this.levels[levelIndex]?.parentItem ?? null;
    this.closeLevelsAfter(levelIndex - 1);
    parentItem?.focus({ preventScroll: true });
  }

  private handleTypeahead(e: KeyboardEvent, level: MenuLevel, current: number): boolean {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey || e.key === ' ') return false;

    this.typeahead += e.key.toLocaleLowerCase();
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => {
      this.typeahead = '';
    }, TYPEAHEAD_RESET);

    const items = level.items;
    const start = this.typeahead.length === 1 ? current + 1 : Math.max(current, 0);
    for (let offset = 0; offset < items.length; offset++) {
      const index = (start + offset) % items.length;
      const text = items[index]
        ?.querySelector(`.${this.prefix}-context-menu-label`)
        ?.textContent?.trim()
        .toLocaleLowerCase();
      if (text?.startsWith(this.typeahead)) {
        this.focusItem(level, index);
        break;
      }
    }
    return true;
  }
}
