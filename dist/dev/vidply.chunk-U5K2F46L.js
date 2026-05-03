/*!
 * Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  createIconElement
} from "./vidply.chunk-D47TSGMP.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-X3Y5J67K.js";

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

// src/utils/MenuUtils.ts
function createMenuItem({
  classPrefix,
  itemClass,
  icon,
  label,
  ariaLabel,
  onClick,
  hasTextClass = false
}) {
  const isI18nKeyForAria = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
  const ariaLabelText = ariaLabel || (isI18nKeyForAria ? i18n.t(label) || label : label);
  const button = DOMUtils.createElement("button", {
    className: itemClass,
    attributes: {
      type: "button",
      "aria-label": ariaLabelText,
      tabindex: "-1"
    }
  });
  if (icon) {
    button.appendChild(createIconElement(icon));
  }
  const isI18nKey = typeof label === "string" && (label.startsWith("transcript.") || label.startsWith("player.") || label.startsWith("settings."));
  const textContent = isI18nKey ? i18n.t(label) || label : label;
  const text = DOMUtils.createElement("span", {
    textContent,
    className: hasTextClass ? `${classPrefix}-settings-text` : void 0,
    attributes: { "aria-hidden": "true" }
  });
  button.appendChild(text);
  if (onClick) {
    button.addEventListener("click", onClick);
  }
  return button;
}
function attachMenuKeyboardNavigation(menu, button, itemSelector, onClose) {
  if (!menu) return void 0;
  const menuItems = Array.from(menu.querySelectorAll(itemSelector));
  if (menuItems.length === 0) return void 0;
  const handleKeyDown = (e) => {
    const currentIndex = menuItems.indexOf(document.activeElement);
    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        e.stopPropagation();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === nextIndex ? "0" : "-1");
        });
        menuItems[nextIndex].focus({ preventScroll: false });
        menuItems[nextIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
      case "ArrowUp": {
        e.preventDefault();
        e.stopPropagation();
        const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === prevIndex ? "0" : "-1");
        });
        menuItems[prevIndex].focus({ preventScroll: false });
        menuItems[prevIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
      case "Home": {
        e.preventDefault();
        e.stopPropagation();
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === 0 ? "0" : "-1");
        });
        menuItems[0].focus({ preventScroll: false });
        menuItems[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
      case "End": {
        e.preventDefault();
        e.stopPropagation();
        const lastIndex = menuItems.length - 1;
        menuItems.forEach((item, idx) => {
          item.setAttribute("tabindex", idx === lastIndex ? "0" : "-1");
        });
        menuItems[lastIndex].focus({ preventScroll: false });
        menuItems[lastIndex].scrollIntoView({ behavior: "smooth", block: "nearest" });
        break;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement && menuItems.includes(document.activeElement)) {
          document.activeElement.click();
          if (onClose) {
            setTimeout(() => {
              if (button && document.contains(button)) {
                button.focus();
              }
            }, 0);
          }
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        if (onClose) {
          onClose();
        }
        break;
    }
  };
  menu.addEventListener("keydown", handleKeyDown, true);
  return handleKeyDown;
}
function focusFirstMenuItem(menu, itemSelector, delay = 0) {
  if (!menu) return;
  setTimeout(() => {
    const menuItems = Array.from(menu.querySelectorAll(itemSelector));
    if (menuItems.length > 0) {
      menuItems.forEach((item, index) => {
        item.setAttribute("tabindex", index === 0 ? "0" : "-1");
      });
      focusElement(menuItems[0], { delay: 0 });
      menuItems[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, delay);
}

// src/utils/FormUtils.ts
function createLabeledSelect({
  classPrefix,
  labelClass,
  selectClass,
  labelText,
  selectId,
  hidden = false,
  onChange = void 0,
  options = []
}) {
  const isI18nKey = typeof labelText === "string" && (labelText.startsWith("transcript.") || labelText.startsWith("player.") || labelText.startsWith("settings.") || labelText.startsWith("captions."));
  const labelTextContent = isI18nKey ? i18n.t(labelText) || labelText : labelText;
  const label = DOMUtils.createElement("label", {
    className: labelClass,
    textContent: labelTextContent,
    attributes: {
      for: selectId,
      style: hidden ? "display: none;" : void 0
    }
  });
  const select = DOMUtils.createElement("select", {
    className: selectClass,
    attributes: {
      id: selectId,
      style: hidden ? "display: none;" : void 0
    }
  });
  options.forEach((opt) => {
    const option = DOMUtils.createElement("option", {
      textContent: opt.text,
      attributes: {
        value: opt.value,
        selected: opt.selected ? "selected" : void 0
      }
    });
    select.appendChild(option);
  });
  if (onChange) {
    select.addEventListener("change", onChange);
  }
  return { label, select };
}
function preventDragOnElement(element) {
  if (!element) return;
  ["pointerdown", "mousedown", "click"].forEach((eventType) => {
    element.addEventListener(eventType, (e) => {
      e.stopPropagation();
    });
  });
}

export {
  focusElement,
  focusFirstElement,
  createMenuItem,
  attachMenuKeyboardNavigation,
  focusFirstMenuItem,
  createLabeledSelect,
  preventDragOnElement
};
//# sourceMappingURL=vidply.chunk-U5K2F46L.js.map
