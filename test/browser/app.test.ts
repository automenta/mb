import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import '../setup.js';
import App from '../../ui/app';

// Mock external dependencies
vi.mock('../../src/db', () => ({
  default: vi.fn().mockImplementation(() => ({
    index: new Map(),
    create: vi.fn().mockImplementation((id: string) => ({ id })),
  }))
}));

vi.mock('../../src/net', () => ({
  default: vi.fn().mockImplementation(() => ({
    user: () => ({ id: 'test-user' }),
    awareness: () => ({
      getStates: () => new Map(),
      on: vi.fn(),
      off: vi.fn()
    }),
  }))
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn().mockReturnValue({
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    close: vi.fn(),
  })
}));

vi.mock('../../ui/store', () => ({
  initializeStore: vi.fn(),
  store: {
    subscribe: vi.fn(),
    setCurrentUser: vi.fn(),
    setNetworkStatus: vi.fn(),
    logError: vi.fn(),
    updatePluginStatus: vi.fn(),
    errors: [],
    pluginStatus: {},
  }
}));

vi.mock('../../ui/editor/editor', () => ({
  default: vi.fn().mockImplementation(() => ({
    loadSnapshot: vi.fn(),
    ele: document.createElement('div')
  }))
}));

vi.mock('../../ui/sidebar', () => ({
  default: vi.fn().mockImplementation(() => ({
    ele: document.createElement('div')
  }))
}));

describe('App', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test('loads without errors', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error');
    
    expect(() => {
      const app = new App('test-user', 'test-channel');
      container.appendChild(app.ele[0]);
    }).not.toThrow();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});