/**
 * Keyboard Shortcuts Help Dialog
 *
 * A focus-trapped modal listing the player's active keyboard shortcuts.
 * Built lazily from `player.options.keyboardShortcuts` so it always reflects
 * the live bindings (including consumer overrides). Implements the standard
 * modal focus-trap, escape and return-focus behaviour for an accessible UX.
 */
import type { Player } from '../core/Player.js';
export declare class KeyboardHelp {
    player: Player;
    isOpen: boolean;
    overlay: HTMLElement | null;
    private _triggerElement;
    private _keydownHandler;
    private _content;
    private _inertedElements;
    constructor(player: Player);
    private get prefix();
    /**
     * Turn a raw KeyboardEvent.key value into a human-readable label. Arrow
     * keys become universally understood glyphs; the space bar and single
     * letters are normalised for legibility.
     */
    private formatKey;
    private createElement;
    /**
     * Whether a shortcut row is worth showing for *this* player. Feature actions
     * are hidden when their control isn't present (e.g. no captions track, an
     * audio-only player with no fullscreen). Core actions are always relevant.
     *
     * When the player has no control bar we can't infer availability, so nothing
     * is hidden — the shortcuts still work and we'd rather over-show than mislead.
     */
    private isActionRelevant;
    private buildShortcutList;
    show(): void;
    hide(): void;
    toggle(): void;
    destroy(): void;
}
//# sourceMappingURL=KeyboardHelp.d.ts.map