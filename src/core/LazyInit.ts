/**
 * Lazy instantiation helpers for {@link Player}.
 *
 * Extracted from `index.ts` so that:
 *
 * 1. The `Player.observeLazy` public API is a real static method on the
 *    Player class rather than a side-effectful assignment done from
 *    `index.ts` at module load time.
 * 2. Consumers that want the lazy-init API without the auto-init
 *    entry point can import this module explicitly.
 * 3. Both the auto-init flow (`initializePlayers`) and the manual flow
 *    (`Player.observeLazy`) share the same `IntersectionObserver`
 *    bookkeeping, so cancellation and rect-based eager fallbacks stay
 *    consistent.
 */

export type LazyHandle = { cancel: () => void } | null;

export interface LazyInitEntry<TOptions> {
  observer: IntersectionObserver;
  options: TOptions;
}

/** Factory the observer invokes once an element is ready to promote. */
export type LazyPlayerFactory<TOptions> = (
  element: HTMLElement,
  options: TOptions
) => void;

const pendingByElement = new WeakMap<HTMLElement, LazyInitEntry<unknown>>();

/**
 * Begin observing `element` and construct a player when it scrolls into
 * view (or immediately if its rect is too small to be a meaningful
 * intersection target). Safe to call multiple times — a duplicate call
 * cancels the previous observer first.
 */
export function observeForLazyInit<TOptions>(
  element: HTMLElement,
  options: TOptions,
  margin: string,
  factory: LazyPlayerFactory<TOptions>
): void {
  const existing = pendingByElement.get(element);
  if (existing) {
    existing.observer.unobserve(element);
    pendingByElement.delete(element);
  }

  const rect = element.getBoundingClientRect();
  if (rect.height < 20) {
    factory(element, options);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          observer.unobserve(entry.target);
          pendingByElement.delete(entry.target as HTMLElement);
          factory(entry.target as HTMLElement, options);
        }
      });
    },
    { rootMargin: margin, threshold: 0 }
  );

  observer.observe(element);
  pendingByElement.set(element, { observer, options } as LazyInitEntry<unknown>);
}

/** Cancel a scheduled lazy init for `element`, if any. */
export function cancelLazyInit(element: HTMLElement): void {
  const pending = pendingByElement.get(element);
  if (pending) {
    pending.observer.unobserve(element);
    pendingByElement.delete(element);
  }
}
