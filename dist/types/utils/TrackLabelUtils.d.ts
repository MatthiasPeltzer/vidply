/**
 * Derive a human-readable label for a TextTrack when the source manifest
 * (DASH AdaptationSet, HLS rendition, etc.) didn't provide one. dash.js
 * falls back to the AdaptationSet @id (typically a digit like "2", "3")
 * when no <Label> child element is present, which surfaces as cryptic
 * "2"/"3" entries in the captions menu.
 *
 * dash.js 5.x additionally derives the label as `element.id ?? element.lang`.
 * When neither is present in the MPD, the value is JS `null`, and the
 * browser's TextTrack API stringifies it to the literal "null". We treat
 * "null"/"undefined" (any casing) as placeholders too, and fall back to a
 * localized language name via Intl.DisplayNames.
 */
export declare function deriveTrackLabel(rawLabel: string | null | undefined, language: string | null | undefined, fallbackKey?: string): string;
//# sourceMappingURL=TrackLabelUtils.d.ts.map