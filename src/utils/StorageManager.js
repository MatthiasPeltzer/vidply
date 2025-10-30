/**
 * StorageManager - Handles persistent storage of user preferences
 */

export class StorageManager {
  constructor(namespace = 'vidply') {
    this.namespace = namespace;
    this.storage = this.isStorageAvailable() ? localStorage : null;
  }

  /**
   * Check if localStorage is available
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
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
      console.warn('Failed to save to localStorage:', e);
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
      console.warn('Failed to read from localStorage:', e);
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
      console.warn('Failed to remove from localStorage:', e);
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
      keys.forEach(key => {
        if (key.startsWith(this.namespace)) {
          this.storage.removeItem(key);
        }
      });
      return true;
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
      return false;
    }
  }

  /**
   * Save transcript preferences
   */
  saveTranscriptPreferences(preferences) {
    return this.set('transcript_preferences', preferences);
  }

  /**
   * Get transcript preferences
   */
  getTranscriptPreferences() {
    return this.get('transcript_preferences', null);
  }

  /**
   * Save caption preferences
   */
  saveCaptionPreferences(preferences) {
    return this.set('caption_preferences', preferences);
  }

  /**
   * Get caption preferences
   */
  getCaptionPreferences() {
    return this.get('caption_preferences', null);
  }

  /**
   * Save player preferences (volume, speed, etc.)
   */
  savePlayerPreferences(preferences) {
    return this.set('player_preferences', preferences);
  }

  /**
   * Get player preferences
   */
  getPlayerPreferences() {
    return this.get('player_preferences', null);
  }

  /**
   * Save sign language preferences (position and size)
   */
  saveSignLanguagePreferences(preferences) {
    return this.set('sign_language_preferences', preferences);
  }

  /**
   * Get sign language preferences
   */
  getSignLanguagePreferences() {
    return this.get('sign_language_preferences', null);
  }
}

