import type { RendererType } from '../types/renderer.js';
import { classifyRendererType } from './RendererType.js';

export type EmbedProvider = 'youtube' | 'vimeo' | 'soundcloud';

const EMBED_PROVIDERS: EmbedProvider[] = ['youtube', 'vimeo', 'soundcloud'];

export function isEmbedProvider(type: RendererType | string | undefined): type is EmbedProvider {
  return typeof type === 'string' && (EMBED_PROVIDERS as string[]).includes(type);
}

function sanitizeProviderPageUrl(input: string, provider: EmbedProvider): string | null {
  if (typeof input !== 'string' || input.length === 0 || input.length > 4096) {
    return null;
  }
  const trimmed = input.trim();
  if (/[\s"'<>\\]/.test(trimmed)) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') {
      return null;
    }
    const host = url.hostname.toLowerCase();
    if (provider === 'youtube') {
      if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
        return url.href;
      }
      return null;
    }
    if (provider === 'vimeo') {
      if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
        return url.href;
      }
      return null;
    }
    if (host === 'soundcloud.com' || host === 'www.soundcloud.com' || host === 'm.soundcloud.com') {
      return url.href;
    }
  } catch {
    return null;
  }

  return null;
}

function extractYoutubeWatchUrl(src: string): string | null {
  const match = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([^#&?/]+)/);
  const id = match?.[1];
  if (!id) {
    return sanitizeProviderPageUrl(src, 'youtube');
  }
  return sanitizeProviderPageUrl(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}`, 'youtube');
}

function extractVimeoWatchUrl(src: string): string | null {
  const match = src.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  const id = match?.[1];
  if (!id) {
    return sanitizeProviderPageUrl(src, 'vimeo');
  }
  return sanitizeProviderPageUrl(`https://vimeo.com/${id}`, 'vimeo');
}

function extractSoundCloudWatchUrl(src: string): string | null {
  if (src.includes('w.soundcloud.com/player')) {
    try {
      const parsed = new URL(src, 'https://example.com');
      const inner = parsed.searchParams.get('url');
      if (inner) {
        return sanitizeProviderPageUrl(decodeURIComponent(inner), 'soundcloud');
      }
    } catch {
      return null;
    }
  }
  return sanitizeProviderPageUrl(src, 'soundcloud');
}

/** Canonical https URL to open the item on YouTube, Vimeo, or SoundCloud. */
export function resolveEmbedProviderWatchUrl(
  src: string,
  provider?: EmbedProvider | RendererType | null
): string | null {
  if (!src) {
    return null;
  }
  const resolvedProvider = provider != null && isEmbedProvider(provider)
    ? provider
    : classifyRendererType(src);
  if (!isEmbedProvider(resolvedProvider)) {
    return null;
  }

  switch (resolvedProvider) {
    case 'youtube':
      return extractYoutubeWatchUrl(src);
    case 'vimeo':
      return extractVimeoWatchUrl(src);
    case 'soundcloud':
      return extractSoundCloudWatchUrl(src);
    default:
      return null;
  }
}
