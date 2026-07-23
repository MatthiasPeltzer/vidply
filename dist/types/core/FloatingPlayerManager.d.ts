/**
 * Floating Player Manager
 *
 * Custom in-page Picture-in-Picture. Moves the entire player.container
 * into a position:fixed, draggable and resizable shell that lives outside
 * the document flow (appended to document.body). A transparent placeholder
 * preserves layout and, while floating, serves as the IntersectionObserver
 * sentinel so scroll-based auto-float/redock decisions stay anchored to
 * the original slot.
 *
 * Triggers:
 *   - pinned: the user clicks the control-bar PiP button (only when
 *     options.floating is true; otherwise the button uses native PiP).
 *     Pinned floating ignores scroll-based docking.
 *   - auto: the video is playing and the original slot has scrolled out
 *     of the viewport. Auto-float redocks automatically when the slot
 *     scrolls back in.
 *
 * Close button: pauses playback, exits the floating shell and marks the
 * current play session as dismissed so auto-float will not re-trigger
 * until the user presses play again (matches YouTube miniplayer UX).
 *
 * Only one player is allowed to float at a time across a page; enter()
 * broadcasts a 'vidply:floating-claim' CustomEvent that other managers
 * listen for and auto-exit on.
 */
import { DraggableResizable } from '../utils/DraggableResizable.js';
import type { Player } from './Player.js';
type FloatingState = 'pinned' | 'auto';
type ExitReason = 'manual' | 'auto' | 'dismiss' | 'claim' | 'destroy';
export declare class FloatingPlayerManager {
    player: Player;
    classPrefix: string;
    shell: HTMLElement | null;
    dragHandle: HTMLElement | null;
    closeButton: HTMLButtonElement | null;
    resizeHandles: HTMLElement[];
    placeholder: HTMLElement | null;
    draggable: DraggableResizable | null;
    originalParent: HTMLElement | null;
    originalNextSibling: Node | null;
    intersectionObserver: IntersectionObserver | null;
    observerTarget: HTMLElement | null;
    lastRatio: number;
    _autoDismissedThisPlay: boolean;
    _playListenerAttached: boolean;
    _onPlayAfterDismiss: (() => void) | null;
    _onClaim: ((event: Event) => void) | null;
    _onResize: (() => void) | null;
    _onKeyDown: ((event: KeyboardEvent) => void) | null;
    _onEnterFullscreen: (() => void) | null;
    _destroyed: boolean;
    _triggerFocusEl: HTMLElement | null;
    _claimId: string;
    _lastAutoExitTime: number;
    constructor(player: Player);
    togglePinned(triggerEl?: HTMLElement | null): void;
    enter(reason: FloatingState): void;
    exit(reason?: ExitReason): void;
    /**
     * Close button: pause, dismiss, and prevent auto-float until the next
     * user-initiated play event.
     */
    dismiss(): void;
    destroy(): void;
    _canFloat(reason: FloatingState): boolean;
    _claimSingleton(): void;
    _setupClaimListener(): void;
    _setupFullscreenGuard(): void;
    _armPlayListenerToClearDismiss(): void;
    _startObserving(): void;
    _retargetObserver(target: HTMLElement): void;
    _ensureShell(): void;
    _createResizeHandles(): void;
    _teardownShell(): void;
    _mountIntoShell(): void;
    _unmountFromShell(): void;
    _applyInitialGeometry(): void;
    _initDraggable(): void;
    _savePrefs(): void;
    _activeElement(): HTMLElement | null;
}
export {};
//# sourceMappingURL=FloatingPlayerManager.d.ts.map