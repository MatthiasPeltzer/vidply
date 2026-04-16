type EventMap = Record<string, any>;
type Listener<T> = T extends void ? () => void : (data: T) => void;

export class EventEmitter<TEvents extends EventMap = EventMap> {
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
    if (!this.events[event]) return this;

    if (!listener) {
      delete this.events[event];
    } else {
      this.events[event] = this.events[event]!.filter(
        l => l !== (listener as unknown)
      );
    }

    return this;
  }

  emit<K extends keyof TEvents>(event: K, ...args: unknown[]): this {
    if (!this.events[event]) return this;

    this.events[event]!.forEach(listener => {
      listener(...args);
    });

    return this;
  }

  removeAllListeners(): this {
    this.events = {};
    return this;
  }
}
