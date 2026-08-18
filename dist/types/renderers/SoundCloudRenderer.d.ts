import type { Renderer } from '../types/renderer.js';
import type { Player } from '../core/Player.js';
export declare class SoundCloudRenderer implements Renderer {
    readonly rendererType: "soundcloud";
    player: Player;
    media: HTMLMediaElement;
    widget: SCWidget | null;
    trackUrl: string | null;
    isReady: boolean;
    iframe: HTMLIFrameElement | null;
    iframeId: string | null;
    _previousVolume: number;
    private _initTimeoutId;
    private _initController;
    constructor(player: Player);
    init(): Promise<void>;
    /**
     * Validate a SoundCloud URL by parsing it with the URL constructor and
     * checking the protocol + hostname against an explicit allow-list.
     * Substring checks like `url.includes('soundcloud.com')` accept things
     * like `https://evil.com/?leak=soundcloud.com` or
     * `https://soundcloud.com.attacker.example`.
     */
    isValidSoundCloudUrl(url: string): boolean;
    /**
     * Check if URL is a playlist/set
     */
    isPlaylist(): boolean | "" | null;
    /**
     * Extract track/playlist info from URL for embed
     * SoundCloud URLs can be:
     * - https://soundcloud.com/artist/track
     * - https://soundcloud.com/artist/sets/playlist
     * - https://api.soundcloud.com/tracks/123456
     */
    getEmbedUrl(): string;
    loadSoundCloudAPI(): Promise<void>;
    createIframe(): void;
    initializeWidget(): Promise<void>;
    attachEvents(): void;
    /**
     * For SoundCloud sets, check whether the track that just finished is the
     * last one in the embedded playlist.
     */
    private isLastTrackInSet;
    /** Map a completed SoundCloud playback to VidPly's ended state. */
    private handlePlaybackFinished;
    play(): void;
    pause(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setPlaybackSpeed(_speed: number): void;
    /**
     * Get current track info. Returns the raw sound payload from the
     * SoundCloud Widget API (shape is best described as `unknown` since
     * the API exposes many optional fields we don't formally type).
     */
    getCurrentSound(): Promise<unknown | null>;
    destroy(): void;
}
export default SoundCloudRenderer;
//# sourceMappingURL=SoundCloudRenderer.d.ts.map