/**
 * Unit Tests: StorageManager
 * Tests localStorage handling with namespace support
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from '../../src/utils/StorageManager.js';

describe('StorageManager', () => {
  let storage;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new StorageManager('vidply');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('initialization', () => {
    it('should create instance with default namespace', () => {
      const sm = new StorageManager();
      expect(sm.namespace).toBe('vidply');
    });

    it('should create instance with custom namespace', () => {
      const sm = new StorageManager('custom');
      expect(sm.namespace).toBe('custom');
    });

    it('should detect localStorage availability', () => {
      expect(storage.isStorageAvailable()).toBe(true);
    });
  });

  describe('getKey', () => {
    it('should create namespaced key', () => {
      expect(storage.getKey('volume')).toBe('vidply_volume');
    });

    it('should work with custom namespace', () => {
      const sm = new StorageManager('myapp');
      expect(sm.getKey('settings')).toBe('myapp_settings');
    });
  });

  describe('set and get', () => {
    it('should store and retrieve string values', () => {
      storage.set('test', 'hello');
      expect(storage.get('test')).toBe('hello');
    });

    it('should store and retrieve number values', () => {
      storage.set('volume', 0.75);
      expect(storage.get('volume')).toBe(0.75);
    });

    it('should store and retrieve boolean values', () => {
      storage.set('muted', true);
      expect(storage.get('muted')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const obj = { fontSize: 'large', color: '#fff' };
      storage.set('captions', obj);
      expect(storage.get('captions')).toEqual(obj);
    });

    it('should store and retrieve array values', () => {
      const arr = [1, 2, 3];
      storage.set('speeds', arr);
      expect(storage.get('speeds')).toEqual(arr);
    });

    it('should return default value for non-existent key', () => {
      expect(storage.get('nonexistent', 'default')).toBe('default');
    });

    it('should return null as default when no default provided', () => {
      expect(storage.get('nonexistent')).toBe(null);
    });

    it('should return true on successful set', () => {
      expect(storage.set('key', 'value')).toBe(true);
    });
  });

  describe('remove', () => {
    it('should remove a stored value', () => {
      storage.set('test', 'value');
      expect(storage.get('test')).toBe('value');
      
      storage.remove('test');
      expect(storage.get('test')).toBe(null);
    });

    it('should return true on successful remove', () => {
      storage.set('test', 'value');
      expect(storage.remove('test')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear only namespaced values', () => {
      // Set values in our namespace
      storage.set('volume', 0.5);
      storage.set('speed', 1.5);
      
      // Set value outside namespace
      localStorage.setItem('other_key', 'value');
      
      storage.clear();
      
      // Our values should be cleared
      expect(storage.get('volume')).toBe(null);
      expect(storage.get('speed')).toBe(null);
      
      // Other values should remain
      expect(localStorage.getItem('other_key')).toBe('value');
    });
  });

  describe('preference helpers', () => {
    it('should save and retrieve transcript preferences', () => {
      const prefs = { autoscroll: true, timestamps: false };
      storage.saveTranscriptPreferences(prefs);
      expect(storage.getTranscriptPreferences()).toEqual(prefs);
    });

    it('should save and retrieve caption preferences', () => {
      const prefs = { fontSize: 'large', fontFamily: 'sans-serif', color: '#ffffff' };
      storage.saveCaptionPreferences(prefs);
      expect(storage.getCaptionPreferences()).toEqual(prefs);
    });

    it('should save and retrieve player preferences', () => {
      const prefs = { volume: 0.8, speed: 1.25, muted: false };
      storage.savePlayerPreferences(prefs);
      expect(storage.getPlayerPreferences()).toEqual(prefs);
    });

    it('should save and retrieve sign language preferences', () => {
      const prefs = { position: 'bottom-right', width: 200, height: 150 };
      storage.saveSignLanguagePreferences(prefs);
      expect(storage.getSignLanguagePreferences()).toEqual(prefs);
    });

    it('should return null for non-existent preferences', () => {
      expect(storage.getTranscriptPreferences()).toBe(null);
      expect(storage.getCaptionPreferences()).toBe(null);
      expect(storage.getPlayerPreferences()).toBe(null);
      expect(storage.getSignLanguagePreferences()).toBe(null);
    });
  });

  describe('error handling', () => {
    it('should handle localStorage unavailable gracefully', () => {
      // Create storage with mocked unavailable localStorage
      const sm = new StorageManager('test');
      sm.storage = null; // Simulate unavailable
      
      expect(sm.set('key', 'value')).toBe(false);
      expect(sm.get('key', 'default')).toBe('default');
      expect(sm.remove('key')).toBe(false);
      expect(sm.clear()).toBe(false);
    });
  });

  describe('namespace isolation', () => {
    it('should isolate data between namespaces', () => {
      const storage1 = new StorageManager('app1');
      const storage2 = new StorageManager('app2');
      
      storage1.set('volume', 0.5);
      storage2.set('volume', 0.9);
      
      expect(storage1.get('volume')).toBe(0.5);
      expect(storage2.get('volume')).toBe(0.9);
    });
  });
});
