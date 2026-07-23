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
export declare const PROTO_FORBIDDEN_KEYS: ReadonlySet<string>;
/** Return `true` if the key would risk prototype pollution. */
export declare function isForbiddenKey(key: PropertyKey): boolean;
/**
 * One-level copy of `input` that drops forbidden keys. The result has
 * a null prototype so further property access can't accidentally hit
 * `Object.prototype`. The generic `T` cast matches the ergonomic
 * pattern `shallowSanitize<MyShape>(dirty)` used by callers that know
 * the expected shape.
 */
export declare function shallowSanitize<T extends Record<string, unknown>>(input: T): T;
/**
 * Recursive, plain-object-only sanitiser. Arrays and primitives are
 * passed through unchanged; plain objects are copied onto a null
 * prototype with forbidden keys filtered.
 *
 * This is the shape needed by the i18n layer (nested translation
 * catalogues) and by any code that merges deeply nested options.
 */
export declare function deepSanitize<T = unknown>(input: unknown): T;
//# sourceMappingURL=Sanitize.d.ts.map