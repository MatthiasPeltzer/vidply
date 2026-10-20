import type { RendererType } from '../types/renderer.js';
export type EmbedProvider = 'youtube' | 'vimeo' | 'soundcloud';
export declare function isEmbedProvider(type: RendererType | string | undefined): type is EmbedProvider;
/** Canonical https URL to open the item on YouTube, Vimeo, or SoundCloud. */
export declare function resolveEmbedProviderWatchUrl(src: string, provider?: EmbedProvider | RendererType | null): string | null;
//# sourceMappingURL=EmbedProviderLinks.d.ts.map