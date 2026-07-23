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
//# sourceMappingURL=RendererType.d.ts.map