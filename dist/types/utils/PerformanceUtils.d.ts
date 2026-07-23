export declare function debounce<T extends (...args: unknown[]) => void>(func: T, wait?: number): T;
export declare function throttle<T extends (...args: unknown[]) => void>(func: T, limit?: number): T;
export declare function isMobile(breakpoint?: number): boolean;
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
export declare function rafWithTimeout(callback: () => void, timeout?: number): void;
//# sourceMappingURL=PerformanceUtils.d.ts.map