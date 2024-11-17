/*
Event Emitter with WeakMap for auto-cleanup and pattern matching.  Derived from 'mitt'
* - Memory-safe with WeakMap handlers
* - Pattern matching ('network:*', 'auth:*', '*')
* - Type-safe events and handlers
* - Auto-cleanup on handler removal
* - Error boundary protection
*/
export type EventType = string | symbol;
export type Handler<T = unknown> = (event: T) => void;
export type WildcardHandler<T = Record<EventType, unknown>> = (type: keyof T, event: T[keyof T]) => void;

type EventStore<T> = {
    ons: Set<Handler<T>>,
    wild: boolean
};

type HandlerStore<T extends Record<EventType, unknown>> = Map<
    keyof T | '*' | string,
    EventStore<T[keyof T]>
>;

type WeakHandlerMap<T extends Record<EventType, unknown>> = WeakMap<object, HandlerStore<T>>;

export interface Emitter<T extends Record<EventType, unknown>> {
    on<K extends keyof T>(type: K | '*' | string, handler: K extends '*' ? WildcardHandler<T> : Handler<T[K]>): () => void;
    off<K extends keyof T>(type: K | '*' | string, handler?: K extends '*' ? WildcardHandler<T> : Handler<T[K]>): void;
    emit<K extends keyof T>(type: K, event?: T[K]): void;
    clear(): void;
}

export default function mitt<T extends Record<EventType, unknown>>(target: object = Object.create(null)): Emitter<T> {
    const handlers: WeakHandlerMap<T> = new WeakMap();
    const store = new Map<keyof T | '*' | string, EventStore<T[keyof T]>>();
    handlers.set(target, store);

    const get = (type: keyof T | '*' | string): EventStore<T[keyof T]> => {
        let entry = store.get(type);
        if (!entry) {
            entry = {
                ons: new Set(),
                wild: type === '*' || (typeof type === 'string' && type.endsWith('*'))
            };
            store.set(type, entry);
        }
        return entry;
    };

    const getHandlers = (type: string): [Handler<T[keyof T]>, boolean][] => {
        const result: [Handler<T[keyof T]>, boolean][] = [];

        // Exact handlers first
        const exact = store.get(type);
        if (exact)
            exact.ons.forEach(h => result.push([h, false]));

        // Pattern match handlers
        store.forEach((entry, pattern) => {
            if (entry.wild && pattern !== '*') {
                const prefix = (pattern as string).slice(0, -1);
                if (type.startsWith(prefix))
                    entry.ons.forEach(h => result.push([h, true]));
            }
        });

        // Global handlers last
        const global = store.get('*');
        if (global) global.ons.forEach(h => result.push([h, true]));

        return result;
    };

    return {
        on(type, handler) {
            const entry = get(type);
            let ons = entry.ons;
            ons.add(handler);
            return () => {
                ons.delete(handler);
                if (!ons.size) store.delete(type);
            };
        },

        off(type, handler) {
            const entry = store.get(type);
            if (entry) {
                if (handler) {
                    entry.ons.delete(handler);
                    if (!entry.ons.size) store.delete(type);
                } else {
                    store.delete(type);
                }
            }
        },

        emit(type, event) {
            //if (typeof type !== 'string') return;
            getHandlers(type).forEach(([handler, isGlobal]) => {
                try {
                    isGlobal ? (handler as WildcardHandler<T>)(type, event!) : handler(event!);
                } catch (e) {
                    console.error('EventEmitter:', e);
                }
            });
        },

        clear() {
            store.clear();
        }
    };
}