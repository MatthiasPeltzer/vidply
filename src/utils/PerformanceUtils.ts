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
