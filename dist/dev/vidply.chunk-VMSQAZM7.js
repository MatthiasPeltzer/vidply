/*!
 * VidPly v1.2.0 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/FocusUtils.ts
function focusElement(element, { delay = 0, preventScroll = true } = {}) {
  if (!element) return;
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (element && document.contains(element)) {
        element.focus({ preventScroll });
      }
    }, delay);
  });
}
function focusFirstElement(container, selector, options = {}) {
  if (!container) return;
  const element = container.querySelector(selector);
  if (element) {
    focusElement(element, options);
  }
}

export {
  focusElement,
  focusFirstElement
};
//# sourceMappingURL=vidply.chunk-VMSQAZM7.js.map
