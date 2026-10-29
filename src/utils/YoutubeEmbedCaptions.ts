import type { EmbedCaptionTrack } from '../types/renderer.js';

/** Raw entry from `player.getOption('captions', 'tracklist')` (undocumented IFrame API). */
export interface YoutubeCaptionTrackRaw {
  languageCode?: string;
  languageName?: string;
  displayName?: string;
  kind?: string;
  name?: string;
  vssId?: string;
  vss_id?: string;
}

export interface YoutubeCaptionTrackEntry extends EmbedCaptionTrack {
  raw: YoutubeCaptionTrackRaw;
}

export function normalizeYoutubeVssId(track: YoutubeCaptionTrackRaw): string {
  return String(track.vssId ?? track.vss_id ?? '').trim();
}

export function isYoutubeAsrTrack(track: YoutubeCaptionTrackRaw): boolean {
  const kind = String(track.kind ?? '').toLowerCase();
  if (kind === 'asr') {
    return true;
  }
  return normalizeYoutubeVssId(track).startsWith('a.');
}

function languageKeyFromYoutubeTrack(track: YoutubeCaptionTrackRaw): string {
  const code = String(track.languageCode ?? '')
    .trim()
    .toLowerCase();
  if (code) {
    return code.split('-')[0] ?? code;
  }
  const vss = normalizeYoutubeVssId(track);
  if (vss.startsWith('a.')) {
    return vss.slice(2);
  }
  if (vss.startsWith('.')) {
    return vss.slice(1);
  }
  return vss;
}

/**
 * Prefer uploaded captions per language; fall back to ASR with an explicit label.
 */
export function filterYoutubeCaptionTracklist(rawList: unknown): YoutubeCaptionTrackEntry[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return [];
  }

  const typed = rawList as YoutubeCaptionTrackRaw[];
  const byLang = new Map<string, YoutubeCaptionTrackRaw[]>();

  for (const track of typed) {
    const key = languageKeyFromYoutubeTrack(track);
    if (!key) {
      continue;
    }
    const bucket = byLang.get(key) ?? [];
    bucket.push(track);
    byLang.set(key, bucket);
  }

  const result: YoutubeCaptionTrackEntry[] = [];

  for (const tracks of byLang.values()) {
    const uploaded = tracks.find((t) => !isYoutubeAsrTrack(t));
    const chosen = uploaded ?? tracks.find((t) => isYoutubeAsrTrack(t));
    if (!chosen) {
      continue;
    }

    const vssId = normalizeYoutubeVssId(chosen);
    const id = vssId || `${chosen.languageCode ?? ''}|${chosen.kind ?? ''}`;
    const baseName = chosen.displayName || chosen.languageName || chosen.languageCode || id;
    const label = uploaded ? baseName : `${baseName} (auto-generated)`;

    result.push({
      id,
      language: chosen.languageCode ?? languageKeyFromYoutubeTrack(chosen),
      label,
      raw: chosen
    });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

export function readYoutubeCaptionTracklist(youtube: {
  getOption?(module: string, option: string): unknown;
}): YoutubeCaptionTrackRaw[] | null {
  try {
    const list = youtube.getOption?.('captions', 'tracklist');
    if (!Array.isArray(list)) {
      return null;
    }
    return list as YoutubeCaptionTrackRaw[];
  } catch {
    return null;
  }
}

/** Returns true when YouTube accepts programmatic track selection for this entry. */
export function probeYoutubeCaptionTrack(
  youtube: { setOption?(module: string, option: string, value: unknown): void },
  track: YoutubeCaptionTrackRaw
): boolean {
  try {
    youtube.setOption?.('captions', 'track', track);
    youtube.setOption?.('captions', 'track', {});
    return true;
  } catch {
    return false;
  }
}
