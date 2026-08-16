/*!
 * VidPly v1.2.9 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */

// src/utils/FocusUtils.ts
var FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
function getFocusableElements(container) {
  if (!container) {
    return [];
  }
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("tabindex") !== "-1"
  );
}
function trapFocusInContainer(e, container) {
  if (e.key !== "Tab" || !container) {
    return false;
  }
  const focusable = getFocusableElements(container).filter(
    (el) => el.offsetParent !== null || container.contains(el)
  );
  if (focusable.length === 0) {
    return false;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (!first || !last) {
    return false;
  }
  const active = document.activeElement;
  const within = active !== null && container.contains(active);
  if (e.shiftKey) {
    if (!within || active === first) {
      e.preventDefault();
      last.focus({ preventScroll: true });
      return true;
    }
  } else if (!within || active === last) {
    e.preventDefault();
    first.focus({ preventScroll: true });
    return true;
  }
  return false;
}
function setContainerChildrenInert(container, except, enabled, tracked) {
  if (!enabled) {
    for (const el of tracked) {
      el.removeAttribute("inert");
    }
    return [];
  }
  const next = [];
  for (const child of Array.from(container.children)) {
    if (child === except) {
      continue;
    }
    if (!(child instanceof HTMLElement)) {
      continue;
    }
    const tag = child.tagName;
    if (tag === "SCRIPT" || tag === "STYLE") {
      continue;
    }
    if (!child.hasAttribute("inert")) {
      child.setAttribute("inert", "");
      next.push(child);
    }
  }
  return next;
}
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
  trapFocusInContainer,
  setContainerChildrenInert,
  focusElement,
  focusFirstElement
};
//# sourceMappingURL=vidply.chunk-QCNYPXPM.js.map
