/**
 * Minimal RTE HTML sanitiser for host-supplied rich text (e.g. CMS long
 * descriptions). Strips scripts, event handlers, and dangerous URLs while
 * keeping common formatting tags.
 */
/**
 * Parse `html` and return a sanitised `DocumentFragment` safe to append.
 * Returns an empty fragment for blank input.
 */
export declare function createSanitizedRichTextFragment(html: string): DocumentFragment;
/**
 * Replace `container` children with sanitised rich-text content.
 */
export declare function setSanitizedRichText(container: HTMLElement, html: string): void;
//# sourceMappingURL=RichText.d.ts.map