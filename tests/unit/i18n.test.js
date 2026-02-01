/**
 * i18n (Internationalization) Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { i18n } from '../../src/i18n/i18n.js';

describe('i18n', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.setLanguage('en');
  });

  describe('setLanguage / getLanguage', () => {
    it('should set and get the current language', () => {
      i18n.setLanguage('en');
      expect(i18n.getLanguage()).toBe('en');
    });

    it('should fall back to English for unknown language', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      i18n.setLanguage('unknown');
      expect(i18n.getLanguage()).toBe('en');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Language "unknown" not found')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('t (translate)', () => {
    it('should translate simple keys', () => {
      expect(i18n.t('player.play')).toBe('Play');
      expect(i18n.t('player.pause')).toBe('Pause');
      expect(i18n.t('player.volume')).toBe('Volume');
    });

    it('should translate nested keys', () => {
      expect(i18n.t('captions.off')).toBe('Off');
      expect(i18n.t('captions.fontSize')).toBe('Font Size');
      expect(i18n.t('transcript.title')).toBe('Transcript');
    });

    it('should return the key if translation not found', () => {
      expect(i18n.t('nonexistent.key')).toBe('nonexistent.key');
      expect(i18n.t('player.nonexistent')).toBe('player.nonexistent');
    });

    it('should replace placeholders with values', () => {
      const result = i18n.t('player.rewindSeconds', { seconds: 10 });
      expect(result).toBe('Rewind 10 seconds');
    });

    it('should replace multiple placeholders', () => {
      const result = i18n.t('playlist.trackOf', { current: 3, total: 10 });
      expect(result).toBe('Track 3 of 10');
    });

    it('should handle count-based translations', () => {
      expect(i18n.t('time.hour', { count: 1 })).toBe('1 hour');
      expect(i18n.t('time.hours', { count: 2 })).toBe('2 hours');
      expect(i18n.t('time.minute', { count: 1 })).toBe('1 minute');
      expect(i18n.t('time.minutes', { count: 5 })).toBe('5 minutes');
      expect(i18n.t('time.second', { count: 1 })).toBe('1 second');
      expect(i18n.t('time.seconds', { count: 30 })).toBe('30 seconds');
    });
  });

  describe('addTranslation', () => {
    it('should add translations for a new language', () => {
      i18n.addTranslation('test', {
        player: {
          play: 'Test Play',
          pause: 'Test Pause'
        }
      });
      
      i18n.setLanguage('test');
      expect(i18n.t('player.play')).toBe('Test Play');
      expect(i18n.t('player.pause')).toBe('Test Pause');
    });

    it('should merge translations with existing language', () => {
      i18n.addTranslation('en', {
        custom: {
          key: 'Custom Value'
        }
      });
      
      expect(i18n.t('custom.key')).toBe('Custom Value');
      // Original translations should still work
      expect(i18n.t('player.play')).toBe('Play');
    });
  });

  describe('ensureLanguage', () => {
    it('should return current language for empty input', async () => {
      const result = await i18n.ensureLanguage('');
      expect(result).toBe('en');
    });

    it('should return normalized language if already loaded', async () => {
      const result = await i18n.ensureLanguage('EN');
      expect(result).toBe('en');
    });

    it('should return null for unavailable language', async () => {
      const result = await i18n.ensureLanguage('xyz');
      expect(result).toBeNull();
    });
  });

  describe('translation coverage', () => {
    it('should have all player controls translated', () => {
      const playerKeys = [
        'player.play',
        'player.pause',
        'player.stop',
        'player.volume',
        'player.mute',
        'player.unmute',
        'player.fullscreen',
        'player.exitFullscreen',
        'player.captions',
        'player.settings',
        'player.speed',
        'player.loading',
        'player.error'
      ];

      playerKeys.forEach(key => {
        const translation = i18n.t(key);
        expect(translation).not.toBe(key, `Missing translation for: ${key}`);
      });
    });

    it('should have all caption settings translated', () => {
      const captionKeys = [
        'captions.off',
        'captions.select',
        'captions.fontSize',
        'captions.fontFamily',
        'captions.color',
        'captions.backgroundColor',
        'captions.opacity'
      ];

      captionKeys.forEach(key => {
        const translation = i18n.t(key);
        expect(translation).not.toBe(key, `Missing translation for: ${key}`);
      });
    });

    it('should have all accessibility features translated', () => {
      const a11yKeys = [
        'audioDescription.enable',
        'audioDescription.disable',
        'signLanguage.show',
        'signLanguage.hide',
        'transcript.title',
        'transcript.close',
        'transcript.loading'
      ];

      a11yKeys.forEach(key => {
        const translation = i18n.t(key);
        expect(translation).not.toBe(key, `Missing translation for: ${key}`);
      });
    });
  });

  describe('fallback behavior', () => {
    it('should fall back to English for missing translations in other languages', async () => {
      // Add a partial language
      i18n.addTranslation('partial', {
        player: {
          play: 'Partial Play'
          // Missing other keys
        }
      });
      
      i18n.setLanguage('partial');
      
      // Should use partial translation
      expect(i18n.t('player.play')).toBe('Partial Play');
      
      // Should fall back to English for missing keys
      expect(i18n.t('player.pause')).toBe('Pause');
    });
  });
});
