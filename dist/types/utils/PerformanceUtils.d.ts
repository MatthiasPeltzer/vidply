export declare function debounce<T extends (...args: unknown[]) => void>(func: T, wait?: number): T;
export declare function throttle<T extends (...args: unknown[]) => void>(func: T, limit?: number): T;
export declare function isMobile(breakpoint?: number): boolean;
/** iOS / iPadOS (including iPad desktop mode reporting as MacIntel). */
export declare function isIOS(): boolean;
/** True when Safari should play HLS via the native `<video>` URL (no hls.js MSE). */
export declare function canPlayNativeHls(): boolean;
export declare function isIPhone(): boolean;
export declare function isLikelyUnsupportedYoutubeEmbedHost(hostname?: string): boolean;
export declare function shouldUseYoutubeIosLanFallback(): boolean;
/**
 * True when the user has requested reduced motion via the OS / browser.
 * Guards against environments without matchMedia (older test runners).
 */
export declare function prefersReducedMotion(): boolean;
/**
 * Build scrollIntoView options whose animation honors prefers-reduced-motion:
 * smooth scrolling is downgraded to an instant jump when the user has
 * requested reduced motion (WCAG 2.3.3 Animation from Interactions).
 */
export declare function reducedMotionScrollOptions(block?: ScrollLogicalPosition): ScrollIntoViewOptions;
/**
 * Reveal `element` inside its own scroll container without moving the page.
 *
 * `scrollIntoView()` scrolls every scrollable ancestor up to the document, even
 * with `block: 'nearest'`. Calling it while the page is still loading therefore
 * drags the whole viewport to the player, which the visitor sees as the page
 * scrolling on its own. Use this instead whenever the scroll was not requested
 * by the user.
 */
export declare function scrollIntoViewWithinScrollParent(element: HTMLElement): void;
export declare function rafWithTimeout(callback: () => void, timeout?: number): void;
//# sourceMappingURL=PerformanceUtils.d.ts.map