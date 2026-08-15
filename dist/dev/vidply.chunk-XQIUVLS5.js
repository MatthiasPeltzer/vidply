/*!
 * VidPly v1.2.9 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/PerformanceUtils.ts
function debounce(func, wait = 100) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
function throttle(func, limit = 100) {
  let inThrottle = false;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
function isMobile(breakpoint = 768) {
  return window.innerWidth < breakpoint;
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function reducedMotionScrollOptions(block = "nearest") {
  return { behavior: prefersReducedMotion() ? "auto" : "smooth", block };
}
function rafWithTimeout(callback, timeout = 100) {
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

export {
  debounce,
  throttle,
  isMobile,
  reducedMotionScrollOptions,
  rafWithTimeout
};
//# sourceMappingURL=vidply.chunk-XQIUVLS5.js.map
