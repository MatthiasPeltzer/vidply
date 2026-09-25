import { canPlayNativeHls } from './PerformanceUtils.js';

export type MediaSourceCandidate = { src: string; type?: string };

export type NegotiatedMediaSource = {
  src: string;
  fallbacks: MediaSourceCandidate[];
};

/**
 * Pick the URL the player should load — mirrors {@link Player._selectBestSource}
 * for `<source>` children, but works from playlist track JSON (`sources[]`).
 */
export function negotiateMediaSources(
  candidates: MediaSourceCandidate[],
  options?: { preferNativeElement?: boolean },
): NegotiatedMediaSource {
  const sources = candidates.filter((s) => typeof s.src === 'string' && s.src.length > 0);
  if (sources.length === 0) {
    return { src: '', fallbacks: [] };
  }
  if (sources.length === 1) {
    const only = sources[0];
    return { src: only?.src ?? '', fallbacks: [] };
  }

  const hasMSE = typeof MediaSource !== 'undefined';
  const nativeHls = canPlayNativeHls();
  const preferNative = options?.preferNativeElement === true;

  let chosen: MediaSourceCandidate | undefined;

  if (preferNative) {
    const hls = sources.find((s) => s.src.includes('.m3u8'));
    if (hls && nativeHls) {
      chosen = hls;
    }
    if (!chosen) {
      chosen = sources.find((s) => !s.src.includes('.mpd') && !s.src.includes('.m3u8'));
    }
    if (!chosen) {
      chosen = sources.find((s) => !s.src.includes('.mpd'));
    }
  } else {
    if (hasMSE) {
      chosen = sources.find((s) => s.src.includes('.mpd'));
    }
    if (!chosen) {
      const hlsSource = sources.find((s) => s.src.includes('.m3u8'));
      if (hlsSource && (hasMSE || nativeHls)) {
        chosen = hlsSource;
      }
    }
    if (!chosen) {
      chosen =
        sources.find((s) => !s.src.includes('.mpd') && !s.src.includes('.m3u8')) ||
        sources[0];
    }
  }

  if (!chosen) {
    chosen = sources[0];
  }

  const fallbacks = sources.filter((s) => s !== chosen);

  const resolved = chosen ?? sources[0];
  return { src: resolved?.src ?? '', fallbacks };
}

export function candidatesFromTrack(track: {
  src?: string;
  type?: string;
  sources?: Array<{ src?: string; type?: string }>;
}): MediaSourceCandidate[] {
  if (Array.isArray(track.sources) && track.sources.length > 0) {
    return track.sources
      .filter((s) => typeof s.src === 'string' && s.src.length > 0)
      .map((s) => ({
        src: s.src as string,
        type: s.type,
      }));
  }
  if (track.src) {
    return [{ src: track.src, type: track.type }];
  }
  return [];
}
