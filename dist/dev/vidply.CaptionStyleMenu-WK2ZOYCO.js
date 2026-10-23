/*!
 * VidPly v1.2.24 - Universal, Accessible Video Player
 * (c) 2026 Matthias Peltzer
 * Released under GPL-2.0-or-later License
 */
import {
  focusFirstElement,
  trapFocusInContainer
} from "./vidply.chunk-6RBUOOPF.js";
import {
  DOMUtils,
  i18n
} from "./vidply.chunk-SGUTND4P.js";

// src/controls/CaptionStyleMenu.ts
function captionStylePropertyName(property) {
  const stripped = property.replace("captions", "");
  return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}
function createStyleControl(player, label, property, options) {
  const group = DOMUtils.createElement("div", {
    className: `${player.options.classPrefix}-style-group`
  });
  const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;
  const labelEl = DOMUtils.createElement("label", {
    textContent: label,
    attributes: {
      "for": controlId
    }
  });
  group.appendChild(labelEl);
  const select = DOMUtils.createElement("select", {
    className: `${player.options.classPrefix}-style-select`,
    attributes: {
      "id": controlId
    }
  });
  const currentValue = player.options[property];
  options.forEach((opt) => {
    const option = DOMUtils.createElement("option", {
      textContent: opt.label,
      attributes: { value: opt.value }
    });
    if (opt.value === currentValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  select.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  select.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  select.addEventListener("change", (e) => {
    e.stopPropagation();
    player.options[property] = e.target.value;
    if (player.captionManager) {
      player.captionManager.setCaptionStyle(
        captionStylePropertyName(property),
        e.target.value
      );
    }
  });
  group.appendChild(select);
  return group;
}
function createColorControl(player, label, property) {
  const group = DOMUtils.createElement("div", {
    className: `${player.options.classPrefix}-style-group`
  });
  const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;
  const labelEl = DOMUtils.createElement("label", {
    textContent: label,
    attributes: {
      "for": controlId
    }
  });
  group.appendChild(labelEl);
  const input = DOMUtils.createElement("input", {
    className: `${player.options.classPrefix}-style-color`,
    attributes: {
      "id": controlId,
      type: "color",
      value: String(player.options[property] ?? "")
    }
  });
  input.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  input.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  input.addEventListener("change", (e) => {
    e.stopPropagation();
    player.options[property] = e.target.value;
    if (player.captionManager) {
      player.captionManager.setCaptionStyle(
        captionStylePropertyName(property),
        e.target.value
      );
    }
  });
  group.appendChild(input);
  return group;
}
function createOpacityControl(player, label, property) {
  const group = DOMUtils.createElement("div", {
    className: `${player.options.classPrefix}-style-group`
  });
  const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;
  const labelEl = DOMUtils.createElement("label", {
    textContent: label,
    attributes: {
      "for": controlId
    }
  });
  group.appendChild(labelEl);
  const valueEl = DOMUtils.createElement("span", {
    textContent: Math.round(Number(player.options[property] ?? 0) * 100) + "%",
    className: `${player.options.classPrefix}-style-value`
  });
  const input = DOMUtils.createElement("input", {
    className: `${player.options.classPrefix}-style-range`,
    attributes: {
      "id": controlId,
      type: "range",
      min: "0",
      max: "1",
      step: "0.1",
      value: String(player.options[property])
    }
  });
  input.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  input.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  input.addEventListener("input", (e) => {
    e.stopPropagation();
    const value = parseFloat(e.target.value);
    valueEl.textContent = Math.round(value * 100) + "%";
    player.options[property] = value;
    if (player.captionManager) {
      player.captionManager.setCaptionStyle(
        captionStylePropertyName(property),
        value
      );
    }
  });
  const rangeContainer = DOMUtils.createElement("div", {
    className: `${player.options.classPrefix}-style-range-container`
  });
  rangeContainer.appendChild(input);
  rangeContainer.appendChild(valueEl);
  group.appendChild(rangeContainer);
  return group;
}
function showCaptionStyleMenu(controlBar, button) {
  const player = controlBar.player;
  const existingMenu = player.container.querySelector(`.${player.options.classPrefix}-caption-style-menu`);
  if (existingMenu) {
    existingMenu.remove();
    button.setAttribute("aria-expanded", "false");
    if (controlBar.openMenu === existingMenu) {
      controlBar.openMenu = null;
      controlBar.openMenuButton = null;
    }
    return;
  }
  const menuLabelId = `${player.options.classPrefix}-caption-style-label-${player.instanceId || ""}`;
  const menu = DOMUtils.createElement("div", {
    className: `${player.options.classPrefix}-caption-style-menu ${player.options.classPrefix}-menu ${player.options.classPrefix}-settings-menu`,
    attributes: {
      "role": "dialog",
      "aria-modal": "true",
      "aria-labelledby": menuLabelId
    }
  });
  const visuallyHiddenLabel = DOMUtils.createElement("h2", {
    textContent: i18n.t("player.captionStyling"),
    attributes: { id: menuLabelId, class: `${player.options.classPrefix}-sr-only` }
  });
  menu.appendChild(visuallyHiddenLabel);
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });
  if (!player.captionManager || player.captionManager.tracks.length === 0) {
    const noTracksItem = DOMUtils.createElement("div", {
      className: `${player.options.classPrefix}-menu-item`,
      textContent: i18n.t("player.noCaptions"),
      attributes: {
        "role": "status"
      },
      style: { opacity: "0.5", cursor: "default", padding: "12px 16px" }
    });
    menu.appendChild(noTracksItem);
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    controlBar.insertMenuIntoDOM(menu, button);
    controlBar.positionMenu(menu, button, true);
    requestAnimationFrame(() => {
      menu.style.visibility = "visible";
    });
    controlBar.attachMenuCloseHandler(menu, button, true);
    return;
  }
  menu.appendChild(createStyleControl(
    player,
    i18n.t("styleLabels.fontSize"),
    "captionsFontSize",
    [
      { label: i18n.t("fontSizes.small"), value: "87.5%" },
      { label: i18n.t("fontSizes.normal"), value: "100%" },
      { label: i18n.t("fontSizes.large"), value: "125%" },
      { label: i18n.t("fontSizes.xlarge"), value: "150%" }
    ]
  ));
  menu.appendChild(createStyleControl(
    player,
    i18n.t("styleLabels.font"),
    "captionsFontFamily",
    [
      { label: i18n.t("fontFamilies.sansSerif"), value: "sans-serif" },
      { label: i18n.t("fontFamilies.serif"), value: "serif" },
      { label: i18n.t("fontFamilies.monospace"), value: "monospace" }
    ]
  ));
  menu.appendChild(createColorControl(player, i18n.t("styleLabels.textColor"), "captionsColor"));
  menu.appendChild(createColorControl(player, i18n.t("styleLabels.background"), "captionsBackgroundColor"));
  menu.appendChild(createOpacityControl(player, i18n.t("styleLabels.opacity"), "captionsOpacity"));
  menu.style.visibility = "hidden";
  menu.style.display = "block";
  controlBar.insertMenuIntoDOM(menu, button);
  controlBar.positionMenu(menu, button, true);
  requestAnimationFrame(() => {
    menu.style.visibility = "visible";
  });
  controlBar.attachMenuCloseHandler(menu, button, true);
  menu.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      trapFocusInContainer(e, menu);
    }
  });
  focusFirstElement(menu, `.${player.options.classPrefix}-style-select`);
}
export {
  showCaptionStyleMenu
};
//# sourceMappingURL=vidply.CaptionStyleMenu-WK2ZOYCO.js.map
