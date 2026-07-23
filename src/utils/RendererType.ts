import type { RendererType } from '../types/renderer.js';

/**
 * Classify a media source URL into the renderer type that should handle it.
 *
 * Single source of truth shared by {@link Player._detectRendererClass}
 * (which renderer class to instantiate) and {@link Player.shouldChangeRenderer}
 * (whether the current renderer must be swapped), so the two cannot drift
 * apart and disagree about what a given URL is.
 */
export function classifyRendererType(src: string): RendererType {
  if (src.includes('youtube.com') || src.includes('youtu.be') || src.includes('youtube-nocookie.com')) return 'youtube';
  if (src.includes('vimeo.com')) return 'vimeo';
  if (src.includes('.m3u8')) return 'hls';
  if (src.includes('.mpd')) return 'dash';
  if (src.includes('soundcloud.com') || src.includes('api.soundcloud.com')) return 'soundcloud';
  return 'html5';
}
