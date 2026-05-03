/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  i18n
} from "./vidply.chunk-X3Y5J67K.js";

// src/utils/StorageManager.ts
var StorageManager = class _StorageManager {
  namespace;
  storage;
  static MAX_WATCH_PROGRESS_ENTRIES = 100;
  constructor(namespace = "vidply") {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }
  isStorageAvailable() {
    try {
      const test = "__storage_test__";
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  getKey(key) {
    return `${this.namespace}_${key}`;
  }
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
  saveTranscriptPreferences(preferences) {
    return this.set("transcript_preferences", preferences);
  }
  getTranscriptPreferences() {
    return this.get("transcript_preferences", null);
  }
  saveCaptionPreferences(preferences) {
    return this.set("caption_preferences", preferences);
  }
  getCaptionPreferences() {
    return this.get("caption_preferences", null);
  }
  savePlayerPreferences(preferences) {
    return this.set("player_preferences", preferences);
  }
  getPlayerPreferences() {
    return this.get("player_preferences", null);
  }
  saveSignLanguagePreferences(preferences) {
    return this.set("sign_language_preferences", preferences);
  }
  getSignLanguagePreferences() {
    return this.get("sign_language_preferences", null);
  }
  saveFloatingPreferences(preferences) {
    return this.set("floating_preferences", preferences);
  }
  getFloatingPreferences() {
    return this.get("floating_preferences", null);
  }
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
  getWatchProgress(videoId) {
    if (!videoId) return null;
    const allProgress = this.get("watch_progress", {});
    return allProgress[videoId] || null;
  }
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

// src/utils/TrackLabelUtils.ts
function deriveTrackLabel(rawLabel, language, fallbackKey = "player.captions") {
  const cleanLabel = (rawLabel ?? "").trim();
  const cleanLang = (language ?? "").trim();
  const looksLikePlaceholder = cleanLabel === "" || /^\d+$/.test(cleanLabel) || /^(null|undefined)$/i.test(cleanLabel);
  if (!looksLikePlaceholder) {
    return cleanLabel;
  }
  const cleanLangIsUsable = cleanLang !== "" && !/^(null|undefined)$/i.test(cleanLang);
  if (cleanLangIsUsable) {
    try {
      const displayNames = new Intl.DisplayNames([cleanLang, "en"], { type: "language" });
      const name = displayNames.of(cleanLang);
      if (name && name.toLowerCase() !== cleanLang.toLowerCase()) {
        return name;
      }
    } catch {
    }
    return cleanLang.toUpperCase();
  }
  return i18n.t(fallbackKey);
}

export {
  StorageManager,
  deriveTrackLabel
};
//# sourceMappingURL=vidply.chunk-6CNIG4E4.js.map
