import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
export declare class YouTubeRenderer implements Renderer {
    readonly rendererType: "youtube";
    player: Player;
    media: HTMLMediaElement;
    youtube: YTPlayer | null;
    videoId: string | null;
    isReady: boolean;
    iframe: HTMLDivElement | null;
    timeUpdateInterval?: ReturnType<typeof setInterval>;
    constructor(player: Player);
    init(): Promise<void>;
    extractVideoId(url: string): string | null;
    loadYouTubeAPI(): Promise<void>;
    createIframe(): void;
    initializePlayer(): Promise<void>;
    attachEvents(): void;
    handleStateChange(event: {
        data: number;
    }): void;
    handleError(event: {
        data: 2 | 5 | 100 | 101 | 150;
    }): void;
    /**
     * Switch to another YouTube video without recreating the iframe player.
     * Used by playlist track changes when the renderer type stays `youtube`.
     */
    loadSource(src: string): void;
    play(): void;
    pause(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackSpeed(speed: number): void;
    destroy(): void;
}
//# sourceMappingURL=YouTubeRenderer.d.ts.map