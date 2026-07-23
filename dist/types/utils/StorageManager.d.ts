/**
 * Type guard helpers used by the validated `get()` overload below.
 * Each guard accepts an unknown JSON value and tells TypeScript whether
 * it matches the expected runtime shape.
 */
export type Validator<T> = (value: unknown) => value is T;
interface WatchProgressEntry {
    currentTime: number;
    duration: number;
    percentage: number;
    updatedAt: number;
}
/**
 * Loose alias for stored preference payloads. Numeric/string-typed fields
 * are validated at the boundary (`isPlainObject`) and clamped where it
 * matters (volume, playbackSpeed). Individual properties remain `unknown`
 * so callers must narrow before use.
 */
export type StoredPreferences = Record<string, unknown>;
export declare class StorageManager {
    private namespace;
    private storage;
    static MAX_WATCH_PROGRESS_ENTRIES: number;
    constructor(namespace?: string);
    /**
     * `localStorage` access can throw in private-browsing modes (Safari) and
     * is undefined in non-DOM environments. Both are tolerated here so the
     * Player still works (without persistence) when storage is unavailable.
     */
    isStorageAvailable(): boolean;
    getKey(key: string): string;
    set(key: string, value: unknown): boolean;
    /**
     * Generic get. Accepts an optional `validator` so callers can assert the
     * runtime shape of the parsed JSON before trusting it. Falls back to
     * `defaultValue` if the payload fails validation.
     */
    get<T = unknown>(key: string, defaultValue?: T | null, validator?: Validator<T>): T | null;
    remove(key: string): boolean;
    clear(): boolean;
    saveTranscriptPreferences(preferences: StoredPreferences): boolean;
    getTranscriptPreferences(): StoredPreferences | null;
    saveCaptionPreferences(preferences: StoredPreferences): boolean;
    getCaptionPreferences(): StoredPreferences | null;
    savePlayerPreferences(preferences: StoredPreferences): boolean;
    getPlayerPreferences(): StoredPreferences | null;
    saveSignLanguagePreferences(preferences: StoredPreferences): boolean;
    getSignLanguagePreferences(): StoredPreferences | null;
    saveFloatingPreferences(preferences: StoredPreferences): boolean;
    getFloatingPreferences(): StoredPreferences | null;
    /**
     * Persist watch progress for a video id. Numeric inputs are validated +
     * clamped so a caller cannot poison the store with `Infinity`/negatives.
     */
    saveWatchProgress(videoId: string, currentTime: number, duration: number): boolean;
    getWatchProgress(videoId: string): WatchProgressEntry | null;
    clearWatchProgress(videoId: string): boolean;
}
export {};
//# sourceMappingURL=StorageManager.d.ts.map