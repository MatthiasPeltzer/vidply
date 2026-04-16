interface WatchProgressEntry {
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: number;
}

export class StorageManager {
  private namespace: string;
  private storage: Storage | null;

  static MAX_WATCH_PROGRESS_ENTRIES = 100;

  constructor(namespace = 'vidply') {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }

  isStorageAvailable(): boolean {
    try {
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

  get<T = unknown>(key: string, defaultValue: T | null = null): T | null {
    if (!this.storage) return defaultValue;

    try {
      const namespacedKey = this.getKey(key);
      const value = this.storage.getItem(namespacedKey);
      return value ? (JSON.parse(value) as T) : defaultValue;
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
      const keys = Object.keys(this.storage);
      keys.forEach(key => {
        if (key.startsWith(this.namespace)) {
          this.storage!.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
      return false;
    }
  }

  saveTranscriptPreferences(preferences: Record<string, unknown>): boolean {
    return this.set('transcript_preferences', preferences);
  }

  getTranscriptPreferences(): Record<string, unknown> | null {
    return this.get<Record<string, unknown>>('transcript_preferences', null);
  }

  saveCaptionPreferences(preferences: Record<string, unknown>): boolean {
    return this.set('caption_preferences', preferences);
  }

  getCaptionPreferences(): Record<string, unknown> | null {
    return this.get<Record<string, unknown>>('caption_preferences', null);
  }

  savePlayerPreferences(preferences: Record<string, unknown>): boolean {
    return this.set('player_preferences', preferences);
  }

  getPlayerPreferences(): Record<string, unknown> | null {
    return this.get<Record<string, unknown>>('player_preferences', null);
  }

  saveSignLanguagePreferences(preferences: Record<string, unknown>): boolean {
    return this.set('sign_language_preferences', preferences);
  }

  getSignLanguagePreferences(): Record<string, unknown> | null {
    return this.get<Record<string, unknown>>('sign_language_preferences', null);
  }

  saveWatchProgress(videoId: string, currentTime: number, duration: number): boolean {
    if (!videoId || !duration || duration <= 0) return false;

    const allProgress = this.get<Record<string, WatchProgressEntry>>('watch_progress', {})!;
    const percentage = (currentTime / duration) * 100;

    allProgress[videoId] = {
      currentTime,
      duration,
      percentage,
      updatedAt: Date.now()
    };

    const entries = Object.entries(allProgress);
    if (entries.length > StorageManager.MAX_WATCH_PROGRESS_ENTRIES) {
      entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const toRemove = entries.length - StorageManager.MAX_WATCH_PROGRESS_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        delete allProgress[entries[i][0]];
      }
    }

    return this.set('watch_progress', allProgress);
  }

  getWatchProgress(videoId: string): WatchProgressEntry | null {
    if (!videoId) return null;
    const allProgress = this.get<Record<string, WatchProgressEntry>>('watch_progress', {})!;
    return allProgress[videoId] || null;
  }

  clearWatchProgress(videoId: string): boolean {
    if (!videoId) return false;
    const allProgress = this.get<Record<string, WatchProgressEntry>>('watch_progress', {})!;
    if (allProgress[videoId]) {
      delete allProgress[videoId];
      return this.set('watch_progress', allProgress);
    }
    return true;
  }
}
