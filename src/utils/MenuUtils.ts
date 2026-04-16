import { DOMUtils } from './DOMUtils.js';
import { createIconElement } from '../icons/Icons.js';
import { i18n } from '../i18n/i18n.js';
import { focusElement } from './FocusUtils.js';

export interface MenuItemOptions {
  classPrefix: string;
  itemClass: string;
  icon?: string;
  label: string;
  ariaLabel?: string;
  onClick?: (e: Event) => void;
  hasTextClass?: boolean;
}

export function createMenuItem({
  classPrefix,
  itemClass,
  icon,
  label,
  ariaLabel,
  onClick,
  hasTextClass = false
}: MenuItemOptions): HTMLElement {
  const isI18nKeyForAria =
    typeof label === 'string' &&
    (label.startsWith('transcript.') || label.startsWith('player.') || label.startsWith('settings.'));
  const ariaLabelText = ariaLabel || (isI18nKeyForAria ? i18n.t(label) || label : label);

  const button = DOMUtils.createElement('button', {
    className: itemClass,
    attributes: {
      type: 'button',
      'aria-label': ariaLabelText,
      tabindex: '-1'
    }
  });

  if (icon) {
    button.appendChild(createIconElement(icon));
  }

  const isI18nKey =
    typeof label === 'string' &&
    (label.startsWith('transcript.') || label.startsWith('player.') || label.startsWith('settings.'));
  const textContent = isI18nKey ? i18n.t(label) || label : label;

  const text = DOMUtils.createElement('span', {
    textContent,
    className: hasTextClass ? `${classPrefix}-settings-text` : undefined,
    attributes: { 'aria-hidden': 'true' }
  });
  button.appendChild(text);

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
}

export function attachMenuKeyboardNavigation(
  menu: HTMLElement | null,
  button: HTMLElement | null,
  itemSelector: string,
  onClose?: () => void
): ((e: KeyboardEvent) => void) | undefined {
  if (!menu) return undefined;

  const menuItems = Array.from(menu.querySelectorAll<HTMLElement>(itemSelector));
  if (menuItems.length === 0) return undefined;

  const handleKeyDown = (e: KeyboardEvent) => {
    const currentIndex = menuItems.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        e.stopPropagation();
        const nextIndex = (currentIndex + 1) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute('tabindex', idx === nextIndex ? '0' : '-1');
        });
        menuItems[nextIndex].focus({ preventScroll: false });
        menuItems[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        e.stopPropagation();
        const prevIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
        menuItems.forEach((item, idx) => {
          item.setAttribute('tabindex', idx === prevIndex ? '0' : '-1');
        });
        menuItems[prevIndex].focus({ preventScroll: false });
        menuItems[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      }

      case 'Home': {
        e.preventDefault();
        e.stopPropagation();
        menuItems.forEach((item, idx) => {
          item.setAttribute('tabindex', idx === 0 ? '0' : '-1');
        });
        menuItems[0].focus({ preventScroll: false });
        menuItems[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      }

      case 'End': {
        e.preventDefault();
        e.stopPropagation();
        const lastIndex = menuItems.length - 1;
        menuItems.forEach((item, idx) => {
          item.setAttribute('tabindex', idx === lastIndex ? '0' : '-1');
        });
        menuItems[lastIndex].focus({ preventScroll: false });
        menuItems[lastIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        e.stopPropagation();
        if (document.activeElement && menuItems.includes(document.activeElement as HTMLElement)) {
          (document.activeElement as HTMLElement).click();
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

      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        if (onClose) {
          onClose();
        }
        break;
    }
  };

  menu.addEventListener('keydown', handleKeyDown as EventListener, true);
  return handleKeyDown;
}

export function focusFirstMenuItem(
  menu: HTMLElement | null,
  itemSelector: string,
  delay = 0
): void {
  if (!menu) return;

  setTimeout(() => {
    const menuItems = Array.from(menu.querySelectorAll<HTMLElement>(itemSelector));
    if (menuItems.length > 0) {
      menuItems.forEach((item, index) => {
        item.setAttribute('tabindex', index === 0 ? '0' : '-1');
      });
      focusElement(menuItems[0], { delay: 0 });
      menuItems[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, delay);
}
