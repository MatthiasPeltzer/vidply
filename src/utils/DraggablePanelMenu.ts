/**
 * Shared helpers for the settings-menu items that toggle drag / resize
 * mode on a `DraggableResizable`-powered panel.
 *
 * Previously `SignLanguageManager` and `TranscriptManager` both carried
 * near-identical copies of:
 * - `updateDragOptionState` / `updateResizeOptionState`
 *   (button `aria-checked` + label + i18n-driven text sync)
 * - `positionSettingsMenuImmediate`
 *   (place the menu relative to the settings button, with above/below
 *   flipping and viewport-edge clamping)
 *
 * This module owns those pieces so a future manager (or a refactor of
 * an existing one) doesn't have to re-derive the rules from scratch.
 *
 * NOTE: the full "DraggablePanel" abstraction that also owns the menu
 * *contents* (language selector, style dialog, pinned state, etc.) is
 * deliberately NOT attempted here — the per-manager specifics are
 * significant and an attempt to unify them would churn security-
 * sensitive code without meaningfully reducing LOC.
 */

/** Visual state of a two-state ("currently enabled / currently disabled")
 *  toggle menu item. */
export interface ToggleMenuItemState {
  /** Whether the underlying mode is currently active. */
  enabled: boolean;
  /** Label shown when the mode is active (i.e. the label invites the
   *  user to disable it). */
  enabledText: string;
  /** Label shown when the mode is inactive. */
  disabledText: string;
  /** `aria-label` for screen readers when the mode is active. */
  enabledAria: string;
  /** `aria-label` for screen readers when the mode is inactive. */
  disabledAria: string;
}

/**
 * Sync a settings-menu toggle button's `aria-checked`, `aria-label`,
 * and visible text node with the current mode state. Both properties
 * are updated unconditionally so the element stays in sync even if a
 * previous render left them stale.
 *
 * The caller owns the DOM nodes; this helper only mutates known-safe
 * properties (no innerHTML), so a translated label with angle brackets
 * or ampersands is stored as text, not parsed as markup.
 */
export function updateToggleMenuItem(
  button: HTMLElement | null | undefined,
  textElement: Element | null | undefined,
  state: ToggleMenuItemState
): void {
  if (!button) return;

  button.setAttribute('aria-checked', state.enabled ? 'true' : 'false');
  button.setAttribute('aria-label', state.enabled ? state.enabledAria : state.disabledAria);

  if (textElement) {
    // `textContent` exists on `Node`, so we can accept the broader
    // `Element` type here and let callers pass either an `HTMLElement`
    // (TranscriptManager keeps the tighter type for the sake of its
    // `.style` access elsewhere) or a plain `Element` returned by
    // `querySelector`.
    textElement.textContent = state.enabled ? state.enabledText : state.disabledText;
  }
}

export interface PositionSettingsMenuOptions {
  /**
   * Horizontal anchoring:
   * - `'left'`   : align the menu's left edge with the button's left edge
   *                (the TranscriptManager convention — simple panels).
   * - `'center'` : centre the menu horizontally on the button, with
   *                viewport-edge clamping (the SignLanguageManager
   *                convention — small floating panel that can end up
   *                near the viewport edges).
   */
  align?: 'left' | 'center';
  /** Vertical gap (px) between button and menu. */
  gap?: number;
  /** Extra breathing room (px) before we decide to flip above. */
  spaceReserve?: number;
}

/**
 * Position a settings menu relative to its button, using offsets that
 * are relative to the button's offset parent (so transforms on ancestor
 * elements don't throw the layout off).
 *
 * When there isn't enough room below the button but there is room
 * above, the menu flips upward and picks up a `vidply-menu-above` CSS
 * class so arrows / drop-shadows can be mirrored via stylesheet.
 */
export function positionSettingsMenu(
  menu: HTMLElement | null | undefined,
  button: HTMLElement | null | undefined,
  opts: PositionSettingsMenuOptions = {}
): void {
  if (!menu || !button) return;
  const { align = 'left', gap = 4, spaceReserve = 20 } = opts;

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

  // Vertical placement: default below, flip above when tight.
  let menuTop: number | null = buttonBottom + gap;
  let menuBottomPx: number | null = null;
  if (spaceBelow < menuRect.height + spaceReserve && spaceAbove > spaceBelow) {
    if (align === 'center') {
      // Measure from the bottom edge of the parent so the menu sits
      // directly above the button without being pushed off-screen.
      const parentHeight = parentRect.bottom - parentRect.top;
      menuBottomPx = parentHeight - buttonTop + gap;
      menuTop = null;
    } else {
      menuTop = buttonTop - menuRect.height - gap;
    }
    menu.classList.add('vidply-menu-above');
  } else {
    menu.classList.remove('vidply-menu-above');
  }

  // Horizontal placement: simple left-align vs viewport-clamped centre.
  let leftValue: string;
  let rightValue: string;
  let transform: string;

  if (align === 'center') {
    const menuLeftAbsolute = buttonRect.left + buttonRect.width / 2 - menuRect.width / 2;
    if (menuLeftAbsolute < 10) {
      leftValue = '0';
      rightValue = 'auto';
      transform = 'translateX(0)';
    } else if (menuLeftAbsolute + menuRect.width > viewportWidth - 10) {
      leftValue = 'auto';
      rightValue = '0';
      transform = 'translateX(0)';
    } else {
      leftValue = `${buttonCenterX}px`;
      rightValue = 'auto';
      transform = 'translateX(-50%)';
    }
  } else {
    leftValue = `${buttonLeftOffset}px`;
    rightValue = 'auto';
    transform = 'translateX(0)';
  }

  if (menuTop !== null) {
    menu.style.top = `${menuTop}px`;
    menu.style.bottom = 'auto';
  } else if (menuBottomPx !== null) {
    menu.style.top = 'auto';
    menu.style.bottom = `${menuBottomPx}px`;
  }

  menu.style.left = leftValue;
  menu.style.right = rightValue;
  menu.style.transform = transform;
}

/**
 * RAF-deferred wrapper around {@link positionSettingsMenu}. Some
 * callers need to re-position after layout has settled (e.g. when the
 * panel size just changed and `getBoundingClientRect` would still
 * return the pre-change measurements on this frame).
 */
export function positionSettingsMenuDeferred(
  menu: HTMLElement | null | undefined,
  button: HTMLElement | null | undefined,
  opts: PositionSettingsMenuOptions = {}
): void {
  requestAnimationFrame(() => {
    // The extra setTimeout is intentional: older WebKit still reports
    // stale geometry during the first RAF callback following a DOM
    // mutation. A 10ms trailing microtask gives layout a chance to
    // settle without being user-perceptible.
    setTimeout(() => positionSettingsMenu(menu, button, opts), 10);
  });
}
