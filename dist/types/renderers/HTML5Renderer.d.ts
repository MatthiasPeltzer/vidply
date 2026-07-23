import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
export declare class HTML5Renderer implements Renderer {
    readonly rendererType: "html5";
    player: Player;
    media: HTMLMediaElement;
    _didDeferredLoad: boolean;
    private _listenerController;
    constructor(player: Player);
    init(): Promise<void>;
    attachEvents(): void;
    pauseOtherPlayers(): void;
    play(): Promise<void>;
    /**
     * Ensure the media element has been loaded at least once (metadata/initial state)
     * without starting playback. Useful for playlists to behave like single videos.
     */
    ensureLoaded(): void;
    pause(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackSpeed(speed: number): void;
    /**
     * Get available quality levels from source elements
     * @returns {Array} Array of quality objects with index, height, width, and src
     */
    getQualities(): {
        index: number;
        height: number;
        width: number;
        src: string;
        type: string;
        name: string;
    }[];
    /**
     * Extract height from quality label (e.g., "1080p" -> 1080)
     * @param {string} label
     * @returns {number}
     */
    extractHeightFromLabel(label: string): number;
    /**
     * Switch to a specific quality level
     * @param {number} qualityIndex - Index of the quality level (-1 for auto, not applicable for HTML5)
     */
    switchQuality(qualityIndex: number): void;
    /**
     * Get current quality index
     * @returns {number}
     */
    getCurrentQuality(): number;
    destroy(): void;
}
//# sourceMappingURL=HTML5Renderer.d.ts.map