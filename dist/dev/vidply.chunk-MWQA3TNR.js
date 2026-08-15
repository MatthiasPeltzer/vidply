/*!
 * VidPly v1.2.8 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  i18n,
  shallowSanitize
} from "./vidply.chunk-FIYXYV5R.js";

// src/utils/StorageManager.ts
function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
function isFiniteNonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function isWatchProgressEntry(value) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  return isFiniteNonNegative(v.currentTime) && isFiniteNonNegative(v.duration) && typeof v.percentage === "number" && Number.isFinite(v.percentage) && typeof v.updatedAt === "number" && Number.isFinite(v.updatedAt);
}
var StorageManager = class _StorageManager {
  namespace;
  storage;
  static MAX_WATCH_PROGRESS_ENTRIES = 100;
  constructor(namespace = "vidply") {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }
  /**
   * `localStorage` access can throw in private-browsing modes (Safari) and
   * is undefined in non-DOM environments. Both are tolerated here so the
   * Player still works (without persistence) when storage is unavailable.
   */
  isStorageAvailable() {
    try {
      if (typeof localStorage === "undefined") return false;
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
  /**
   * Generic get. Accepts an optional `validator` so callers can assert the
   * runtime shape of the parsed JSON before trusting it. Falls back to
   * `defaultValue` if the payload fails validation.
   */
  get(key, defaultValue = null, validator) {
    if (!this.storage) return defaultValue;
    try {
      const namespacedKey = this.getKey(key);
      const raw = this.storage.getItem(namespacedKey);
      if (raw === null) return defaultValue;
      const parsed = JSON.parse(raw);
      if (validator && !validator(parsed)) {
        console.warn(`[VidPly] Discarding malformed localStorage payload for "${key}"`);
        return defaultValue;
      }
      return parsed;
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
      const storage = this.storage;
      const keys = Object.keys(storage);
      keys.forEach((key) => {
        if (key.startsWith(this.namespace)) {
          storage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.warn("Failed to clear localStorage:", e);
      return false;
    }
  }
  saveTranscriptPreferences(preferences) {
    return this.set("transcript_preferences", shallowSanitize(preferences));
  }
  getTranscriptPreferences() {
    return this.get(
      "transcript_preferences",
      null,
      isPlainObject
    );
  }
  saveCaptionPreferences(preferences) {
    return this.set("caption_preferences", shallowSanitize(preferences));
  }
  getCaptionPreferences() {
    return this.get("caption_preferences", null, isPlainObject);
  }
  savePlayerPreferences(preferences) {
    const sanitized = shallowSanitize(preferences);
    if (typeof sanitized.volume === "number") {
      sanitized.volume = clamp(sanitized.volume, 0, 1);
    }
    if (typeof sanitized.playbackSpeed === "number") {
      sanitized.playbackSpeed = clamp(sanitized.playbackSpeed, 0.1, 4);
    }
    return this.set("player_preferences", sanitized);
  }
  getPlayerPreferences() {
    const value = this.get("player_preferences", null, isPlainObject);
    if (!value) return null;
    if (typeof value.volume === "number") {
      value.volume = clamp(value.volume, 0, 1);
    }
    if (typeof value.playbackSpeed === "number") {
      value.playbackSpeed = clamp(value.playbackSpeed, 0.1, 4);
    }
    return value;
  }
  saveSignLanguagePreferences(preferences) {
    return this.set("sign_language_preferences", shallowSanitize(preferences));
  }
  getSignLanguagePreferences() {
    return this.get("sign_language_preferences", null, isPlainObject);
  }
  saveFloatingPreferences(preferences) {
    return this.set("floating_preferences", shallowSanitize(preferences));
  }
  getFloatingPreferences() {
    return this.get("floating_preferences", null, isPlainObject);
  }
  /**
   * Persist watch progress for a video id. Numeric inputs are validated +
   * clamped so a caller cannot poison the store with `Infinity`/negatives.
   */
  saveWatchProgress(videoId, currentTime, duration) {
    if (typeof videoId !== "string" || !videoId) return false;
    if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return false;
    const safeDuration = clamp(duration, 1e-3, 24 * 60 * 60);
    const safeCurrent = clamp(currentTime, 0, safeDuration);
    const allProgress = this.get(
      "watch_progress",
      /* @__PURE__ */ Object.create(null),
      isWatchProgressMap
    ) ?? /* @__PURE__ */ Object.create(null);
    const percentage = safeCurrent / safeDuration * 100;
    allProgress[videoId] = {
      currentTime: safeCurrent,
      duration: safeDuration,
      percentage: clamp(percentage, 0, 100),
      updatedAt: Date.now()
    };
    const entries = Object.entries(allProgress);
    if (entries.length > _StorageManager.MAX_WATCH_PROGRESS_ENTRIES) {
      entries.sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      const toRemove = entries.length - _StorageManager.MAX_WATCH_PROGRESS_ENTRIES;
      for (let i = 0; i < toRemove; i++) {
        const entry = entries[i];
        if (entry) {
          delete allProgress[entry[0]];
        }
      }
    }
    return this.set("watch_progress", allProgress);
  }
  getWatchProgress(videoId) {
    if (!videoId) return null;
    const allProgress = this.get(
      "watch_progress",
      /* @__PURE__ */ Object.create(null),
      isWatchProgressMap
    ) ?? /* @__PURE__ */ Object.create(null);
    const entry = allProgress[videoId];
    return entry && isWatchProgressEntry(entry) ? entry : null;
  }
  clearWatchProgress(videoId) {
    if (!videoId) return false;
    const allProgress = this.get(
      "watch_progress",
      /* @__PURE__ */ Object.create(null),
      isWatchProgressMap
    ) ?? /* @__PURE__ */ Object.create(null);
    if (allProgress[videoId]) {
      delete allProgress[videoId];
      return this.set("watch_progress", allProgress);
    }
    return true;
  }
};
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isWatchProgressMap(value) {
  if (!isPlainObject(value)) return false;
  for (const entry of Object.values(value)) {
    if (!isWatchProgressEntry(entry)) return false;
  }
  return true;
}

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
//# sourceMappingURL=vidply.chunk-MWQA3TNR.js.map
