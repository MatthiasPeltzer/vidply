/**
 * Window Components Factory
 * Creates standardized UI components for floating windows (headers, selectors, controls)
 * Note: This only creates DOM elements. For drag/resize behavior, use DraggableResizable class.
 */

import { DOMUtils } from './DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';

/**
 * Create a window header element (used as drag handle)
 * @param {Object} options - Header options
 * @param {string} options.classPrefix - Class prefix
 * @param {string} options.headerClass - Specific header class name
 * @param {string} options.titleText - Title text (will be visually hidden)
 * @param {boolean} options.showSettings - Whether to show settings button
 * @param {Function} options.onSettingsClick - Settings button click handler
 * @param {Function} options.onClose - Close button click handler
 * @param {Array} options.leftContent - Array of additional elements for left side
 * @returns {Object} Object containing header element and button references
 */
export function createWindowHeader({
    classPrefix,
    headerClass,
    titleText,
    showSettings = false,
    onSettingsClick = null,
    onClose = null,
    leftContent = []
}) {
    // Create header container
    const header = DOMUtils.createElement('div', {
        className: `${classPrefix}-draggable-header ${headerClass}`,
        attributes: {
            'role': 'heading',
            'aria-level': '2',
            'tabindex': '0'
        }
    });

    // Create left side container
    const leftSide = DOMUtils.createElement('div', {
        className: `${headerClass}-left`
    });

    // Add settings button if requested
    let settingsButton = null;
    if (showSettings && onSettingsClick) {
        settingsButton = DOMUtils.createElement('button', {
            className: `${classPrefix}-icon-button ${headerClass}-settings`,
            attributes: {
                'type': 'button',
                'aria-label': i18n.t('settings.title'),
                'title': i18n.t('settings.title')
            }
        });
        settingsButton.appendChild(createIconElement('settings'));
        settingsButton.addEventListener('click', onSettingsClick);
        leftSide.appendChild(settingsButton);
    }

    // Add custom left content
    leftContent.forEach(element => {
        if (element) {
            leftSide.appendChild(element);
        }
    });

    // Create title (visually hidden but accessible)
    const title = DOMUtils.createElement('h3', {
        textContent: titleText
    });
    leftSide.appendChild(title);

    // Create close button
    const closeButton = DOMUtils.createElement('button', {
        className: `${classPrefix}-icon-button ${headerClass}-close`,
        attributes: {
            'type': 'button',
            'aria-label': i18n.t('player.close'),
            'title': i18n.t('player.close')
        }
    });
    closeButton.appendChild(createIconElement('close'));
    if (onClose) {
        closeButton.addEventListener('click', onClose);
    }

    // Assemble header
    header.appendChild(leftSide);
    header.appendChild(closeButton);

    return {
        header,
        settingsButton,
        closeButton,
        leftSide
    };
}

/**
 * Create a language/track selector for header
 * @param {Object} options - Selector options
 * @param {string} options.classPrefix - Class prefix
 * @param {string} options.selectClass - CSS class for select element
 * @param {string} options.labelText - Label text (i18n key)
 * @param {string} options.selectId - Select element ID
 * @param {Array} options.options - Array of {value, text, selected} objects
 * @param {Function} options.onChange - Change event handler
 * @returns {Object} Object with label and select elements
 */
export function createHeaderSelector({
    classPrefix,
    selectClass,
    labelText,
    selectId,
    options = [],
    onChange = null
}) {
    const label = DOMUtils.createElement('label', {
        className: `${selectClass}-label`,
        textContent: i18n.t(labelText),
        attributes: {
            'for': selectId
        }
    });

    const select = DOMUtils.createElement('select', {
        className: selectClass,
        attributes: {
            'id': selectId
        }
    });

    // Add options
    options.forEach(opt => {
        const option = DOMUtils.createElement('option', {
            textContent: opt.text,
            attributes: {
                'value': opt.value
            }
        });
        if (opt.selected) {
            option.selected = true;
        }
        select.appendChild(option);
    });

    // Add change handler
    if (onChange) {
        select.addEventListener('change', onChange);
    }

    return { label, select };
}

/**
 * Create an autoscroll checkbox for header
 * @param {Object} options - Checkbox options
 * @param {string} options.classPrefix - Class prefix
 * @param {string} options.labelClass - CSS class for label
 * @param {string} options.textClass - CSS class for text span
 * @param {string} options.checkboxId - Checkbox element ID
 * @param {string} options.labelText - Label text (i18n key)
 * @param {boolean} options.checked - Initial checked state
 * @param {Function} options.onChange - Change event handler
 * @returns {HTMLElement} Label element containing checkbox
 */
export function createAutoscrollCheckbox({
    classPrefix,
    labelClass,
    textClass,
    checkboxId,
    labelText,
    checked = true,
    onChange = null
}) {
    const label = DOMUtils.createElement('label', {
        className: labelClass,
        attributes: {
            'for': checkboxId
        }
    });

    const checkbox = DOMUtils.createElement('input', {
        attributes: {
            'type': 'checkbox',
            'id': checkboxId,
            'checked': checked ? 'checked' : null
        }
    });

    const text = DOMUtils.createElement('span', {
        className: textClass,
        textContent: i18n.t(labelText)
    });

    if (onChange) {
        checkbox.addEventListener('change', onChange);
    }

    label.appendChild(checkbox);
    label.appendChild(text);

    return label;
}

