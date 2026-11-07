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
import { type ContextMenuEntry } from './PlayerContextActions.js';
import type { Player } from '../core/Player.js';
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
export declare class ContextMenuManager {
    player: Player;
    private levels;
    private returnFocus;
    private lastPointerType;
    private keyboardRequestAt;
    private openPoint;
    private pointerMovedSinceOpen;
    private lastMouse;
    private hoveredItem;
    private listeners;
    private submenuTimer;
    private submenuToken;
    private typeahead;
    private typeaheadTimer;
    private idCounter;
    private playerHandlers;
    constructor(player: Player);
    get isOpen(): boolean;
    /** The open menu levels, top level first. */
    get menus(): HTMLElement[];
    private get prefix();
    private attachEvents;
    handleContextMenu(e: MouseEvent): void;
    /** Targets where the browser menu is more useful (paste, open link, copy). */
    private prefersNativeMenu;
    /** Modal dialogs and keyboard drag/resize modes own the interaction. */
    private isBlocked;
    private keyboardAnchor;
    open(entries: ContextMenuEntry[], point: Point, focusFirstItem?: boolean): void;
    close(restoreFocus?: boolean): void;
    destroy(): void;
    private attachGlobalListeners;
    private createLevel;
    private createItem;
    private showLevel;
    private removeLevel;
    private viewport;
    /**
     * Top-left corner at the pointer; flip left/up at the viewport edge when the
     * menu fits there, otherwise shift it inside the viewport.
     */
    positionAtPoint(menu: HTMLElement, point: Point): void;
    /** Beside the parent menu, aligned with the parent item; flips left near the edge. */
    positionSubmenu(menu: HTMLElement, parentItem: HTMLElement): void;
    private handlePointerMove;
    private isHeadingTo;
    private hoverItem;
    private scheduleSubmenu;
    private clearSubmenuTimer;
    private closeLevelsAfter;
    openSubmenu(item: HTMLElement, level: MenuLevel, focusFirst: boolean): Promise<void>;
    private checkedIndex;
    private focusItem;
    activate(item: HTMLElement, level: MenuLevel): void;
    handleKeydown(e: KeyboardEvent, level: MenuLevel): void;
    private closeLevel;
    private handleTypeahead;
}
export {};
//# sourceMappingURL=ContextMenuManager.d.ts.map