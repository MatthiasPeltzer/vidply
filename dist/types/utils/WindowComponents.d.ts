/**
 * Window Components Factory
 * Creates standardized UI components for floating windows (headers, selectors, controls)
 * Note: This only creates DOM elements. For drag/resize behavior, use DraggableResizable class.
 */
interface WindowHeaderOptions {
    classPrefix: string;
    headerClass: string;
    titleText: string;
    showSettings?: boolean;
    onSettingsClick?: ((e: Event) => void) | null;
    onClose?: ((e: Event) => void) | null;
    leftContent?: HTMLElement[];
}
interface HeaderSelectorOption {
    value: string;
    text: string;
    selected?: boolean;
}
interface HeaderSelectorOptions {
    classPrefix: string;
    selectClass: string;
    labelText: string;
    selectId: string;
    options?: HeaderSelectorOption[];
    onChange?: ((e: Event) => void) | null;
}
interface AutoscrollCheckboxOptions {
    classPrefix: string;
    labelClass: string;
    textClass: string;
    checkboxId: string;
    labelText: string;
    checked?: boolean;
    onChange?: ((e: Event) => void) | null;
}
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
export declare function createWindowHeader({ classPrefix, headerClass, titleText, showSettings, onSettingsClick, onClose, leftContent }: WindowHeaderOptions): {
    header: HTMLElement;
    settingsButton: HTMLElement | null;
    closeButton: HTMLElement;
    leftSide: HTMLElement;
};
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
export declare function createHeaderSelector({ classPrefix: _classPrefix, selectClass, labelText, selectId, options, onChange }: HeaderSelectorOptions): {
    label: HTMLElement;
    select: HTMLElement;
};
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
export declare function createAutoscrollCheckbox({ classPrefix: _classPrefix, labelClass, textClass, checkboxId, labelText, checked, onChange }: AutoscrollCheckboxOptions): HTMLElement;
export {};
//# sourceMappingURL=WindowComponents.d.ts.map