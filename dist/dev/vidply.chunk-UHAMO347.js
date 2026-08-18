/*!
 * VidPly v1.2.12 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  createIconElement
} from "./vidply.chunk-6YJYJIXT.js";
import {
  focusElement
} from "./vidply.chunk-7ZKP3GF6.js";
import {
  reducedMotionScrollOptions
} from "./vidply.chunk-W5UG6DRH.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-EA656DP6.js";

// src/utils/FormUtils.ts
function createLabeledSelect({
  classPrefix: _classPrefix,
  labelClass,
  selectClass,
  labelText,
  selectId,
  hidden = false,
  onChange = void 0,
  options = []
}) {
  const isI18nKey = typeof labelText === "string" && (labelText.startsWith("transcript.") || labelText.startsWith("player.") || labelText.startsWith("settings.") || labelText.startsWith("captions."));
  const labelTextContent = isI18nKey ? i18n.t(labelText) || labelText : labelText;
  const label = DOMUtils.createElement("label", {
    className: labelClass,
    textContent: labelTextContent,
    attributes: {
      for: selectId,
      style: hidden ? "display: none;" : void 0
    }
  });
  const select = DOMUtils.createElement("select", {
    className: selectClass,
    attributes: {
      id: selectId,
      style: hidden ? "display: none;" : void 0
    }
  });
  options.forEach((opt) => {
    const option = DOMUtils.createElement("option", {
      textContent: opt.text,
      attributes: {
        value: opt.value,
        selected: opt.selected ? "selected" : void 0
      }
    });
    select.appendChild(option);
  });
  if (onChange) {
    select.addEventListener("change", onChange);
  }
  return { label, select };
}
function preventDragOnElement(element) {
  if (!element) return;
  ["pointerdown", "mousedown", "click"].forEach((eventType) => {
    element.addEventListener(eventType, (e) => {
      e.stopPropagation();
    });
  });
}

// src/utils/MenuUtils.ts
function createMenuItem({
  classPrefix,
  itemClass,
  icon,
  label,
  ariaLabel,
  onClick,
  hasTextClass = false
}) {
  const isI18nKeyForAria = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
  const ariaLabelText = ariaLabel || (isI18nKeyForAria ? i18n.t(label) || label : label);
  const button = DOMUtils.createElement("button", {
    className: itemClass,
    attributes: {
      type: "button",
      "aria-label": ariaLabelText,
      tabindex: "-1"
    }
  });
  if (icon) {
    button.appendChild(createIconElement(icon));
  }
  const isI18nKey = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
  const textContent = isI18nKey ? i18n.t(label) || label : label;
  const text = DOMUtils.createElement("span", {
    textContent,
    className: hasTextClass ? `${classPrefix}-settings-text` : void 0,
    attributes: { "aria-hidden": "true" }
  });
  button.appendChild(text);
  if (onClick) {
    button.addEventListener("click", onClick);
  }
  return button;
}
function attachMenuKeyboardNavigation(menu, button, itemSelector, onClose) {
  if (!menu) return void 0;
  const menuItems = Array.from(menu.querySelectorAll(itemSelector)).filter((item) => item.getAttribute("aria-disabled") !== "true");
  if (menuItems.length === 0) return void 0;
  const handleKeyDown = (e) => {
    const currentIndex = menuItems.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        e.stopPropagation();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === nextIndex ? "0" : "-1");
        });
        const next = menuItems[nextIndex];
        if (next) {
          next.focus({ preventScroll: false });
          next.scrollIntoView(reducedMotionScrollOptions("nearest"));
        }
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        e.stopPropagation();
        const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === prevIndex ? "0" : "-1");
        });
        const prev = menuItems[prevIndex];
        if (prev) {
          prev.focus({ preventScroll: false });
          prev.scrollIntoView(reducedMotionScrollOptions("nearest"));
        }
        break;
      }
      case "Home": {
        e.preventDefault();
        e.stopPropagation();
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === 0 ? "0" : "-1");
        });
        const firstItem = menuItems[0];
        if (firstItem) {
          firstItem.focus({ preventScroll: false });
          firstItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
        }
        break;
      }
      case "End": {
        e.preventDefault();
        e.stopPropagation();
        const lastIndex = menuItems.length - 1;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === lastIndex ? "0" : "-1");
        });
        const lastItem = menuItems[lastIndex];
        if (lastItem) {
          lastItem.focus({ preventScroll: false });
          lastItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
        }
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement && menuItems.includes(document.activeElement)) {
          document.activeElement.click();
          if (onClose) {
            setTimeout(() => {
              if (button && document.contains(button)) {
                button.focus();
              }
            }, 0);
          }
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        if (onClose) {
          onClose();
        }
        break;
    }
  };
  menu.addEventListener("keydown", handleKeyDown, true);
  return handleKeyDown;
}
function focusFirstMenuItem(menu, itemSelector, delay = 0) {
  if (!menu) return;
  setTimeout(() => {
    const menuItems = Array.from(menu.querySelectorAll(itemSelector)).filter((item) => item.getAttribute("aria-disabled") !== "true");
    const firstItem = menuItems[0];
    if (firstItem) {
      menuItems.forEach((item, index) => {
        item.setAttribute("tabindex", index === 0 ? "0" : "-1");
      });
      focusElement(firstItem, { delay: 0 });
      firstItem.scrollIntoView(reducedMotionScrollOptions("nearest"));
    }
  }, delay);
}

// src/utils/DraggablePanelMenu.ts
function updateToggleMenuItem(button, textElement, state) {
  if (!button) return;
  button.setAttribute("aria-checked", state.enabled ? "true" : "false");
  button.setAttribute("aria-label", state.enabled ? state.enabledAria : state.disabledAria);
  if (textElement) {
    textElement.textContent = state.enabled ? state.enabledText : state.disabledText;
  }
}
function positionSettingsMenu(menu, button, opts = {}) {
  if (!menu || !button) return;
  const { align = "left", gap = 4, spaceReserve = 20 } = opts;
  const parentContainer = button.parentElement;
  if (!parentContainer) return;
  const buttonRect = button.getBoundingClientRect();
  const parentRect = parentContainer.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const buttonBottom = buttonRect.bottom - parentRect.top;
  const buttonTop = buttonRect.top - parentRect.top;
  const buttonLeftOffset = buttonRect.left - parentRect.left;
  const buttonCenterX = buttonLeftOffset + buttonRect.width / 2;
  const spaceAbove = buttonRect.top;
  const spaceBelow = viewportHeight - buttonRect.bottom;
  let menuTop = buttonBottom + gap;
  let menuBottomPx = null;
  if (spaceBelow < menuRect.height + spaceReserve && spaceAbove > spaceBelow) {
    if (align === "center") {
      const parentHeight = parentRect.bottom - parentRect.top;
      menuBottomPx = parentHeight - buttonTop + gap;
      menuTop = null;
    } else {
      menuTop = buttonTop - menuRect.height - gap;
    }
    menu.classList.add("vidply-menu-above");
  } else {
    menu.classList.remove("vidply-menu-above");
  }
  let leftValue;
  let rightValue;
  let transform;
  if (align === "center") {
    const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
    if (menuLeftAbsolute < 10) {
      leftValue = "0";
      rightValue = "auto";
      transform = "translateX(0)";
    } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
      leftValue = "auto";
      rightValue = "0";
      transform = "translateX(0)";
    } else {
      leftValue = `${buttonCenterX}px`;
      rightValue = "auto";
      transform = "translateX(-50%)";
    }
  } else {
    leftValue = `${buttonLeftOffset}px`;
    rightValue = "auto";
    transform = "translateX(0)";
  }
  if (menuTop !== null) {
    menu.style.top = `${menuTop}px`;
    menu.style.bottom = "auto";
  } else if (menuBottomPx !== null) {
    menu.style.top = "auto";
    menu.style.bottom = `${menuBottomPx}px`;
  }
  menu.style.left = leftValue;
  menu.style.right = rightValue;
  menu.style.transform = transform;
}
function positionSettingsMenuDeferred(menu, button, opts = {}) {
  requestAnimationFrame(() => {
    setTimeout(() => positionSettingsMenu(menu, button, opts), 10);
  });
}

// src/utils/DraggablePanel.ts
var DraggablePanel = class {
  opts;
  /** Populated lazily on first `show()`. */
  settingsMenu = null;
  settingsMenuVisible = false;
  dragOptionButton = null;
  dragOptionText = null;
  resizeOptionButton = null;
  resizeOptionText = null;
  _justOpened = false;
  _justOpenedTimer = null;
  _keyHandler = null;
  _documentClick = null;
  _documentClickAdded = false;
  _modeBadge = null;
  constructor(opts) {
    this.opts = opts;
  }
  /** True while the just-opened debounce window (prevents the same
   *  click that opened the menu from also closing it via document
   *  `mousedown` / `click`). */
  get justOpened() {
    return this._justOpened;
  }
  get classPrefix() {
    return this.opts.player.options.classPrefix;
  }
  get menuClass() {
    return `${this.classPrefix}-${this.opts.namespace}-settings-menu`;
  }
  get itemClass() {
    return `${this.classPrefix}-${this.opts.namespace}-settings-item`;
  }
  /**
   * Show the menu. First call creates the DOM; subsequent calls reuse
   * it. Refreshes menu item state from the current draggable.
   */
  show() {
    this._markJustOpened(350);
    this._ensureDocumentClickHandler();
    if (this.settingsMenu) {
      this.settingsMenu.style.display = "block";
      this.settingsMenuVisible = true;
      this.opts.settingsButton.setAttribute("aria-expanded", "true");
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
  hide({ focusButton = true } = {}) {
    if (!this.settingsMenu) return;
    this.settingsMenu.style.display = "none";
    this.settingsMenuVisible = false;
    this._clearJustOpened();
    if (this._keyHandler) {
      this.settingsMenu.removeEventListener("keydown", this._keyHandler, true);
      this._keyHandler = null;
    }
    const items = this.settingsMenu.querySelectorAll(`.${this.itemClass}`);
    items.forEach((item) => item.setAttribute("tabindex", "-1"));
    const { settingsButton } = this.opts;
    settingsButton.setAttribute("aria-expanded", "false");
    if (focusButton) {
      settingsButton.focus({ preventScroll: true });
    }
  }
  toggle() {
    if (this.settingsMenuVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  /** Set a short "just opened" guard so the document-click handler
   *  attached for outside-dismissal ignores the originating click. */
  markJustOpenedForClick() {
    if (this._documentClick) {
      this._markJustOpened(100);
    }
  }
  /** Refresh the drag and resize toggle item state from the draggable. */
  refreshState() {
    this.refreshDragState();
    this.refreshResizeState();
  }
  refreshDragState() {
    const draggable = this.opts.getDraggable();
    updateToggleMenuItem(this.dragOptionButton, this.dragOptionText, {
      enabled: Boolean(draggable?.keyboardDragMode),
      enabledText: i18n.t(this.opts.i18nKeys.disableDrag),
      disabledText: i18n.t(this.opts.i18nKeys.enableDrag),
      enabledAria: i18n.t(this.opts.i18nKeys.disableDragAria),
      disabledAria: i18n.t(this.opts.i18nKeys.enableDragAria)
    });
  }
  refreshResizeState() {
    const draggable = this.opts.getDraggable();
    updateToggleMenuItem(this.resizeOptionButton, this.resizeOptionText, {
      enabled: Boolean(draggable?.pointerResizeMode),
      enabledText: i18n.t(this.opts.i18nKeys.disableResize),
      disabledText: i18n.t(this.opts.i18nKeys.enableResize),
      enabledAria: i18n.t(this.opts.i18nKeys.disableResizeAria),
      disabledAria: i18n.t(this.opts.i18nKeys.enableResizeAria)
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
  showBadge(text) {
    const host = this.opts.getBadgeHost?.();
    if (!host) return;
    this.hideBadge();
    const className = this.opts.badgeClass ?? `${this.classPrefix}-${this.opts.namespace}-mode-badge`;
    const badge = DOMUtils.createElement("span", {
      className,
      textContent: text,
      attributes: { "aria-hidden": "true" }
    });
    host.appendChild(badge);
    this._modeBadge = badge;
  }
  /** Remove the mode-feedback badge if one is showing. */
  hideBadge() {
    if (this._modeBadge && this._modeBadge.parentNode) {
      this._modeBadge.remove();
    }
    this._modeBadge = null;
  }
  /** RAF-deferred reposition (e.g. after a panel resize). */
  reposition() {
    positionSettingsMenuDeferred(this.settingsMenu, this.opts.settingsButton, {
      align: this.opts.menuAlign,
      gap: this.opts.menuGap ?? 4,
      spaceReserve: this.opts.menuSpaceReserve ?? 20
    });
  }
  /**
   * Tear down any DOM/listeners owned by this panel. Safe to call
   * multiple times. Callers must still drop their own references.
   */
  destroy() {
    if (this._justOpenedTimer) {
      clearTimeout(this._justOpenedTimer);
      this._justOpenedTimer = null;
    }
    this._justOpened = false;
    this.hideBadge();
    if (this.settingsMenu) {
      if (this._keyHandler) {
        this.settingsMenu.removeEventListener("keydown", this._keyHandler, true);
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
    this._documentClick = null;
    this._documentClickAdded = false;
  }
  _createMenu() {
    const { player, settingsButton, i18nKeys } = this.opts;
    const menu = DOMUtils.createElement("div", {
      className: this.menuClass,
      attributes: { role: "menu" }
    });
    this.settingsMenu = menu;
    const dragOption = createMenuItem({
      classPrefix: this.classPrefix,
      itemClass: this.itemClass,
      icon: "move",
      label: i18nKeys.enableDrag,
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.opts.onDragItemClick(this);
        this.refreshState();
      }
    });
    dragOption.setAttribute("role", "switch");
    dragOption.setAttribute("aria-checked", "false");
    dragOption.setAttribute("data-setting", "keyboard-drag");
    this._stripInlineTooltip(dragOption);
    this.dragOptionButton = dragOption;
    this.dragOptionText = dragOption.querySelector(`.${this.classPrefix}-settings-text`);
    const resizeOption = createMenuItem({
      classPrefix: this.classPrefix,
      itemClass: this.itemClass,
      icon: "resize",
      label: i18nKeys.enableResize,
      hasTextClass: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.opts.onResizeItemClick(this);
        this.refreshState();
      }
    });
    resizeOption.setAttribute("role", "switch");
    resizeOption.setAttribute("aria-checked", "false");
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
        stripInlineTooltip: (item) => this._stripInlineTooltip(item)
      });
    }
    const closeOption = createMenuItem({
      classPrefix: this.classPrefix,
      itemClass: this.itemClass,
      icon: "close",
      label: i18nKeys.closeMenu,
      onClick: () => this.hide()
    });
    this._stripInlineTooltip(closeOption);
    menu.appendChild(closeOption);
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    const parent = this.opts.getMenuParent();
    if (settingsButton.parentNode) {
      settingsButton.insertAdjacentElement("afterend", menu);
    } else if (parent) {
      parent.appendChild(menu);
    }
    this._positionImmediate();
    requestAnimationFrame(() => {
      if (this.settingsMenu) {
        this.settingsMenu.style.visibility = "visible";
      }
    });
    this._attachKeyboardNavigation();
    this.settingsMenuVisible = true;
    settingsButton.setAttribute("aria-expanded", "true");
    this.refreshState();
    focusFirstMenuItem(menu, `.${this.itemClass}`);
    void player;
  }
  _attachKeyboardNavigation() {
    const menu = this.settingsMenu;
    if (!menu) return;
    if (this._keyHandler) {
      menu.removeEventListener("keydown", this._keyHandler, true);
    }
    const handler = attachMenuKeyboardNavigation(
      menu,
      this.opts.settingsButton,
      `.${this.itemClass}`,
      () => this.hide({ focusButton: true })
    );
    this._keyHandler = handler ?? null;
  }
  _positionImmediate() {
    positionSettingsMenu(this.settingsMenu, this.opts.settingsButton, {
      align: this.opts.menuAlign,
      gap: this.opts.menuGap ?? 4,
      spaceReserve: this.opts.menuSpaceReserve ?? 20
    });
  }
  /**
   * Remove tooltip and duplicate button-text nodes from a menu item.
   * `createMenuItem` is used both for toolbar buttons (which want a
   * tooltip) and for settings-menu rows (which show the same text
   * inline). This strips the duplicated pieces so screen readers
   * don't read the label twice.
   */
  _stripInlineTooltip(item) {
    const tooltip = item.querySelector(`.${this.classPrefix}-tooltip`);
    if (tooltip) tooltip.remove();
    const buttonText = item.querySelector(`.${this.classPrefix}-button-text`);
    if (buttonText) buttonText.remove();
  }
  _markJustOpened(durationMs) {
    this._justOpened = true;
    if (this._justOpenedTimer) {
      clearTimeout(this._justOpenedTimer);
    }
    this._justOpenedTimer = setTimeout(() => {
      this._justOpened = false;
      this._justOpenedTimer = null;
    }, durationMs);
  }
  _clearJustOpened() {
    this._justOpened = false;
    if (this._justOpenedTimer) {
      clearTimeout(this._justOpenedTimer);
      this._justOpenedTimer = null;
    }
  }
  _ensureDocumentClickHandler() {
    if (this._documentClickAdded) return;
    this._documentClick = (event) => {
      if (this._justOpened) return;
      const target = event.target;
      const { settingsButton } = this.opts;
      if (settingsButton === target || target && settingsButton.contains(target)) {
        return;
      }
      if (this.settingsMenu && target && this.settingsMenu.contains(target)) {
        return;
      }
      if (this.settingsMenuVisible) {
        this.hide();
      }
    };
    setTimeout(() => {
      const handler = this._documentClick;
      if (!handler) return;
      document.addEventListener("mousedown", handler, {
        capture: true,
        signal: this.opts.player.lifecycleSignal
      });
      this._documentClickAdded = true;
    }, 300);
  }
};

export {
  createLabeledSelect,
  preventDragOnElement,
  createMenuItem,
  DraggablePanel
};
//# sourceMappingURL=vidply.chunk-UHAMO347.js.map
