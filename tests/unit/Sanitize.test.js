/**
 * Unit Tests: Sanitize (prototype-pollution defence)
 *
 * These cover the security-critical invariants of the sanitiser used on
 * every attacker-influenced object the player ingests (JSON from
 * `data-vidply-options`, persisted localStorage values, fetched
 * translation catalogues). The forbidden keys must be stripped and the
 * global `Object.prototype` must never be polluted.
 *
 * NOTE: payloads use `JSON.parse` rather than object literals on purpose
 * — `{ __proto__: x }` in source sets the prototype instead of creating
 * an own `"__proto__"` property, so it would not reproduce the real
 * attack surface (JSON parsed from an attribute/response does).
 */

import { describe, it, expect } from 'vitest';
import {
  PROTO_FORBIDDEN_KEYS,
  isForbiddenKey,
  shallowSanitize,
  deepSanitize
} from '../../src/utils/Sanitize.js';

describe('Sanitize', () => {
  describe('PROTO_FORBIDDEN_KEYS', () => {
    it('contains the three dangerous keys and is frozen', () => {
      expect(PROTO_FORBIDDEN_KEYS.has('__proto__')).toBe(true);
      expect(PROTO_FORBIDDEN_KEYS.has('prototype')).toBe(true);
      expect(PROTO_FORBIDDEN_KEYS.has('constructor')).toBe(true);
      expect(Object.isFrozen(PROTO_FORBIDDEN_KEYS)).toBe(true);
    });
  });

  describe('isForbiddenKey', () => {
    it('flags forbidden keys and allows normal ones', () => {
      expect(isForbiddenKey('__proto__')).toBe(true);
      expect(isForbiddenKey('constructor')).toBe(true);
      expect(isForbiddenKey('prototype')).toBe(true);
      expect(isForbiddenKey('volume')).toBe(false);
      expect(isForbiddenKey('lang')).toBe(false);
    });
  });

  describe('shallowSanitize', () => {
    it('drops forbidden keys but keeps safe ones', () => {
      const dirty = JSON.parse('{"__proto__": {"x": 1}, "constructor": 2, "prototype": 3, "volume": 0.5}');
      const clean = shallowSanitize(dirty);

      expect(clean.volume).toBe(0.5);
      expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(clean, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(clean, 'prototype')).toBe(false);
    });

    it('does not pollute Object.prototype', () => {
      const dirty = JSON.parse('{"__proto__": {"polluted": true}}');
      shallowSanitize(dirty);
      expect(({}).polluted).toBeUndefined();
    });

    it('returns an object with a null prototype', () => {
      const clean = shallowSanitize(JSON.parse('{"a": 1}'));
      expect(Object.getPrototypeOf(clean)).toBeNull();
    });
  });

  describe('deepSanitize', () => {
    it('strips forbidden keys at nested levels', () => {
      const dirty = JSON.parse('{"outer": {"__proto__": {"polluted": true}, "safe": 1}}');
      const clean = deepSanitize(dirty);

      expect(clean.outer.safe).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(clean.outer, '__proto__')).toBe(false);
      expect(({}).polluted).toBeUndefined();
    });

    it('passes arrays and primitives through', () => {
      const dirty = JSON.parse('{"list": [1, 2, 3], "name": "x"}');
      const clean = deepSanitize(dirty);
      expect(clean.list).toEqual([1, 2, 3]);
      expect(clean.name).toBe('x');
    });

    it('returns a null-prototype object for non-object input', () => {
      const clean = deepSanitize('not-an-object');
      expect(Object.getPrototypeOf(clean)).toBeNull();
      expect(Object.keys(clean).length).toBe(0);
    });

    it('neutralises deeply nested pollution', () => {
      const dirty = JSON.parse('{"a": {"b": {"constructor": {"prototype": {"polluted": 1}}}}}');
      deepSanitize(dirty);
      expect(({}).polluted).toBeUndefined();
    });
  });
});
