/**
 * Context menu entries
 *
 * Builds the list of actions the VidPly context menu offers for the player's
 * current state. The list is rebuilt every time the menu opens, so it only
 * contains what works right now (captions, chapters, quality levels, live
 * controls and playlist buttons all change after metadata loads).
 */
import type { Player } from '../core/Player.js';
export type ContextMenuEntryType = 'action' | 'checkbox' | 'radio' | 'submenu' | 'separator';
export interface ContextMenuEntry {
    id: string;
    type: ContextMenuEntryType;
    label?: string;
    /** BCP 47 language of the label (caption track names). */
    lang?: string;
    checked?: boolean;
    /** Non-operable placeholder (empty submenu). */
    disabled?: boolean;
    /** Visible shortcut hint, e.g. "Space" or "M". */
    shortcut?: string;
    /** Value for `aria-keyshortcuts`. */
    ariaShortcut?: string;
    /** Submenu entries; may load lazily (embed caption tracks). */
    children?: () => ContextMenuEntry[] | Promise<ContextMenuEntry[]>;
    /** Shown as a disabled item when `children` resolves to nothing. */
    emptyLabel?: string;
    run?: () => void;
}
/**
 * Whether a control-bar button is offered right now. Besides
 * `ControlBar.hasControl()` (connected, no `hidden` attribute) this also
 * honours buttons hidden with `display: none` for missing features, while
 * still counting buttons that only collapsed into the overflow menu.
 */
export declare function isControlAvailable(player: Player, name: string): boolean;
/** Drop empty slots and leading, trailing or repeated separators. */
export declare function normalizeEntries(entries: Array<ContextMenuEntry | null>): ContextMenuEntry[];
export declare function getContextMenuEntries(player: Player): ContextMenuEntry[];
//# sourceMappingURL=PlayerContextActions.d.ts.map