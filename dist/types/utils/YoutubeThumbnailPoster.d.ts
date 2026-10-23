/**
 * Resolve a YouTube `i.ytimg.com` thumbnail for chromeless embed posters.
 * Tries maxres, then sd, then hq when higher resolutions are missing or placeholders.
 */
export declare function youtubeThumbnailUrl(videoId: string, variant: 'maxres' | 'sd' | 'hq'): string;
/** Best-effort `i.ytimg.com` poster URL, or null if every variant fails. */
export declare function resolveYoutubeThumbnailPosterUrl(videoId: string): Promise<string | null>;
/** Pixel size of the best available `i.ytimg.com` thumbnail (proxy for video aspect ratio). */
export declare function resolveYoutubeThumbnailDimensions(videoId: string): Promise<{
    width: number;
    height: number;
} | null>;
//# sourceMappingURL=YoutubeThumbnailPoster.d.ts.map