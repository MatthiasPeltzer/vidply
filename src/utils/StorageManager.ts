import { shallowSanitize } from './Sanitize.js';

/**
 * Type guard helpers used by the validated `get()` overload below.
 * Each guard accepts an unknown JSON value and tells TypeScript whether
 * it matches the expected runtime shape.
 */
export type Validator<T> = (value: unknown) => value is T;

interface WatchProgressEntry {
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: number;
}

/**
 * Loose alias for stored preference payloads. Numeric/string-typed fields
 * are validated at the boundary (`isPlainObject`) and clamped where it
 * matters (volume, playbackSpeed). Individual properties remain `unknown`
 * so callers must narrow before use.
 */
export type StoredPreferences = Record<string, unknown>;

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isWatchProgressEntry(value: unknown): value is WatchProgressEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    isFiniteNonNegative(v.currentTime) &&
    isFiniteNonNegative(v.duration) &&
    typeof v.percentage === 'number' &&
    Number.isFinite(v.percentage) &&
    typeof v.updatedAt === 'number' &&
    Number.isFinite(v.updatedAt)
  );
}

export class StorageManager {
  private namespace: string;
  private storage: Storage | null;

  static MAX_WATCH_PROGRESS_ENTRIES = 100;

  constructor(namespace = 'vidply') {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }

  /**
   * `localStorage` access can throw in private-browsing modes (Safari) and
   * is undefined in non-DOM environments. Both are tolerated here so the
   * Player still works (without persistence) when storage is unavailable.
   */
  isStorageAvailable(): boolean {
    try {
      if (typeof localStorage === 'undefined') return false;
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  getKey(key: string): string {
    return `${this.namespace}_${key}`;
  }

  set(key: string, value: unknown): boolean {
    if (!this.storage) return false;

    try {
      const namespacedKey = this.getKey(key);
      this.storage.setItem(namespacedKey, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
      return false;
    }
  }

  /**
   * Generic get. Accepts an optional `validator` so callers can assert the
   * runtime shape of the parsed JSON before trusting it. Falls back to
   * `defaultValue` if the payload fails validation.
   */
  get<T = unknown>(key: string, defaultValue: T | null = null, validator?: Validator<T>): T | null {
    if (!this.storage) return defaultValue;

    try {
      const namespacedKey = this.getKey(key);
      const raw = this.storage.getItem(namespacedKey);
      if (raw === null) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`[VidPly] Discarding malformed localStorage payload for "${key}"`);
        return defaultValue;
      }
      return parsed as T;
    } catch (e) {
      console.warn('Failed to read from localStorage:', e);
      return defaultValue;
    }
  }

  remove(key: string): boolean {
    if (!this.storage) return false;

    try {
      const namespacedKey = this.getKey(key);
      this.storage.removeItem(namespacedKey);
      return true;
    } catch (e) {
      console.warn('Failed to remove from localStorage:', e);
      return false;
    }
  }

  clear(): boolean {
    if (!this.storage) return false;

    try {
      const storage = this.storage;
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key.startsWith(this.namespace)) {
          storage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
      return false;
    }
  }

  saveTranscriptPreferences(preferences: StoredPreferences): boolean {
    return this.set('transcript_preferences', shallowSanitize(preferences));
  }

  getTranscriptPreferences(): StoredPreferences | null {
    return this.get<StoredPreferences>(
      'transcript_preferences',
      null,
      isPlainObject as Validator<StoredPreferences>
    );
  }

  saveCaptionPreferences(preferences: StoredPreferences): boolean {
    return this.set('caption_preferences', shallowSanitize(preferences));
  }

  getCaptionPreferences(): StoredPreferences | null {
    return this.get<StoredPreferences>('caption_preferences', null, isPlainObject as Validator<StoredPreferences>);
  }

  savePlayerPreferences(preferences: StoredPreferences): boolean {
    // Numeric ranges are clamped here so a tampered storage payload cannot
    // ship a `volume: 1e9` straight to a renderer.
    const sanitized = shallowSanitize(preferences);
    if (typeof sanitized.volume === 'number') {
      sanitized.volume = clamp(sanitized.volume, 0, 1);
    }
    if (typeof sanitized.playbackSpeed === 'number') {
      sanitized.playbackSpeed = clamp(sanitized.playbackSpeed, 0.1, 4);
    }
    return this.set('player_preferences', sanitized);
  }

  getPlayerPreferences(): StoredPreferences | null {
    const value = this.get<StoredPreferences>('player_preferences', null, isPlainObject as Validator<StoredPreferences>);
    if (!value) return null;
    if (typeof value.volume === 'number') {
      value.volume = clamp(value.volume, 0, 1);
    }
    if (typeof value.playbackSpeed === 'number') {
      value.playbackSpeed = clamp(value.playbackSpeed, 0.1, 4);
    }
    return value;
  }

  saveSignLanguagePreferences(preferences: StoredPreferences): boolean {
    return this.set('sign_language_preferences', shallowSanitize(preferences));
  }

  getSignLanguagePreferences(): StoredPreferences | null {
    return this.get<StoredPreferences>('sign_language_preferences', null, isPlainObject as Validator<StoredPreferences>);
  }

  saveFloatingPreferences(preferences: StoredPreferences): boolean {
    return this.set('floating_preferences', shallowSanitize(preferences));
  }

  getFloatingPreferences(): StoredPreferences | null {
    return this.get<StoredPreferences>('floating_preferences', null, isPlainObject as Validator<StoredPreferences>);
  }

  /**
   * Persist watch progress for a video id. Numeric inputs are validated +
   * clamped so a caller cannot poison the store with `Infinity`/negatives.
   */
  saveWatchProgress(videoId: string, currentTime: number, duration: number): boolean {
    if (typeof videoId !== 'string' || !videoId) return false;
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return false;

    const safeDuration = clamp(duration, 0.001, 24 * 60 * 60); // cap to 24h to neutralize gigantic numbers
    const safeCurrent = clamp(currentTime, 0, safeDuration);

    const allProgress = this.get<Record<string, WatchProgressEntry>>(
      'watch_progress',
      Object.create(null),
      isWatchProgressMap
    ) ?? Object.create(null) as Record<string, WatchProgressEntry>;

    const percentage = (safeCurrent / safeDuration) * 100;

    allProgress[videoId] = {
      currentTime: safeCurrent,
      duration: safeDuration,
      percentage: clamp(percentage, 0, 100),
      updatedAt: Date.now()
    };

    const entries = Object.entries(allProgress);
    if (entries.length > StorageManager.MAX_WATCH_PROGRESS_ENTRIES) {
      entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const toRemove = entries.length - StorageManager.MAX_WATCH_PROGRESS_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        const entry = entries[i];
        if (entry) {
          delete allProgress[entry[0]];
        }
      }
    }

    return this.set('watch_progress', allProgress);
  }

  getWatchProgress(videoId: string): WatchProgressEntry | null {
    if (!videoId) return null;
    const allProgress = this.get<Record<string, WatchProgressEntry>>(
      'watch_progress',
      Object.create(null),
      isWatchProgressMap
    ) ?? Object.create(null) as Record<string, WatchProgressEntry>;
    const entry = allProgress[videoId];
    return entry && isWatchProgressEntry(entry) ? entry : null;
  }

  clearWatchProgress(videoId: string): boolean {
    if (!videoId) return false;
    const allProgress = this.get<Record<string, WatchProgressEntry>>(
      'watch_progress',
      Object.create(null),
      isWatchProgressMap
    ) ?? Object.create(null) as Record<string, WatchProgressEntry>;
    if (allProgress[videoId]) {
      delete allProgress[videoId];
      return this.set('watch_progress', allProgress);
    }
    return true;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWatchProgressMap(value: unknown): value is Record<string, WatchProgressEntry> {
  if (!isPlainObject(value)) return false;
  for (const entry of Object.values(value)) {
    if (!isWatchProgressEntry(entry)) return false;
  }
  return true;
}
