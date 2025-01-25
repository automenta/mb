import { describe, expect, test, beforeEach, afterEach, vi, expectTypeOf } from 'vitest';
import { setupAppTest } from './test-utils';
import App from '../../ui/app';
import { store, type AppState } from '../../ui/store';

describe('App Component', () => {
  let testSetup: Awaited<ReturnType<typeof setupAppTest>>;
  let app: App;

  // Setup and teardown
  beforeEach(async () => {
    testSetup = await setupAppTest();
    testSetup.storeState = {
      currentUser: { userId: 'test-user', name: 'Test User', color: '#ff0000' },
      currentObject: null,
      objects: [],
      friends: [],
      networkStatus: 'disconnected',
      pluginStatus: {},
      errors: [],
      db: testSetup.db
    };
    app = new App('test-user', 'test-channel');
  });

  afterEach(async () => {
    await testSetup.cleanup();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should load without errors', () => {
      app.mount(testSetup.container);
      expect(testSetup.container.querySelector('.app')).toBeDefined();
    });

    test('should throw error with invalid constructor parameters', () => {
      expect(() => new App('', 'test-channel')).toThrow('Invalid user ID');
      expect(() => new App('test-user', '')).toThrow('Invalid channel ID');
    });

    test('should initialize all required components', () => {
      const app = new App('test-user', 'test-channel');
      expect(app.db.provider).toBeDefined();
      expect(app.net).toBeDefined(); // No need to check for connect here, it's initialized in the constructor
      expect(app.match).toBeDefined();
      expect(app.editor).toBeDefined();
      expect(app.sidebar).toBeDefined();
    });
  });

  describe('Dark Mode', () => {
    test('should toggle dark mode correctly', () => {
      // Verify initial state
      expect(app.ele.hasClass('dark')).toBe(true);
      expect(app.ele.attr('data-theme')).toBe('dark');
      expect(app.isDarkMode).toBe(true);
      expect(testSetup.container.querySelector('.dark-mode-toggle')).toBeDefined();
      expect(app.container.querySelector('.dark-mode-toggle')).toBeDefined(); //Check for UI element

      // First toggle
      app.toggleDarkMode();
      expect(app.ele.hasClass('dark')).toBe(false);
      expect(app.ele.attr('data-theme')).toBe('light');
      expect(localStorage.setItem).toHaveBeenCalledWith('themePreference', 'light');

      // Second toggle
      app.toggleDarkMode();
      expect(app.ele.hasClass('dark')).toBe(true);
      expect(app.ele.attr('data-theme')).toBe('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('themePreference', 'dark');
    });
  });

  describe('Network Handling', () => {
    test('should handle network status transitions', () => {
      // Test valid state transitions
      testSetup.socket.emit('connect');
      expect(store.getState().networkStatus).toEqual('connected');

      testSetup.socket.emit('disconnect');
      expect(store.getState().networkStatus).toEqual('disconnected');

      // Test error state
      testSetup.socket.emit('error', new Error('Network failure'));
      expect(store.getState().networkStatus).toEqual('error');

      // Test duplicate events
      testSetup.socket.emit('connect');
      testSetup.socket.emit('connect');
      expect(store.getState().networkStatus).toBe('connected');

      // Test recovery from error state
      testSetup.socket.emit('connect');
      expect(store.getState().networkStatus).toBe('connected');
    });

    test('should handle socket errors', () => {
      const testError = new Error('Socket error');

      testSetup.socket.emit('error', testError);

      const errors = store.getState().errors;
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        pluginName: 'socket.io',
        error: testError,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Plugin Management', () => {
    test('should handle plugin status updates', () => {
      const testStatus = { 'text-gen': true, 'image-gen': false };

      testSetup.socket.emit('plugin-status', testStatus);
      expect(store.getState().pluginStatus).toEqual(testStatus);
    });

    test('should log plugin errors', () => {
      const testError = new Error('Plugin failed');

      // Verify initial state
      expect(store.getState().errors).toHaveLength(0);

      // Trigger plugin error event
      testSetup.socket.emit('plugin-error', 'text-gen', testError);

      // Verify store update
      const errors = store.getState().errors;
      expect(errors).toHaveLength(1);
      expect(errors[0]).toEqual({
        pluginName: 'text-gen',
        error: testError,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Type Safety', () => {
    test('should maintain type-safe store state', () => {
      expectTypeOf(store.getState()).toMatchTypeOf<AppState>();
      expectTypeOf(store.getState().networkStatus).toEqualTypeOf<'connected' | 'disconnected' | 'error'>();
      expectTypeOf(store.getState().pluginStatus).toEqualTypeOf<Record<string, boolean>>();
      expectTypeOf(store.getState().errors[0]).toMatchTypeOf<{
        pluginName: string;
        error: Error;
        timestamp: number;
      }>();
    });
  });
});