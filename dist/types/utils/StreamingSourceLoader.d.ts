import { type StreamingLibraryOptions } from './StreamingLibraries.js';
/** `play()` without an unhandled rejection when autoplay is refused. */
export declare function playQuietly(media: HTMLMediaElement): void;
export interface StreamingSourceLoaderOptions extends StreamingLibraryOptions {
    log?: (message: string, level?: 'log' | 'warn') => void;
}
export declare class StreamingSourceLoader {
    readonly media: HTMLVideoElement;
    private readonly options;
    private hls;
    private dash;
    private fallbackSrc;
    private usingFallback;
    /** Bumped per load(); async steps of an outdated load() give up. */
    private generation;
    private readonly onMediaError;
    constructor(media: HTMLVideoElement, options?: StreamingSourceLoaderOptions);
    /** The library in use for the current source, for tests and debugging. */
    get engine(): 'native' | 'hls.js' | 'dash.js' | 'none';
    load(src: string, fallbackSrc?: string | null): Promise<void>;
    destroy(): void;
    private attachHls;
    private attachDash;
    private useFallback;
    private teardownEngines;
}
//# sourceMappingURL=StreamingSourceLoader.d.ts.map