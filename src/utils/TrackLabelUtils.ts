import { i18n } from '../i18n/i18n.js';

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
export function deriveTrackLabel(
    rawLabel: string | null | undefined,
    language: string | null | undefined,
    fallbackKey = 'player.captions'
): string {
    const cleanLabel = (rawLabel ?? '').trim();
    const cleanLang = (language ?? '').trim();

    const looksLikePlaceholder =
        cleanLabel === '' ||
        /^\d+$/.test(cleanLabel) ||
        /^(null|undefined)$/i.test(cleanLabel);
    if (!looksLikePlaceholder) {
        return cleanLabel;
    }

    const cleanLangIsUsable =
        cleanLang !== '' && !/^(null|undefined)$/i.test(cleanLang);

    if (cleanLangIsUsable) {
        try {
            // Use endonyms: each language shown in its own name
            // ("English", "Deutsch") rather than translated into the UI
            // language ("Englisch", "Deutsch").
            const displayNames = new Intl.DisplayNames([cleanLang, 'en'], { type: 'language' });
            const name = displayNames.of(cleanLang);
            if (name && name.toLowerCase() !== cleanLang.toLowerCase()) {
                return name;
            }
        } catch {
            // Intl.DisplayNames may be unavailable — fall through to the code.
        }
        return cleanLang.toUpperCase();
    }

    return i18n.t(fallbackKey);
}
