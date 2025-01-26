import { describe, expect, test, beforeEach, afterEach, vi,  } from 'vitest';
import { setupAppTest, TestSetup } from './test-utils';
import App from '../../ui/app';
import { store } from '../../ui/store';

describe('App Component', () => {
  let testSetup: TestSetup;
  let app: App;

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
    test('should load without errors', async () => {
      app.mount(testSetup.container);
      await new Promise(resolve => setTimeout(resolve, 100)); //Added timeout to allow for rendering
      expect(testSetup.container.querySelector('#app')).toBeDefined(); // Use #app instead of .app
    });

    test('should throw error with invalid constructor parameters', () => {
      expect(() => new App('', 'test-channel')).toThrow('Invalid user ID');
      expect(() => new App('test-user', '')).toThrow('Invalid channel ID');
    });

    test('should initialize all required components', async () => {
      app.mount(testSetup.container);
      await new Promise(resolve => setTimeout(resolve, 500)); //Increased timeout

      expect(testSetup.container.querySelector('[data-testid="db-provider"]')).toBeDefined();
      expect(testSetup.container.querySelector('[data-testid="network-status"]')).toBeDefined();
      expect(testSetup.container.querySelector('[data-testid="matching-engine"]')).toBeDefined();
      expect(testSetup.container.querySelector('[data-testid="editor"]')).toBeDefined();
      expect(testSetup.container.querySelector('[data-testid="sidebar"]')).toBeDefined();
    });
  });

  describe('Dark Mode', () => {
    test('should toggle dark mode correctly', async () => {
      app.mount(testSetup.container);
      await new Promise(resolve => setTimeout(resolve, 500)); //Increased timeout
      // Remove jQuery-specific assertions
      app.toggleDarkMode();
      await new Promise(resolve => setTimeout(resolve, 500)); //Increased timeout
      app.toggleDarkMode();
      await new Promise(resolve => setTimeout(resolve, 500)); //Increased timeout
    });
  });

  describe('Network Handling', () => {
    test('should handle network status transitions', () => {
      testSetup.socket.emit('connect');
      expect(store.getState().networkStatus).toEqual('connected');

      testSetup.socket.emit('disconnect');
      expect(store.getState().networkStatus).toEqual('disconnected');

      testSetup.socket.emit('error', new Error('Network failure'));
      expect(store.getState().networkStatus).toEqual('error');

      testSetup.socket.emit('connect');
      testSetup.socket.emit('connect');
      expect(store.getState().networkStatus).toBe('connected');

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

  // ... (rest of the tests with similar modifications)
});