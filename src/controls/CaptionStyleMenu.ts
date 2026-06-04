/**
 * Caption-style menu (font size/family, text & background color, opacity).
 *
 * Extracted from ControlBar and loaded on demand via dynamic import() so the
 * builder code for this relatively rarely-opened panel is not part of the
 * always-loaded core bundle. ControlBar.showCaptionStyleMenu() awaits this
 * module the first time the panel is opened.
 */

import { DOMUtils } from '../utils/DOMUtils.js';
import { i18n } from '../i18n/i18n.js';
import { focusFirstElement } from '../utils/FocusUtils.js';
import type { ControlBar } from './ControlBar.js';
import type { Player } from '../core/Player.js';

function captionStylePropertyName(property: string): string {
    const stripped = property.replace('captions', '');
    return stripped.charAt(0).toLowerCase() + stripped.slice(1);
}

function createStyleControl(
    player: Player,
    label: string,
    property: string,
    options: Array<{ label: string; value: string }>
): HTMLElement {
    const group = DOMUtils.createElement('div', {
        className: `${player.options.classPrefix}-style-group`
    });

    const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
        textContent: label,
        attributes: {
            'for': controlId
        },
        style: {
            display: 'block',
            fontSize: '12px',
            marginBottom: '4px',
            color: 'rgba(255,255,255,0.7)'
        }
    });
    group.appendChild(labelEl);

    const select = DOMUtils.createElement('select', {
        className: `${player.options.classPrefix}-style-select`,
        attributes: {
            'id': controlId
        },
        style: {
            width: '100%',
            padding: '6px',
            background: 'var(--vidply-white)',
            border: '1px solid var(--vidply-white-10)',
            borderRadius: '4px',
            color: 'var(--vidply-black)',
            fontSize: '13px'
        }
    });

    const currentValue = player.options[property];
    options.forEach((opt) => {
        const option = DOMUtils.createElement('option', {
            textContent: opt.label,
            attributes: { value: opt.value }
        });
        if (opt.value === currentValue) {
            (option as HTMLOptionElement).selected = true;
        }
        select.appendChild(option);
    });

    select.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    select.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    select.addEventListener('change', (e) => {
        e.stopPropagation();
        player.options[property] = (e.target as HTMLSelectElement).value;
        if (player.captionManager) {
            player.captionManager.setCaptionStyle(
                captionStylePropertyName(property),
                (e.target as HTMLSelectElement).value
            );
        }
    });

    group.appendChild(select);
    return group;
}

function createColorControl(player: Player, label: string, property: string): HTMLElement {
    const group = DOMUtils.createElement('div', {
        className: `${player.options.classPrefix}-style-group`
    });

    const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;

    const labelEl = DOMUtils.createElement('label', {
        textContent: label,
        attributes: {
            'for': controlId
        },
        style: {
            display: 'block',
            fontSize: '12px',
            marginBottom: '4px',
            color: 'rgba(255,255,255,0.7)'
        }
    });
    group.appendChild(labelEl);

    const input = DOMUtils.createElement('input', {
        attributes: {
            'id': controlId,
            type: 'color',
            value: String(player.options[property] ?? '')
        },
        style: {
            width: '100%',
            height: '32px',
            padding: '2px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '4px',
            cursor: 'pointer'
        }
    });

    input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('change', (e) => {
        e.stopPropagation();
        player.options[property] = (e.target as HTMLInputElement).value;
        if (player.captionManager) {
            player.captionManager.setCaptionStyle(
                captionStylePropertyName(property),
                (e.target as HTMLInputElement).value
            );
        }
    });

    group.appendChild(input);
    return group;
}

function createOpacityControl(player: Player, label: string, property: string): HTMLElement {
    const group = DOMUtils.createElement('div', {
        className: `${player.options.classPrefix}-style-group`
    });

    const controlId = `${player.options.classPrefix}-${property}-${Date.now()}`;

    const labelContainer = DOMUtils.createElement('div', {
        style: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px'
        }
    });

    const labelEl = DOMUtils.createElement('label', {
        textContent: label,
        attributes: {
            'for': controlId
        },
        style: {
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)'
        }
    });

    const valueEl = DOMUtils.createElement('span', {
        textContent: Math.round(Number(player.options[property] ?? 0) * 100) + '%',
        style: {
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)'
        }
    });

    labelContainer.appendChild(labelEl);
    labelContainer.appendChild(valueEl);
    group.appendChild(labelContainer);

    const input = DOMUtils.createElement('input', {
        attributes: {
            'id': controlId,
            type: 'range',
            min: '0',
            max: '1',
            step: '0.1',
            value: String(player.options[property])
        },
        style: {
            width: '100%',
            cursor: 'pointer'
        }
    });

    input.addEventListener('mousedown', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    input.addEventListener('input', (e) => {
        e.stopPropagation();
        const value = parseFloat((e.target as HTMLInputElement).value);
        valueEl.textContent = Math.round(value * 100) + '%';
        player.options[property] = value;
        if (player.captionManager) {
            player.captionManager.setCaptionStyle(
                captionStylePropertyName(property),
                value
            );
        }
    });

    group.appendChild(input);
    return group;
}

/**
 * Build and show the caption-style dialog for the given ControlBar. Mirrors
 * the toggle/positioning behavior of the other ControlBar menus by delegating
 * back to the ControlBar's shared DOM-insertion / positioning / close helpers.
 */
export function showCaptionStyleMenu(controlBar: ControlBar, button: HTMLElement): void {
    const player = controlBar.player;

    // Remove existing menu if any (toggle behavior)
    const existingMenu = document.querySelector(`.${player.options.classPrefix}-caption-style-menu`);
    if (existingMenu) {
        existingMenu.remove();
        button.setAttribute('aria-expanded', 'false');
        if (controlBar.openMenu === existingMenu) {
            controlBar.openMenu = null;
            controlBar.openMenuButton = null;
        }
        return;
    }

    // The caption-style panel contains form controls (selects, color
    // inputs, sliders), not single-action menuitems. Modeling it as a
    // dialog yields correct semantics for AT and matches the
    // SettingsDialog pattern.
    const menuLabelId = `${player.options.classPrefix}-caption-style-label-${player.instanceId || ''}`;
    const menu = DOMUtils.createElement('div', {
        className: `${player.options.classPrefix}-caption-style-menu ${player.options.classPrefix}-menu ${player.options.classPrefix}-settings-menu`,
        attributes: {
            'role': 'dialog',
            'aria-modal': 'false',
            'aria-labelledby': menuLabelId
        }
    });
    const visuallyHiddenLabel = DOMUtils.createElement('h2', {
        textContent: i18n.t('player.captionStyling'),
        attributes: { id: menuLabelId, class: `${player.options.classPrefix}-sr-only` },
        style: {
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap',
            border: '0'
        }
    });
    menu.appendChild(visuallyHiddenLabel);

    // Prevent menu from closing when clicking inside
    menu.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Check if there are any caption tracks
    if (!player.captionManager || player.captionManager.tracks.length === 0) {
        // Show "No captions available" message
        const noTracksItem = DOMUtils.createElement('div', {
            className: `${player.options.classPrefix}-menu-item`,
            textContent: i18n.t('player.noCaptions'),
            attributes: {
                'role': 'status'
            },
            style: { opacity: '0.5', cursor: 'default', padding: '12px 16px' }
        });
        menu.appendChild(noTracksItem);

        menu.style.visibility = 'hidden';
        menu.style.display = 'block';

        controlBar.insertMenuIntoDOM(menu, button);
        controlBar.positionMenu(menu, button, true);

        requestAnimationFrame(() => {
            menu.style.visibility = 'visible';
        });

        controlBar.attachMenuCloseHandler(menu, button, true);
        return;
    }

    // Font Size
    menu.appendChild(createStyleControl(
        player,
        i18n.t('styleLabels.fontSize'),
        'captionsFontSize',
        [
            { label: i18n.t('fontSizes.small'), value: '87.5%' },
            { label: i18n.t('fontSizes.normal'), value: '100%' },
            { label: i18n.t('fontSizes.large'), value: '125%' },
            { label: i18n.t('fontSizes.xlarge'), value: '150%' }
        ]
    ));

    // Font Family
    menu.appendChild(createStyleControl(
        player,
        i18n.t('styleLabels.font'),
        'captionsFontFamily',
        [
            { label: i18n.t('fontFamilies.sansSerif'), value: 'sans-serif' },
            { label: i18n.t('fontFamilies.serif'), value: 'serif' },
            { label: i18n.t('fontFamilies.monospace'), value: 'monospace' }
        ]
    ));

    // Text Color
    menu.appendChild(createColorControl(player, i18n.t('styleLabels.textColor'), 'captionsColor'));

    // Background Color
    menu.appendChild(createColorControl(player, i18n.t('styleLabels.background'), 'captionsBackgroundColor'));

    // Opacity
    menu.appendChild(createOpacityControl(player, i18n.t('styleLabels.opacity'), 'captionsOpacity'));

    // Set min-width for caption style menu
    menu.style.minWidth = '220px';

    menu.style.visibility = 'hidden';
    menu.style.display = 'block';

    controlBar.insertMenuIntoDOM(menu, button);
    controlBar.positionMenu(menu, button, true);

    requestAnimationFrame(() => {
        menu.style.visibility = 'visible';
    });

    controlBar.attachMenuCloseHandler(menu, button, true);

    // Auto-focus the first style select element
    focusFirstElement(menu, `.${player.options.classPrefix}-style-select`);
}
