type DefaultEventMap = Record<string, unknown>;
type Listener<T> = T extends void ? () => void : (data: T) => void;

/**
 * Generic typed event emitter. The `TEvents` parameter is constrained
 * via the self-referential `Record<keyof TEvents, unknown>` so concrete
 * event maps (like `PlayerEventMap`) can be used directly without
 * adding a noisy `[key: string]: unknown` index signature, which would
 * defeat the typo-protection that strongly typed event maps provide.
 */
export class EventEmitter<TEvents extends Record<keyof TEvents, unknown> = DefaultEventMap> {
  private events: Partial<Record<keyof TEvents, Array<(...args: unknown[]) => void>>> = {};

  on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this {
    const listeners = this.events[event] ?? [];
    listeners.push(listener as (...args: unknown[]) => void);
    this.events[event] = listeners;
    return this;
  }

  once<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this {
    const onceListener = ((...args: unknown[]) => {
      (listener as (...a: unknown[]) => void)(...args);
      this.off(event, onceListener as Listener<TEvents[K]>);
    }) as unknown as Listener<TEvents[K]>;
    return this.on(event, onceListener);
  }

  off<K extends keyof TEvents>(event: K, listener?: Listener<TEvents[K]>): this {
    const listeners = this.events[event];
    if (!listeners) return this;

    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = listeners.filter(
        l => l !== (listener as unknown)
      );
    }

    return this;
  }

  emit<K extends keyof TEvents>(event: K, ...args: unknown[]): this {
    const listeners = this.events[event];
    if (!listeners) return this;

    listeners.forEach(listener => {
      listener(...args);
    });

    return this;
  }

  removeAllListeners(): this {
    this.events = {};
    return this;
  }
}
