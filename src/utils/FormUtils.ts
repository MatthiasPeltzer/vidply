import { DOMUtils } from './DOMUtils.js';
import { i18n } from '../i18n/i18n.js';

export interface SelectOption {
  value: string;
  text: string;
  selected?: boolean;
}

export interface LabeledSelectOptions {
  classPrefix: string;
  labelClass: string;
  selectClass: string;
  labelText: string;
  selectId: string;
  hidden?: boolean;
  onChange?: (e: Event) => void;
  options?: SelectOption[];
}

export function createLabeledSelect({
  classPrefix,
  labelClass,
  selectClass,
  labelText,
  selectId,
  hidden = false,
  onChange = undefined,
  options = []
}: LabeledSelectOptions): { label: HTMLElement; select: HTMLElement } {
  const isI18nKey =
    typeof labelText === 'string' &&
    (labelText.startsWith('transcript.') ||
      labelText.startsWith('player.') ||
      labelText.startsWith('settings.') ||
      labelText.startsWith('captions.'));
  const labelTextContent = isI18nKey ? i18n.t(labelText) || labelText : labelText;

  const label = DOMUtils.createElement('label', {
    className: labelClass,
    textContent: labelTextContent,
    attributes: {
      for: selectId,
      style: hidden ? 'display: none;' : undefined
    }
  });

  const select = DOMUtils.createElement('select', {
    className: selectClass,
    attributes: {
      id: selectId,
      style: hidden ? 'display: none;' : undefined
    }
  });

  options.forEach(opt => {
    const option = DOMUtils.createElement('option', {
      textContent: opt.text,
      attributes: {
        value: opt.value,
        selected: opt.selected ? 'selected' : undefined
      }
    });
    select.appendChild(option);
  });

  if (onChange) {
    select.addEventListener('change', onChange);
  }

  return { label, select };
}

export function toggleLabeledSelect(
  label: HTMLElement | null,
  select: HTMLElement | null,
  show: boolean
): void {
  if (label) {
    label.style.display = show ? 'block' : 'none';
  }
  if (select) {
    select.style.display = show ? 'block' : 'none';
  }
}

export function preventDragOnElement(element: HTMLElement | null): void {
  if (!element) return;

  (['pointerdown', 'mousedown', 'click'] as const).forEach(eventType => {
    element.addEventListener(eventType, (e: Event) => {
      e.stopPropagation();
    });
  });
}
