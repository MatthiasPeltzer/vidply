/**
 * TimeUtils Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimeUtils } from '../../src/utils/TimeUtils.js';
import { i18n } from '../../src/i18n/i18n.js';

describe('TimeUtils', () => {
  beforeEach(() => {
    // Reset i18n to English before each test
    i18n.setLanguage('en');
  });

  describe('formatTime', () => {
    it('should format seconds to MM:SS for values under an hour', () => {
      expect(TimeUtils.formatTime(0)).toBe('00:00');
      expect(TimeUtils.formatTime(30)).toBe('00:30');
      expect(TimeUtils.formatTime(60)).toBe('01:00');
      expect(TimeUtils.formatTime(90)).toBe('01:30');
      expect(TimeUtils.formatTime(599)).toBe('09:59');
      expect(TimeUtils.formatTime(3599)).toBe('59:59');
    });

    it('should format seconds to HH:MM:SS for values over an hour', () => {
      expect(TimeUtils.formatTime(3600)).toBe('01:00:00');
      expect(TimeUtils.formatTime(3661)).toBe('01:01:01');
      expect(TimeUtils.formatTime(7200)).toBe('02:00:00');
      expect(TimeUtils.formatTime(36000)).toBe('10:00:00');
    });

    it('should show hours when alwaysShowHours is true', () => {
      expect(TimeUtils.formatTime(0, true)).toBe('00:00:00');
      expect(TimeUtils.formatTime(30, true)).toBe('00:00:30');
      expect(TimeUtils.formatTime(90, true)).toBe('00:01:30');
    });

    it('should handle negative numbers gracefully', () => {
      expect(TimeUtils.formatTime(-1)).toBe('00:00');
      expect(TimeUtils.formatTime(-100)).toBe('00:00');
      expect(TimeUtils.formatTime(-1, true)).toBe('00:00:00');
    });

    it('should handle invalid values gracefully', () => {
      expect(TimeUtils.formatTime(NaN)).toBe('00:00');
      expect(TimeUtils.formatTime(Infinity)).toBe('00:00');
      expect(TimeUtils.formatTime(-Infinity)).toBe('00:00');
      expect(TimeUtils.formatTime(NaN, true)).toBe('00:00:00');
    });

    it('should pad numbers with leading zeros', () => {
      expect(TimeUtils.formatTime(5)).toBe('00:05');
      expect(TimeUtils.formatTime(65)).toBe('01:05');
      expect(TimeUtils.formatTime(3605)).toBe('01:00:05');
    });
  });

  describe('parseTime', () => {
    it('should parse HH:MM:SS format', () => {
      expect(TimeUtils.parseTime('00:00:00')).toBe(0);
      expect(TimeUtils.parseTime('01:00:00')).toBe(3600);
      expect(TimeUtils.parseTime('01:01:01')).toBe(3661);
      expect(TimeUtils.parseTime('10:30:45')).toBe(37845);
    });

    it('should parse MM:SS format', () => {
      expect(TimeUtils.parseTime('00:00')).toBe(0);
      expect(TimeUtils.parseTime('01:00')).toBe(60);
      expect(TimeUtils.parseTime('01:30')).toBe(90);
      expect(TimeUtils.parseTime('59:59')).toBe(3599);
    });

    it('should parse SS format (single value)', () => {
      expect(TimeUtils.parseTime('0')).toBe(0);
      expect(TimeUtils.parseTime('30')).toBe(30);
      expect(TimeUtils.parseTime('120')).toBe(120);
    });

    it('should be reversible with formatTime', () => {
      const testValues = [0, 30, 60, 90, 3600, 3661, 7200];
      testValues.forEach(seconds => {
        const formatted = TimeUtils.formatTime(seconds, true);
        expect(TimeUtils.parseTime(formatted)).toBe(seconds);
      });
    });
  });

  describe('formatDuration', () => {
    it('should format duration in human-readable form', () => {
      expect(TimeUtils.formatDuration(0)).toBe('0 seconds');
      expect(TimeUtils.formatDuration(1)).toBe('1 second');
      expect(TimeUtils.formatDuration(30)).toBe('30 seconds');
    });

    it('should include minutes when applicable', () => {
      expect(TimeUtils.formatDuration(60)).toBe('1 minute');
      expect(TimeUtils.formatDuration(120)).toBe('2 minutes');
      expect(TimeUtils.formatDuration(90)).toBe('1 minute, 30 seconds');
    });

    it('should include hours when applicable', () => {
      expect(TimeUtils.formatDuration(3600)).toBe('1 hour');
      expect(TimeUtils.formatDuration(7200)).toBe('2 hours');
      expect(TimeUtils.formatDuration(3660)).toBe('1 hour, 1 minute');
      expect(TimeUtils.formatDuration(3661)).toBe('1 hour, 1 minute, 1 second');
    });

    it('should handle invalid values gracefully', () => {
      expect(TimeUtils.formatDuration(-1)).toBe('0 seconds');
      expect(TimeUtils.formatDuration(NaN)).toBe('0 seconds');
      expect(TimeUtils.formatDuration(Infinity)).toBe('0 seconds');
    });
  });

  describe('formatBehindLive', () => {
    it('should prefix formatted time with a minus sign', () => {
      expect(TimeUtils.formatBehindLive(754)).toBe('\u221212:34');
      expect(TimeUtils.formatBehindLive(0)).toBe('\u221200:00');
    });
  });

  describe('formatPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(TimeUtils.formatPercentage(0, 100)).toBe(0);
      expect(TimeUtils.formatPercentage(50, 100)).toBe(50);
      expect(TimeUtils.formatPercentage(100, 100)).toBe(100);
      expect(TimeUtils.formatPercentage(25, 50)).toBe(50);
    });

    it('should round to nearest integer', () => {
      expect(TimeUtils.formatPercentage(1, 3)).toBe(33);
      expect(TimeUtils.formatPercentage(2, 3)).toBe(67);
    });

    it('should handle zero total', () => {
      expect(TimeUtils.formatPercentage(50, 0)).toBe(0);
      expect(TimeUtils.formatPercentage(0, 0)).toBe(0);
    });

    it('should handle values greater than total', () => {
      expect(TimeUtils.formatPercentage(150, 100)).toBe(150);
    });
  });
});
