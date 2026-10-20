/** Best-effort Vimeo oEmbed thumbnail for chromeless idle posters when no `poster` is set. */
export async function resolveVimeoThumbnailPosterUrl(videoId: string): Promise<string | null> {
  if (!videoId || typeof fetch !== 'function') {
    return null;
  }

  const pageUrl = `https://vimeo.com/${encodeURIComponent(videoId)}`;
  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { thumbnail_url?: string };
    return typeof data.thumbnail_url === 'string' && data.thumbnail_url.length > 0
      ? data.thumbnail_url
      : null;
  } catch {
    return null;
  }
}
