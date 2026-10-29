/**
 * Resolve a YouTube `i.ytimg.com` thumbnail for chromeless embed posters.
 * Tries maxres, then sd, then hq when higher resolutions are missing or placeholders.
 */

export function youtubeThumbnailUrl(videoId: string, variant: 'maxres' | 'sd' | 'hq'): string {
  const id = encodeURIComponent(videoId);
  return `https://i.ytimg.com/vi/${id}/${variant}default.jpg`;
}

function loadThumbnailImage(
  url: string,
  minWidth = 0
): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (minWidth > 0 && img.naturalWidth <= minWidth) {
        reject(new Error('YouTube thumbnail too small'));
        return;
      }
      if (img.naturalWidth <= 0 || img.naturalHeight <= 0) {
        reject(new Error('YouTube thumbnail has no dimensions'));
        return;
      }
      resolve({ url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => reject(new Error('YouTube thumbnail failed to load'));
    img.src = url;
  });
}

function loadThumbnailCandidate(url: string, minWidth = 0): Promise<string> {
  return loadThumbnailImage(url, minWidth).then((result) => result.url);
}

/** Best-effort `i.ytimg.com` poster URL, or null if every variant fails. */
export async function resolveYoutubeThumbnailPosterUrl(videoId: string): Promise<string | null> {
  if (!videoId) {
    return null;
  }

  try {
    return await loadThumbnailCandidate(youtubeThumbnailUrl(videoId, 'maxres'), 121);
  } catch {
    // maxres missing or 120px padded placeholder
  }

  try {
    return await loadThumbnailCandidate(youtubeThumbnailUrl(videoId, 'sd'), 121);
  } catch {
    // sd missing or padded
  }

  try {
    return await loadThumbnailCandidate(youtubeThumbnailUrl(videoId, 'hq'));
  } catch {
    return null;
  }
}

/** Pixel size of the best available `i.ytimg.com` thumbnail (proxy for video aspect ratio). */
export async function resolveYoutubeThumbnailDimensions(
  videoId: string
): Promise<{ width: number; height: number } | null> {
  if (!videoId) {
    return null;
  }

  for (const variant of ['maxres', 'sd', 'hq'] as const) {
    try {
      const loaded = await loadThumbnailImage(
        youtubeThumbnailUrl(videoId, variant),
        variant === 'maxres' ? 121 : 0
      );
      return { width: loaded.width, height: loaded.height };
    } catch {
      // try next variant
    }
  }

  return null;
}
