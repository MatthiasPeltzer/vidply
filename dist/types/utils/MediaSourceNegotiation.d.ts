export type MediaSourceCandidate = {
    src: string;
    type?: string;
};
export type NegotiatedMediaSource = {
    src: string;
    fallbacks: MediaSourceCandidate[];
};
/**
 * Pick the URL the player should load — mirrors {@link Player._selectBestSource}
 * for `<source>` children, but works from playlist track JSON (`sources[]`).
 */
export declare function negotiateMediaSources(candidates: MediaSourceCandidate[], options?: {
    preferNativeElement?: boolean;
}): NegotiatedMediaSource;
export declare function candidatesFromTrack(track: {
    src?: string;
    type?: string;
    sources?: Array<{
        src?: string;
        type?: string;
    }>;
}): MediaSourceCandidate[];
//# sourceMappingURL=MediaSourceNegotiation.d.ts.map