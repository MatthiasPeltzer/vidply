import type { RendererType } from '../types/renderer.js';
/**
 * Classify a media source URL into the renderer type that should handle it.
 *
 * Single source of truth shared by {@link Player._detectRendererClass}
 * (which renderer class to instantiate) and {@link Player.shouldChangeRenderer}
 * (whether the current renderer must be swapped), so the two cannot drift
 * apart and disagree about what a given URL is.
 */
export declare function classifyRendererType(src: string): RendererType;
/**
 * Whether replacing `currentSrc` with `targetSrc` on the main element needs a
 * renderer rebuild ({@link Player.swapMainSource}) rather than a plain
 * `element.src` assignment. Only progressive-to-progressive swaps on the
 * HTML5 renderer can skip it; hls.js / dash.js own the element while active.
 */
export declare function requiresRendererSwap(currentSrc: string, currentRendererType: RendererType | null, targetSrc: string): boolean;
//# sourceMappingURL=RendererType.d.ts.map