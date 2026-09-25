/**
 * On-screen debug log for iOS Safari (no Mac Web Inspector required).
 * Enabled via `options.debug`, `options.debugOverlay`, or `?vidplyDebug=1` / `#vidplyDebug=1`.
 */
import type { Player } from './Player.js';
export declare class DebugOverlay {
    private static shared;
    private static refCount;
    /** One overlay for the whole page (videos demo has many players). */
    static acquire(player: Player): DebugOverlay;
    static release(): void;
    static shouldEnable(options: {
        debug?: boolean;
        debugOverlay?: boolean;
    }): boolean;
    private player;
    private root;
    private logEl;
    private lines;
    private mediaListenerController;
    private constructor();
    setActivePlayer(player: Player): void;
    mount(): void;
    destroy(): void;
    private destroyInternal;
    append(message: string, player?: Player): void;
    private render;
    private attachMediaListeners;
}
//# sourceMappingURL=DebugOverlay.d.ts.map