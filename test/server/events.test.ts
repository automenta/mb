import {beforeEach, describe, expect, it, vi} from 'vitest';
import {mitt as Emitter} from '../../src/events';

interface TestEvents extends Record<string | symbol, unknown> {
    foo: string;
    bar: number;
    'network:error': Error;
    'network:success': { status: number };
    'auth:login': { user: string };
    'auth:logout': void;
}

describe('mitt', () => {
    let e: ReturnType<typeof Emitter<TestEvents>>;
    let spy: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        e = Emitter<TestEvents>();
        spy = vi.fn();
    });

    describe('basic functionality', () => {
        it('should handle basic event subscription and emission', () => {
            e.on('foo', spy);
            e.emit('foo', 'test');
            expect(spy).toHaveBeenCalledWith('test');
            expect(spy).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple handlers for same event', () => {
            const spy2 = vi.fn();
            e.on('foo', spy);
            e.on('foo', spy2);
            e.emit('foo', 'test');
            expect(spy).toHaveBeenCalledWith('test');
            expect(spy2).toHaveBeenCalledWith('test');
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy2).toHaveBeenCalledTimes(1);
        });

        it('should not call handlers after off()', () => {
            e.on('foo', spy);
            e.off('foo', spy);
            e.emit('foo', 'test');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should remove all handlers on clear()', () => {
            e.on('foo', spy);
            e.on('bar', spy);
            e.on('*', spy);
            e.clear();

            e.emit('foo', 'test');
            e.emit('bar', 42);

            expect(spy).not.toHaveBeenCalled();
        });

        it('should support cleanup function from on()', () => {
            const off = e.on('foo', spy);
            e.emit('foo', 'test1');
            off();
            e.emit('foo', 'test2');
            expect(spy).toHaveBeenCalledTimes(1);
            expect(spy).toHaveBeenCalledWith('test1');
        });
    });

    describe('wildcard handlers', () => {
        it('should handle global wildcard *', () => {
            const wildcardSpy = vi.fn();
            e.on('*', wildcardSpy);
            e.emit('foo', 'test');
            e.emit('bar', 42);
            expect(wildcardSpy).toHaveBeenCalledTimes(2);
            expect(wildcardSpy).toHaveBeenNthCalledWith(1, 'foo', 'test');
            expect(wildcardSpy).toHaveBeenNthCalledWith(2, 'bar', 42);
        });

        it('should handle pattern matching with prefix wildcards', () => {
            const networkSpy = vi.fn();
            const authSpy = vi.fn();
            const globalSpy = vi.fn();

            e.on('network:*', networkSpy);
            e.on('auth:*', authSpy);
            e.on('*', globalSpy);

            const error = new Error('Failed');
            e.emit('network:error', error);
            e.emit('auth:login', { user: 'test' });

            expect(networkSpy).toHaveBeenCalledWith('network:error', error);
            expect(networkSpy).toHaveBeenCalledTimes(1);
            expect(authSpy).toHaveBeenCalledWith('auth:login', { user: 'test' });
            expect(authSpy).toHaveBeenCalledTimes(1);
            expect(globalSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('error handling', () => {
        it('should handle errors in event handlers', () => {
            const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
            const error = new Error('Handler error');

            e.on('foo', () => { throw error; });
            e.emit('foo', 'test');

            expect(consoleError).toHaveBeenCalledWith('EventEmitter:', error);
            consoleError.mockRestore();
        });
        it('should not duplicate handler calls', () => {
            const spy1 = vi.fn();
            const spy2 = vi.fn();

            e.on('network:*', spy1);
            e.on('*', spy2);

            e.emit('network:error', new Error('test'));

            expect(spy1).toHaveBeenCalledTimes(1);
            expect(spy2).toHaveBeenCalledTimes(1);
        });
        it('should continue executing handlers after error', () => {
            e.on('foo', () => { throw 'First handler error'; });
            e.on('foo', spy);

            e.emit('foo', 'test');
            expect(spy).toHaveBeenCalledWith('test');
        });
    });

    describe('memory management', () => {
        it('should clean up empty handler sets', async () => {
            const off1 = e.on('foo', spy);
            const off2 = e.on('foo', () => {});

            off1();
            off2();

            e.emit('foo', 'test');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle clear() properly', () => {
            e.on('foo', spy);
            e.on('bar', spy);
            e.clear();

            e.emit('foo', 'test');
            e.emit('bar', 42);

            expect(spy).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle off() with non-existent handler', () => {
            e.off('foo', spy);
            e.emit('foo', 'test');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle off() with non-existent event type', () => {
            e.off('foo');
            e.emit('foo', 'test');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle emit() with no handlers', () => {
            e.emit('foo', 'test');
            expect(spy).not.toHaveBeenCalled();
        });

        it('should handle rapid on/off/emit cycles', () => {
            for (let i = 0; i < 100; i++) {
                const off = e.on('foo', spy);
                e.emit('foo', 'test');
                off();
            }
            expect(spy).toHaveBeenCalledTimes(100);
        });
    });

    describe('type safety', () => {
        it('should enforce correct event types', () => {
            const fooSpy = vi.fn((s: string) => s.toLowerCase());
            const barSpy = vi.fn((n: number) => n.toFixed());
            const errorSpy = vi.fn((e: Error) => e.message);
            
            e.on('foo', fooSpy);
            e.on('bar', barSpy);
            e.on('network:error', errorSpy);
            
            e.emit('foo', 'TEST');
            e.emit('bar', 42);
            e.emit('network:error', new Error('Test error'));
            
            expect(fooSpy).toHaveBeenCalledWith('TEST');
            expect(fooSpy).toHaveReturnedWith('test');
            expect(barSpy).toHaveBeenCalledWith(42);
            expect(barSpy).toHaveReturnedWith('42');
            expect(errorSpy).toHaveBeenCalledWith(new Error('Test error'));
            expect(errorSpy).toHaveReturnedWith('Test error');
        });

        it('should allow void events without payload', () => {
            const logoutSpy = vi.fn();
            e.on('auth:logout', logoutSpy);
            
            e.emit('auth:logout');
            
            expect(logoutSpy).toHaveBeenCalledTimes(1);
            expect(logoutSpy).toHaveBeenCalledWith(undefined);
        });

        it('should throw type errors for incorrect event payloads', () => {
            // @ts-expect-error - Testing invalid type
            e.emit('foo', 42);
            // @ts-expect-error - Testing invalid type
            e.emit('bar', 'not a number');
            // @ts-expect-error - Testing invalid type
            e.emit('network:error', 'not an error');
        });
    });
});
