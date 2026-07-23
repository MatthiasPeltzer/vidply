type DefaultEventMap = Record<string, unknown>;
type Listener<T> = T extends void ? () => void : (data: T) => void;
/**
 * Generic typed event emitter. The `TEvents` parameter is constrained
 * via the self-referential `Record<keyof TEvents, unknown>` so concrete
 * event maps (like `PlayerEventMap`) can be used directly without
 * adding a noisy `[key: string]: unknown` index signature, which would
 * defeat the typo-protection that strongly typed event maps provide.
 */
export declare class EventEmitter<TEvents extends Record<keyof TEvents, unknown> = DefaultEventMap> {
    private events;
    on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this;
    once<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): this;
    off<K extends keyof TEvents>(event: K, listener?: Listener<TEvents[K]>): this;
    emit<K extends keyof TEvents>(event: K, ...args: unknown[]): this;
    removeAllListeners(): this;
}
export {};
//# sourceMappingURL=EventEmitter.d.ts.map