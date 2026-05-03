/**
 * Download metadata helpers
 *
 * Used by the download button to resolve a human-readable file format
 * (e.g. MP4, MP3, WebM) and size string (e.g. 12.4 MB) for the button's
 * aria-label and tooltip.
 */

const MIME_TO_FORMAT: Record<string, string> = {
  'video/mp4': 'MP4',
  'video/webm': 'WebM',
  'video/ogg': 'Ogg',
  'video/quicktime': 'MOV',
  'video/x-matroska': 'MKV',
  'video/x-msvideo': 'AVI',
  'audio/mpeg': 'MP3',
  'audio/mp3': 'MP3',
  'audio/mp4': 'M4A',
  'audio/x-m4a': 'M4A',
  'audio/aac': 'AAC',
  'audio/ogg': 'Ogg',
  'audio/opus': 'Opus',
  'audio/wav': 'WAV',
  'audio/x-wav': 'WAV',
  'audio/wave': 'WAV',
  'audio/flac': 'FLAC',
  'audio/x-flac': 'FLAC',
  'audio/webm': 'WebM'
};

const EXT_TO_FORMAT: Record<string, string> = {
  mp4: 'MP4',
  m4v: 'MP4',
  mov: 'MOV',
  webm: 'WebM',
  mkv: 'MKV',
  avi: 'AVI',
  ogv: 'Ogg',
  ogg: 'Ogg',
  oga: 'Ogg',
  mp3: 'MP3',
  m4a: 'M4A',
  aac: 'AAC',
  opus: 'Opus',
  wav: 'WAV',
  flac: 'FLAC'
};

export function inferFormatFromMime(mime: string | null | undefined): string | null {
  if (!mime) return null;
  const trimmed = mime.split(';')[0].trim().toLowerCase();
  return MIME_TO_FORMAT[trimmed] || null;
}

export function inferFormatFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const cleaned = url.split('?')[0].split('#')[0];
    const lastSegment = cleaned.split('/').pop() || '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex === lastSegment.length - 1) return null;
    const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
    return EXT_TO_FORMAT[ext] || null;
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number, locale: string = 'en'): string | null {
  if (!isFinite(bytes) || bytes < 0) return null;

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  // Bytes/KB get no decimals; MB and up get one decimal.
  const fractionDigits = unitIndex < 2 ? 0 : 1;

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value);
  } catch {
    formatted = value.toFixed(fractionDigits);
  }

  return `${formatted} ${units[unitIndex]}`;
}

export interface FetchContentLengthOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function fetchContentLength(
  url: string,
  options: FetchContentLengthOptions = {}
): Promise<number | null> {
  if (!url || typeof fetch !== 'function') return null;

  // Compose abort signals: caller's lifecycle signal + a per-call timeout.
  const signals: AbortSignal[] = [];
  if (options.signal) signals.push(options.signal);
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    signals.push(AbortSignal.timeout(options.timeoutMs ?? 8000));
  }
  let combinedSignal: AbortSignal | undefined;
  if (signals.length === 1) combinedSignal = signals[0];
  else if (signals.length > 1) {
    const anyFn = (AbortSignal as { any?: (s: AbortSignal[]) => AbortSignal }).any;
    combinedSignal = anyFn ? anyFn(signals) : signals[0];
  }

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      credentials: 'omit',
      cache: 'no-store',
      signal: combinedSignal
    });
    if (!response.ok) return null;
    const header = response.headers.get('Content-Length');
    if (!header) return null;
    const size = Number(header);
    return Number.isFinite(size) && size > 0 ? size : null;
  } catch (error) {
    // CORS, network errors, abort, or HEAD not allowed: silently give up.
    if (typeof console !== 'undefined' && console.debug) {
      console.debug('[vidply] HEAD request for download size failed:', error);
    }
    return null;
  }
}

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
export function buildDownloadLabel(parts: DownloadLabelParts): string {
  const { baseLabel, format, sizeBytes, locale = 'en' } = parts;
  const sizeStr = sizeBytes != null ? formatBytes(sizeBytes, locale) : null;

  if (format && sizeStr) {
    return parts.withFormatSizeTemplate
      .replace('{format}', format)
      .replace('{size}', sizeStr);
  }
  if (format) {
    return parts.withFormatTemplate.replace('{format}', format);
  }
  if (sizeStr) {
    return parts.withSizeTemplate.replace('{size}', sizeStr);
  }
  return baseLabel;
}
