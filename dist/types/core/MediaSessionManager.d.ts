/**
 * Media Session API integration.
 *
 * Wires the player into `navigator.mediaSession` so the OS shows
 * now-playing metadata (title / artist / album / artwork) and routes
 * hardware/lock-screen/notification controls (play, pause, stop, seek,
 * and previous/next track for playlists) back into the player.
 *
 * Everything is feature-detected and wrapped in try/catch: unsupported
 * browsers and unsupported individual actions degrade silently.
 */
import type { Player } from './Player.js';
export declare class MediaSessionManager {
    player: Player;
    private supported;
    private handlers;
    private boundActions;
    private lastPositionUpdate;
    constructor(player: Player);
    /** Does this manager currently own the global media session? */
    private isActive;
    /**
     * Take ownership of the global session: (re)register the action handlers so
     * the OS controls drive this player, and refresh metadata/state/position.
     */
    private claimSession;
    private get session();
    private setActionHandler;
    private setupActionHandlers;
    private offsetFrom;
    /**
     * previous/next track only make sense with a multi-item playlist; bind
     * or clear them whenever the playlist state changes so the OS shows the
     * correct affordances.
     */
    private updateTrackHandlers;
    private attachEvents;
    private resolveMetadata;
    updateMetadata(): void;
    updatePlaybackState(): void;
    /**
     * Push the current position to the OS scrubber. `timeupdate` fires
     * several times a second, so non-forced updates are throttled.
     */
    updatePositionState(force?: boolean): void;
    destroy(): void;
}
//# sourceMappingURL=MediaSessionManager.d.ts.map