import { vi, type Mock } from 'vitest';

export type MockSocket = {
  on: Mock;
  off: Mock;
  emit: Mock;
  disconnect: Mock;
  close: Mock;
  listeners: Record<string, Function>;
  mock: {
    triggerEvent: (event: string, ...args: any[]) => void;
    reset: () => void;
  };
};

export const createMockSocket = (): MockSocket => {
  const listeners: Record<string, Function> = {};
  
  return {
    on: vi.fn((event: string, handler: Function) => {
      listeners[event] = handler;
    }),
    off: vi.fn((event: string) => {
      delete listeners[event];
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
    listeners,
    mock: {
      triggerEvent(event: string, ...args: any[]) {
        if (listeners[event]) {
          listeners[event](...args);
        }
      },
      reset() {
        Object.keys(listeners).forEach(key => delete listeners[key]);
      }
    }
  };
};

export const mockSocket = createMockSocket();