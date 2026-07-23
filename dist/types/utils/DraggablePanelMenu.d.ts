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
export declare function updateToggleMenuItem(button: HTMLElement | null | undefined, textElement: Element | null | undefined, state: ToggleMenuItemState): void;
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
export declare function positionSettingsMenu(menu: HTMLElement | null | undefined, button: HTMLElement | null | undefined, opts?: PositionSettingsMenuOptions): void;
/**
 * RAF-deferred wrapper around {@link positionSettingsMenu}. Some
 * callers need to re-position after layout has settled (e.g. when the
 * panel size just changed and `getBoundingClientRect` would still
 * return the pre-change measurements on this frame).
 */
export declare function positionSettingsMenuDeferred(menu: HTMLElement | null | undefined, button: HTMLElement | null | undefined, opts?: PositionSettingsMenuOptions): void;
//# sourceMappingURL=DraggablePanelMenu.d.ts.map