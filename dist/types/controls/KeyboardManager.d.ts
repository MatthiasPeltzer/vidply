/**
 * Keyboard Accessibility Manager
 */
import type { Player } from '../core/Player.js';
import type { KeyboardShortcuts } from '../types/options.js';
export declare class KeyboardManager {
    player: Player;
    shortcuts: KeyboardShortcuts;
    private announcer;
    private _announceReady;
    private _prevMuted;
    private _stateAnnouncers;
    private _announceVolume;
    constructor(player: Player);
    init(): void;
    /**
     * Subscribe to player state-change events so play/pause, mute, volume,
     * captions, fullscreen and speed changes are announced to assistive tech
     * regardless of whether the user used the keyboard, mouse or touch
     * (WCAG 4.1.3 Status Messages).
     */
    attachStateAnnouncements(): void;
    attachEvents(): void;
    handleKeydown(e: KeyboardEvent): void;
    executeAction(action: string, _event: KeyboardEvent): boolean;
    announceAction(action: string): void;
    /**
     * Live-region announcer scoped to *this* player instance so multi-player
     * pages do not cross-talk through a shared `#vidply-announcer` id. The
     * region is appended to `document.body` so it is reachable regardless of
     * the embedding container's stacking / overflow context.
     */
    announce(message: string, priority?: 'polite' | 'assertive'): void;
    updateShortcut(action: string, keys: string[]): void;
    destroy(): void;
}
//# sourceMappingURL=KeyboardManager.d.ts.map