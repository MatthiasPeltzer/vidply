/**
 * Menu Factory - Centralized menu creation and management
 * Reduces code duplication across ControlBar menu methods
 */

import { DOMUtils } from './DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { attachMenuKeyboardNavigation, focusFirstMenuItem } from './MenuUtils.js';

interface DividerMenuItem {
    type: 'divider';
}

interface HeaderMenuItem {
    type: 'header';
    text: string;
}

interface ActionMenuItem {
    type?: 'action';
    text?: string;
    value?: unknown;
    active?: boolean;
    disabled?: boolean;
    icon?: string;
    textClass?: string;
    timeLabel?: string;
    timeAriaLabel?: string;
    onClick?: (value: unknown, index: number) => void;
}

type MenuItem = DividerMenuItem | HeaderMenuItem | ActionMenuItem;

interface CreateMenuOptions {
    player: any;
    button: HTMLElement;
    menuClass: string;
    ariaLabel: string;
    items?: MenuItem[];
    activeIndex?: number;
    onClose?: (() => void) | null;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}

interface SpeedMenuOptions {
    player: any;
    button: HTMLElement;
    currentSpeed: number;
    speeds?: number[];
    onSpeedChange: (value: number) => void;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}

interface CaptionsMenuOptions {
    player: any;
    button: HTMLElement;
    tracks: Array<{ label?: string; language?: string }>;
    currentTrackIndex: number;
    captionsEnabled: boolean;
    onTrackSelect: (index: number) => void;
    onDisable: () => void;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}

interface ChaptersMenuOptions {
    player: any;
    button: HTMLElement;
    chapters: Array<{ startTime: number; text: string }> | null | undefined;
    onChapterSelect: (value: number) => void;
    formatTime: (seconds: number) => string;
    formatDuration: (seconds: number) => string;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}

interface QualityMenuOptions {
    player: any;
    button: HTMLElement;
    qualities: Array<{ name?: string; height?: number; index: number }>;
    currentQuality: number;
    isHLS: boolean;
    onQualitySelect: (index: number) => void;
    insertIntoDOM?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
    positionMenu?: ((menu: HTMLElement, button: HTMLElement, initial?: boolean) => void) | null;
    attachCloseHandler?: ((menu: HTMLElement, button: HTMLElement) => void) | null;
}

/**
 * Create and show a menu with standard positioning and behavior
 * @param {Object} options - Menu configuration
 * @returns {HTMLElement} The created menu element
 */
export function createMenu({
    player,
    button,
    menuClass,
    ariaLabel,
    items = [],
    activeIndex = -1,
    onClose = null,
    insertIntoDOM = null,
    positionMenu = null,
    attachCloseHandler = null
}: CreateMenuOptions): HTMLElement | null {
    const classPrefix = player.options.classPrefix;
    
    // Remove existing menu (toggle behavior)
    const existingMenu = document.querySelector(`.${classPrefix}-${menuClass}`);
    if (existingMenu) {
        existingMenu.remove();
        button.setAttribute('aria-expanded', 'false');
        return null;
    }

    // Create menu container
    const menu = DOMUtils.createElement('div', {
        className: `${classPrefix}-${menuClass} ${classPrefix}-menu`,
        attributes: {
            'role': 'menu',
            'aria-label': ariaLabel
        }
    });

    let activeItem: HTMLElement | null = null;

    // Create menu items
    items.forEach((itemConfig, index) => {
        if (itemConfig.type === 'divider') {
            const divider = DOMUtils.createElement('div', {
                className: `${classPrefix}-menu-divider`,
                attributes: { 'role': 'separator' }
            });
            menu.appendChild(divider);
            return;
        }

        if (itemConfig.type === 'header') {
            const header = DOMUtils.createElement('div', {
                className: `${classPrefix}-menu-header`,
                textContent: itemConfig.text
            });
            menu.appendChild(header);
            return;
        }

        if ('disabled' in itemConfig && itemConfig.disabled) {
            const disabledItem = DOMUtils.createElement('div', {
                className: `${classPrefix}-menu-item`,
                textContent: itemConfig.text,
                attributes: { 'role': 'menuitem' },
                style: { opacity: '0.5', cursor: 'default' }
            });
            menu.appendChild(disabledItem);
            return;
        }

        const item = DOMUtils.createElement('button', {
            className: `${classPrefix}-menu-item`,
            attributes: {
                'type': 'button',
                'role': 'menuitem',
                'tabindex': '-1'
            }
        });

        // Add content based on item type
        const actionItem = itemConfig as ActionMenuItem;

        if (actionItem.icon) {
            item.appendChild(createIconElement(actionItem.icon));
        }

        if (actionItem.timeLabel) {
            const timeSpan = DOMUtils.createElement('span', {
                className: `${classPrefix}-chapter-time`,
                textContent: actionItem.timeLabel,
                attributes: actionItem.timeAriaLabel
                    ? { 'aria-label': actionItem.timeAriaLabel }
                    : {}
            });
            item.appendChild(timeSpan);
            item.appendChild(document.createTextNode(' '));
        }

        if (actionItem.text) {
            const textSpan = DOMUtils.createElement('span', {
                className: actionItem.textClass || `${classPrefix}-menu-item-text`,
                textContent: actionItem.text
            });
            item.appendChild(textSpan);
        }

        // Mark as active
        const isActive = actionItem.active || index === activeIndex;
        if (isActive) {
            item.classList.add(`${classPrefix}-menu-item-active`);
            item.appendChild(createIconElement('check'));
            activeItem = item;
        }

        // Click handler
        if (actionItem.onClick) {
            item.addEventListener('click', () => {
                actionItem.onClick!(actionItem.value, index);
                closeMenuAndReturnFocus(menu, button, onClose);
            });
        }

        menu.appendChild(item);
    });

    // Position menu (hide first to prevent jumping)
    menu.style.visibility = 'hidden';
    menu.style.display = 'block';
    
    // Insert into DOM
    if (insertIntoDOM) {
        insertIntoDOM(menu, button);
    } else {
        button.insertAdjacentElement('afterend', menu);
    }
    
    // Position
    if (positionMenu) {
        positionMenu(menu, button, true);
    }
    
    // Show menu
    requestAnimationFrame(() => {
        menu.style.visibility = 'visible';
    });

    // Add keyboard navigation
    attachMenuKeyboardNavigation(menu, button, `.${classPrefix}-menu-item`, () => {
        closeMenuAndReturnFocus(menu, button, onClose);
    });
    
    // Focus active or first item
    setTimeout(() => {
        const focusTarget = activeItem || menu.querySelector(`.${classPrefix}-menu-item`);
        if (focusTarget) {
            focusTarget.focus({ preventScroll: true });
        }
    }, 0);

    // Attach close handler
    if (attachCloseHandler) {
        attachCloseHandler(menu, button);
    }

    button.setAttribute('aria-expanded', 'true');

    return menu;
}

/**
 * Close menu and return focus to button
 */
function closeMenuAndReturnFocus(menu: HTMLElement | null, button: HTMLElement, onClose: (() => void) | null = null): void {
    if (menu) {
        menu.remove();
    }
    button.setAttribute('aria-expanded', 'false');
    button.focus({ preventScroll: true });
    if (onClose) {
        onClose();
    }
}

/**
 * Create a speed menu
 */
export function createSpeedMenu({
    player,
    button,
    currentSpeed,
    speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
    onSpeedChange,
    insertIntoDOM,
    positionMenu,
    attachCloseHandler
}: SpeedMenuOptions): HTMLElement | null {
    const items = speeds.map(speed => ({
        text: speed === 1 ? i18n.t('player.normalSpeed') : `${speed}x`,
        value: speed,
        active: Math.abs(currentSpeed - speed) < 0.01,
        onClick: (value: unknown) => onSpeedChange(value as number)
    }));

    return createMenu({
        player,
        button,
        menuClass: 'speed-menu',
        ariaLabel: i18n.t('player.speed'),
        items,
        insertIntoDOM,
        positionMenu,
        attachCloseHandler
    });
}

/**
 * Create a captions menu
 */
export function createCaptionsMenu({
    player,
    button,
    tracks,
    currentTrackIndex,
    captionsEnabled,
    onTrackSelect,
    onDisable,
    insertIntoDOM,
    positionMenu,
    attachCloseHandler
}: CaptionsMenuOptions): HTMLElement | null {
    const classPrefix = player.options.classPrefix;
    
    const items: Array<{text: string; value?: number; active: boolean; onClick: () => any}> = [
        {
            text: i18n.t('player.captionsOff'),
            active: !captionsEnabled,
            onClick: () => onDisable()
        }
    ];

    tracks.forEach((track, index) => {
        items.push({
            text: track.label || track.language || '',
            value: index,
            active: captionsEnabled && currentTrackIndex === index,
            onClick: () => onTrackSelect(index)
        });
    });

    return createMenu({
        player,
        button,
        menuClass: 'captions-menu',
        ariaLabel: i18n.t('player.captions'),
        items,
        insertIntoDOM,
        positionMenu,
        attachCloseHandler
    });
}

/**
 * Create a chapters menu
 */
export function createChaptersMenu({
    player,
    button,
    chapters,
    onChapterSelect,
    formatTime,
    formatDuration,
    insertIntoDOM,
    positionMenu,
    attachCloseHandler
}: ChaptersMenuOptions): HTMLElement | null {
    if (!chapters || chapters.length === 0) {
        return createMenu({
            player,
            button,
            menuClass: 'chapters-menu',
            ariaLabel: i18n.t('player.chapters'),
            items: [{
                text: i18n.t('player.noChapters'),
                disabled: true
            }],
            insertIntoDOM,
            positionMenu,
            attachCloseHandler
        });
    }

    const items = chapters.map(chapter => ({
        timeLabel: formatTime(chapter.startTime),
        timeAriaLabel: formatDuration(chapter.startTime),
        text: chapter.text,
        textClass: `${player.options.classPrefix}-chapter-title`,
        value: chapter.startTime,
        onClick: (value: unknown) => onChapterSelect(value as number)
    }));

    return createMenu({
        player,
        button,
        menuClass: 'chapters-menu',
        ariaLabel: i18n.t('player.chapters'),
        items,
        insertIntoDOM,
        positionMenu,
        attachCloseHandler
    });
}

/**
 * Create a quality menu
 */
export function createQualityMenu({
    player,
    button,
    qualities,
    currentQuality,
    isHLS,
    onQualitySelect,
    insertIntoDOM,
    positionMenu,
    attachCloseHandler
}: QualityMenuOptions): HTMLElement | null {
    const items: ActionMenuItem[] = [];

    // Auto option for HLS
    if (isHLS) {
        items.push({
            text: i18n.t('player.auto'),
            value: -1,
            active: currentQuality === -1,
            onClick: () => onQualitySelect(-1)
        });
    }

    // Quality options
    qualities.forEach(quality => {
        items.push({
            text: quality.name || `${quality.height}p`,
            value: quality.index,
            active: quality.index === currentQuality,
            onClick: () => onQualitySelect(quality.index)
        });
    });

    if (items.length === 0) {
        items.push({
            text: i18n.t('player.autoQuality'),
            disabled: true
        });
    }

    return createMenu({
        player,
        button,
        menuClass: 'quality-menu',
        ariaLabel: i18n.t('player.quality'),
        items,
        insertIntoDOM,
        positionMenu,
        attachCloseHandler
    });
}

