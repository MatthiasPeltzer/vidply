export function focusElement(
  element: HTMLElement | null,
  { delay = 0, preventScroll = true }: { delay?: number; preventScroll?: boolean } = {}
): void {
  if (!element) return;

  requestAnimationFrame(() => {
    setTimeout(() => {
      if (element && document.contains(element)) {
        element.focus({ preventScroll });
      }
    }, delay);
  });
}

export function focusFirstElement(
  container: HTMLElement | null,
  selector: string,
  options: { delay?: number; preventScroll?: boolean } = {}
): void {
  if (!container) return;
  const element = container.querySelector<HTMLElement>(selector);
  if (element) {
    focusElement(element, options);
  }
}
