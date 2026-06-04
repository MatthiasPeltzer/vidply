export function debounce<T extends (...args: unknown[]) => void>(func: T, wait = 100): T {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  return function executedFunction(this: unknown, ...args: unknown[]) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  } as unknown as T;
}

export function throttle<T extends (...args: unknown[]) => void>(func: T, limit = 100): T {
  let inThrottle = false;
  return function executedFunction(this: unknown, ...args: unknown[]) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  } as unknown as T;
}

export function isMobile(breakpoint = 768): boolean {
  return window.innerWidth < breakpoint;
}

/**
 * True when the user has requested reduced motion via the OS / browser.
 * Guards against environments without matchMedia (older test runners).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Build scrollIntoView options whose animation honors prefers-reduced-motion:
 * smooth scrolling is downgraded to an instant jump when the user has
 * requested reduced motion (WCAG 2.3.3 Animation from Interactions).
 */
export function reducedMotionScrollOptions(
  block: ScrollLogicalPosition = 'nearest'
): ScrollIntoViewOptions {
  return { behavior: prefersReducedMotion() ? 'auto' : 'smooth', block };
}

export function rafWithTimeout(callback: () => void, timeout = 100): void {
  let called = false;

  const execute = () => {
    if (!called) {
      called = true;
      callback();
    }
  };

  requestAnimationFrame(execute);
  setTimeout(execute, timeout);
}
