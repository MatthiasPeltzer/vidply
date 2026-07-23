/**
 * Download metadata helpers
 *
 * Used by the download button to resolve a human-readable file format
 * (e.g. MP4, MP3, WebM) and size string (e.g. 12.4 MB) for the button's
 * aria-label and tooltip.
 */
export declare function inferFormatFromMime(mime: string | null | undefined): string | null;
export declare function inferFormatFromUrl(url: string | null | undefined): string | null;
export declare function formatBytes(bytes: number, locale?: string): string | null;
export interface FetchContentLengthOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
}
export declare function fetchContentLength(url: string, options?: FetchContentLengthOptions): Promise<number | null>;
export interface DownloadLabelParts {
    baseLabel: string;
    format?: string | null;
    sizeBytes?: number | null;
    locale?: string;
    withFormatSizeTemplate: string;
    withFormatTemplate: string;
    withSizeTemplate: string;
}
/**
 * Compose the localized download label.
 * Templates are i18n strings already containing {format} / {size} placeholders.
 */
export declare function buildDownloadLabel(parts: DownloadLabelParts): string;
//# sourceMappingURL=DownloadInfo.d.ts.map