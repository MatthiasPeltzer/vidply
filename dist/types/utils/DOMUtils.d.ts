/**
 * Options accepted by {@link DOMUtils.createElement}.
 *
 * `innerHTML` is deliberately **not** exposed here. Code that needs to
 * inject raw markup must do so explicitly at the call site where the
 * source of the markup is auditable; DOMUtils is the "safe by default"
 * surface.
 */
export interface CreateElementOptions {
    className?: string;
    attributes?: Record<string, string | undefined>;
    textContent?: string;
    style?: Partial<CSSStyleDeclaration>;
    children?: (Node | null | undefined)[];
}
declare function createElementImpl<K extends keyof HTMLElementTagNameMap>(tag: K, options?: CreateElementOptions): HTMLElementTagNameMap[K];
declare function createElementImpl(tag: string, options?: CreateElementOptions): HTMLElement;
export declare const DOMUtils: {
    createElement: typeof createElementImpl;
    show(element: HTMLElement | null | undefined): void;
    hide(element: HTMLElement | null | undefined): void;
    fadeIn(element: HTMLElement | null, duration?: number, onComplete?: () => void): void;
    fadeOut(element: HTMLElement | null, duration?: number, onComplete?: () => void): void;
    offset(element: HTMLElement | null): {
        top: number;
        left: number;
        width: number;
        height: number;
    };
    escapeHTML(str: string): string;
    /**
     * Render a WebVTT cue's text safely.
     *
     * The previous implementation ran a regex-based blacklist over the cue
     * string and assigned the result to `innerHTML`, which is a known-unsafe
     * pattern (mutation-XSS bypasses, attribute-name tricks, etc.). Caption
     * text on most sites is fetched verbatim from external `.vtt` files that
     * the embedding page has no control over (third-party HLS/DASH manifests,
     * user-supplied playlists, ...) so this code path is reachable by
     * untrusted authors.
     *
     * The new implementation tokenizes only the WebVTT inline tags allowed by
     * the spec (`<b>`, `<i>`, `<u>`, `<c[.class]>`, `<v authorName>`) and
     * builds the resulting DOM via `document.createElement` /
     * `document.createTextNode`. Anything else (script, iframe, attributes,
     * URL schemes, character refs, ...) is rendered as literal text.
     *
     * Cue input is hard-capped at 10,000 characters before parsing to
     * eliminate ReDoS and runaway-DOM concerns.
     */
    renderVTTToDOM(text: string): DocumentFragment;
    createTooltip(text: string, classPrefix?: string): HTMLElement;
    attachTooltip(element: HTMLElement | null, text: string, classPrefix?: string): void;
    createButtonText(text: string, classPrefix?: string): HTMLElement;
    addClass(element: HTMLElement | null | undefined, className: string): void;
    removeClass(element: HTMLElement | null | undefined, className: string): void;
    toggleClass(element: HTMLElement | null | undefined, className: string): void;
    hasClass(element: HTMLElement | null | undefined, className: string): boolean;
};
export {};
//# sourceMappingURL=DOMUtils.d.ts.map