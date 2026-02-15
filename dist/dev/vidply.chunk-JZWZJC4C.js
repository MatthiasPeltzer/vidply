/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/StorageManager.js
var StorageManager = class _StorageManager {
  constructor(namespace = "vidply") {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }
  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  /**
   * Get a namespaced key
   */
  getKey(key) {
    return `${this.namespace}_${key}`;
  }
  /**
   * Save a value to storage
   */
  set(key, value) {
    if (!this.storage) return false;
    try {
      const namespacedKey = this.getKey(key);
      this.storage.setItem(namespacedKey, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
      return false;
    }
  }
  /**
   * Get a value from storage
   */
  get(key, defaultValue = null) {
    if (!this.storage) return defaultValue;
    try {
      const namespacedKey = this.getKey(key);
      const value = this.storage.getItem(namespacedKey);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
      return defaultValue;
    }
  }
  /**
   * Remove a value from storage
   */
  remove(key) {
    if (!this.storage) return false;
    try {
      const namespacedKey = this.getKey(key);
      this.storage.removeItem(namespacedKey);
      return true;
    } catch (e) {
      console.warn("Failed to remove from localStorage:", e);
      return false;
    }
  }
  /**
   * Clear all namespaced values
   */
  clear() {
    if (!this.storage) return false;
    try {
      const keys = Object.keys(this.storage);
      keys.forEach((key) => {
        if (key.startsWith(this.namespace)) {
          this.storage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
      return false;
    }
  }
  /**
   * Save transcript preferences
   */
  saveTranscriptPreferences(preferences) {
    return this.set("transcript_preferences", preferences);
  }
  /**
   * Get transcript preferences
   */
  getTranscriptPreferences() {
    return this.get("transcript_preferences", null);
  }
  /**
   * Save caption preferences
   */
  saveCaptionPreferences(preferences) {
    return this.set("caption_preferences", preferences);
  }
  /**
   * Get caption preferences
   */
  getCaptionPreferences() {
    return this.get("caption_preferences", null);
  }
  /**
   * Save player preferences (volume, speed, etc.)
   */
  savePlayerPreferences(preferences) {
    return this.set("player_preferences", preferences);
  }
  /**
   * Get player preferences
   */
  getPlayerPreferences() {
    return this.get("player_preferences", null);
  }
  /**
   * Save sign language preferences (position and size)
   */
  saveSignLanguagePreferences(preferences) {
    return this.set("sign_language_preferences", preferences);
  }
  /**
   * Get sign language preferences
   */
  getSignLanguagePreferences() {
    return this.get("sign_language_preferences", null);
  }
  // ============================================
  // Watch Progress Methods
  // ============================================
  /**
   * Maximum number of watch progress entries to store
   */
  static MAX_WATCH_PROGRESS_ENTRIES = 100;
  /**
   * Save watch progress for a video
   * @param {string} videoId - Unique identifier for the video
   * @param {number} currentTime - Current playback position in seconds
   * @param {number} duration - Total duration of the video in seconds
   * @returns {boolean} Whether the save was successful
   */
  saveWatchProgress(videoId, currentTime, duration) {
    if (!videoId || !duration || duration <= 0) return false;
    const allProgress = this.get("watch_progress", {});
    const percentage = currentTime / duration * 100;
    allProgress[videoId] = {
      currentTime,
      duration,
      percentage,
      updatedAt: Date.now()
    };
    const entries = Object.entries(allProgress);
    if (entries.length > _StorageManager.MAX_WATCH_PROGRESS_ENTRIES) {
      entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const toRemove = entries.length - _StorageManager.MAX_WATCH_PROGRESS_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        delete allProgress[entries[i][0]];
      }
    }
    return this.set("watch_progress", allProgress);
  }
  /**
   * Get watch progress for a video
   * @param {string} videoId - Unique identifier for the video
   * @returns {Object|null} Watch progress object or null if not found
   */
  getWatchProgress(videoId) {
    if (!videoId) return null;
    const allProgress = this.get("watch_progress", {});
    return allProgress[videoId] || null;
  }
  /**
   * Clear watch progress for a video
   * @param {string} videoId - Unique identifier for the video
   * @returns {boolean} Whether the clear was successful
   */
  clearWatchProgress(videoId) {
    if (!videoId) return false;
    const allProgress = this.get("watch_progress", {});
    if (allProgress[videoId]) {
      delete allProgress[videoId];
      return this.set("watch_progress", allProgress);
    }
    return true;
  }
};

export {
  StorageManager
};
//# sourceMappingURL=vidply.chunk-JZWZJC4C.js.map
