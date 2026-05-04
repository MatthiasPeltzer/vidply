/**
 * Prototype-pollution defence helpers.
 *
 * Every time the player mixes attacker-influenced data (JSON from
 * `data-vidply-options`, persisted values from `localStorage`,
 * translation catalogues fetched over HTTP, theme-variable overrides)
 * into an object with a normal prototype, the keys
 * `__proto__`, `prototype`, and `constructor` are stripped on the way in.
 *
 * This module centralises that logic so the three separate copies that
 * used to live in `core/Player.ts`, `utils/StorageManager.ts`,
 * `i18n/i18n.ts`, and `index.ts` cannot drift apart silently.
 */

/** Keys that are forbidden in attacker-influenced input. Frozen so no
 *  caller can accidentally mutate the shared set at runtime. */
export const PROTO_FORBIDDEN_KEYS: ReadonlySet<string> = Object.freeze(
  new Set(['__proto__', 'prototype', 'constructor'])
);

/** Return `true` if the key would risk prototype pollution. */
export function isForbiddenKey(key: PropertyKey): boolean {
  return PROTO_FORBIDDEN_KEYS.has(String(key));
}

/**
 * One-level copy of `input` that drops forbidden keys. The result has
 * a null prototype so further property access can't accidentally hit
 * `Object.prototype`. The generic `T` cast matches the ergonomic
 * pattern `shallowSanitize<MyShape>(dirty)` used by callers that know
 * the expected shape.
 */
export function shallowSanitize<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(input)) {
    if (isForbiddenKey(key)) continue;
    out[key] = value;
  }
  return out as T;
}

/**
 * Recursive, plain-object-only sanitiser. Arrays and primitives are
 * passed through unchanged; plain objects are copied onto a null
 * prototype with forbidden keys filtered.
 *
 * This is the shape needed by the i18n layer (nested translation
 * catalogues) and by any code that merges deeply nested options.
 */
export function deepSanitize<T = unknown>(input: unknown): T {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    // For non-objects we still want a null-prototype fallback in the
    // "expected an object but got garbage" case — matches the previous
    // i18n behaviour so catalogue loaders stay defensive.
    if (input && typeof input === 'object') {
      return input as T;
    }
    return Object.create(null) as T;
  }
  const out: Record<string, unknown> = Object.create(null);
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isForbiddenKey(key)) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepSanitize(value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}
