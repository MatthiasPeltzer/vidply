/**
 * Collect tabbable elements inside a container, in DOM order (WCAG 2.4.3).
 */
export declare function getFocusableElements(container: HTMLElement | null): HTMLElement[];
/**
 * Keep Tab / Shift+Tab within a modal container (WCAG 2.1.2, 2.4.3).
 * Returns true when the key event was handled.
 */
export declare function trapFocusInContainer(e: KeyboardEvent, container: HTMLElement | null): boolean;
/**
 * Mark all direct children of a container inert except one element.
 * Returns the list of elements this call marked so they can be restored later.
 */
export declare function setContainerChildrenInert(container: HTMLElement, except: HTMLElement | null, enabled: boolean, tracked: Element[]): Element[];
export declare function focusElement(element: HTMLElement | null, { delay, preventScroll }?: {
    delay?: number;
    preventScroll?: boolean;
}): void;
export declare function focusFirstElement(container: HTMLElement | null, selector: string, options?: {
    delay?: number;
    preventScroll?: boolean;
}): void;
//# sourceMappingURL=FocusUtils.d.ts.map