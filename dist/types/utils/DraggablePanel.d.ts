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
export declare class DraggablePanel {
    private readonly opts;
    /** Populated lazily on first `show()`. */
    settingsMenu: HTMLElement | null;
    settingsMenuVisible: boolean;
    dragOptionButton: HTMLElement | null;
    dragOptionText: Element | null;
    resizeOptionButton: HTMLElement | null;
    resizeOptionText: Element | null;
    private _justOpened;
    private _justOpenedTimer;
    private _keyHandler;
    private _documentClick;
    private _documentClickAdded;
    private _modeBadge;
    constructor(opts: DraggablePanelOptions);
    /** True while the just-opened debounce window (prevents the same
     *  click that opened the menu from also closing it via document
     *  `mousedown` / `click`). */
    get justOpened(): boolean;
    get classPrefix(): string;
    get menuClass(): string;
    get itemClass(): string;
    /**
     * Show the menu. First call creates the DOM; subsequent calls reuse
     * it. Refreshes menu item state from the current draggable.
     */
    show(): void;
    /**
     * Hide the menu. By default returns focus to the settings button;
     * callers can opt out when the next interaction should land
     * elsewhere (e.g. on the wrapper after enabling drag mode).
     */
    hide({ focusButton }?: {
        focusButton?: boolean;
    }): void;
    toggle(): void;
    /** Set a short "just opened" guard so the document-click handler
     *  attached for outside-dismissal ignores the originating click. */
    markJustOpenedForClick(): void;
    /** Refresh the drag and resize toggle item state from the draggable. */
    refreshState(): void;
    refreshDragState(): void;
    refreshResizeState(): void;
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
    showBadge(text: string): void;
    /** Remove the mode-feedback badge if one is showing. */
    hideBadge(): void;
    /** RAF-deferred reposition (e.g. after a panel resize). */
    reposition(): void;
    /**
     * Tear down any DOM/listeners owned by this panel. Safe to call
     * multiple times. Callers must still drop their own references.
     */
    destroy(): void;
    private _createMenu;
    private _attachKeyboardNavigation;
    private _positionImmediate;
    /**
     * Remove tooltip and duplicate button-text nodes from a menu item.
     * `createMenuItem` is used both for toolbar buttons (which want a
     * tooltip) and for settings-menu rows (which show the same text
     * inline). This strips the duplicated pieces so screen readers
     * don't read the label twice.
     */
    private _stripInlineTooltip;
    private _markJustOpened;
    private _clearJustOpened;
    private _ensureDocumentClickHandler;
}
//# sourceMappingURL=DraggablePanel.d.ts.map