/**
 * Form element creation utilities
 */

import { DOMUtils } from './DOMUtils.js';
import { i18n } from '../i18n/i18n.js';

/**
 * Create a labeled select element with proper accessibility
 * @param {Object} options - Options for creating the labeled select
 * @param {string} options.classPrefix - Class prefix for styling
 * @param {string} options.labelClass - CSS class for the label
 * @param {string} options.selectClass - CSS class for the select
 * @param {string} options.labelText - Label text (i18n key or plain text)
 * @param {string} options.selectId - ID for the select element
 * @param {boolean} options.hidden - Whether to hide the label and select initially
 * @param {Function} options.onChange - Change event handler
 * @param {Array} options.options - Array of option objects {value, text, selected}
 * @returns {Object} Object with label and select elements
 */
export function createLabeledSelect({
  classPrefix,
  labelClass,
  selectClass,
  labelText,
  selectId,
  hidden = false,
  onChange = null,
  options = []
}) {
  // Check if labelText is an i18n key
  const isI18nKey = typeof labelText === 'string' && 
    (labelText.startsWith('transcript.') || 
     labelText.startsWith('player.') || 
     labelText.startsWith('settings.') ||
     labelText.startsWith('captions.'));
  const labelTextContent = isI18nKey ? (i18n.t(labelText) || labelText) : labelText;

  const label = DOMUtils.createElement('label', {
    className: labelClass,
    textContent: labelTextContent,
    attributes: {
      'for': selectId,
      'style': hidden ? 'display: none;' : undefined
    }
  });

  const select = DOMUtils.createElement('select', {
    className: selectClass,
    attributes: {
      'id': selectId,
      'style': hidden ? 'display: none;' : undefined
    }
  });

  // Add options
  options.forEach(opt => {
    const option = DOMUtils.createElement('option', {
      textContent: opt.text,
      attributes: {
        'value': opt.value,
        'selected': opt.selected ? 'selected' : undefined
      }
    });
    select.appendChild(option);
  });

  // Add change handler if provided
  if (onChange) {
    select.addEventListener('change', onChange);
  }

  return { label, select };
}

/**
 * Show or hide a labeled select element
 * @param {HTMLElement} label - Label element
 * @param {HTMLElement} select - Select element
 * @param {boolean} show - Whether to show (true) or hide (false)
 */
export function toggleLabeledSelect(label, select, show) {
  if (label) {
    label.style.display = show ? 'block' : 'none';
  }
  if (select) {
    select.style.display = show ? 'block' : 'none';
  }
}

/**
 * Prevent drag on element and its children
 * @param {HTMLElement} element - Element to prevent drag on
 */
export function preventDragOnElement(element) {
  if (!element) return;

  ['pointerdown', 'mousedown', 'click'].forEach(eventType => {
    element.addEventListener(eventType, (e) => {
      e.stopPropagation();
    });
  });
}

