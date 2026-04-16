import { DOMUtils } from './DOMUtils.js';

export interface ResizeHandle {
  direction: string;
  element: HTMLElement;
}

export function createResizeHandles(
  element: HTMLElement,
  classPrefix: string,
  handlePrefix: string
): ResizeHandle[] {
  const handles = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
  const createdHandles: ResizeHandle[] = [];

  handles.forEach(direction => {
    const handle = DOMUtils.createElement('div', {
      className: `${classPrefix}-resize-handle ${classPrefix}-resize-handle-${direction} ${classPrefix}-${handlePrefix}-${direction}`
    });
    element.appendChild(handle);
    createdHandles.push({ direction, element: handle });
  });

  return createdHandles;
}

export function removeResizeHandles(element: HTMLElement, classPrefix: string): void {
  const handles = element.querySelectorAll(`.${classPrefix}-resize-handle`);
  handles.forEach(handle => {
    handle.parentNode?.removeChild(handle);
  });
}

export function toggleResizableState(
  element: HTMLElement,
  classPrefix: string,
  isResizable: boolean
): void {
  if (isResizable) {
    DOMUtils.addClass(element, `${classPrefix}-resizable`);
  } else {
    DOMUtils.removeClass(element, `${classPrefix}-resizable`);
  }
}

export function getCursorForDirection(direction: string): string {
  const cursorMap: Record<string, string> = {
    n: 'ns-resize',
    s: 'ns-resize',
    e: 'ew-resize',
    w: 'ew-resize',
    ne: 'nesw-resize',
    sw: 'nesw-resize',
    nw: 'nwse-resize',
    se: 'nwse-resize'
  };
  return cursorMap[direction] || 'default';
}
