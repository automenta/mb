import { vi } from 'vitest';
import type { AddressInfo } from 'net';
import type { AppState, UserInfo } from '../../ui/store';
import type { default as DB } from '../../src/db';
import type { Socket } from 'socket.io-client';
import type { Server } from 'http';

type TestSetupOptions = {
  initialTheme?: 'light' | 'dark';
  initialUser?: UserInfo;
  initialStoreState?: Partial<AppState>;
};

type TestSetupResult = {
  db: DB;
  container: HTMLElement;
  socket: Socket;
  storeState: AppState;
  server: Server<typeof import('http').IncomingMessage, typeof import('http').ServerResponse>;
  cleanup: () => void;
  mockSocket: Socket;
};

export { TestSetupResult };


export const createTestContainer = (): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
};

export const cleanupTestContainer = (container: HTMLElement): void => {
  document.body.removeChild(container);
};

export const setupAppTest = async (options: TestSetupOptions = {}): Promise<TestSetupResult> => {
  console.log('Starting setupAppTest');
  const {
    initialTheme = 'dark',
    initialUser = { userId: 'test-user', name: 'Test User', color: '#ff0000' },
    initialStoreState: customState = {}
  } = options;

  // Start real server
  console.log('Creating server');
  const { createServer } = await import('../../server/server');
  const { server } = await createServer();
  const testServerPort = (server.address() as AddressInfo).port;
  
  // Wait for server to be ready.  This is a more robust approach that ensures the server is fully started before proceeding.
  console.log('Waiting for server to be ready');
  await new Promise(resolve => server.once('listening', resolve));

    console.log(`Port ${testServerPort} is open.`);

  console.log('Creating test container');
  const container = createTestContainer();

  // Initialize localStorage with theme preference
  console.log('Initializing localStorage');
  localStorage.setItem('themePreference', initialTheme);

  // Import and use the real DB class
  console.log('Importing and initializing DB');
  const { default: DB } = await vi.importActual<typeof import('../../src/db')>('../../src/db');
  const testDB = new DB('test-user');
  
  // Initialize store state
  console.log('Initializing store state');
  const storeState: AppState = {
    currentUser: initialUser,
    currentObject: null,
    objects: [],
    friends: [],
    networkStatus: 'disconnected',
    pluginStatus: {},
    errors: [],
    db: testDB,
    ...customState
  };

  // Import socket.io-client
  console.log('Importing socket.io-client');
  const { io } = await import('socket.io-client');
  
  // Create real socket connection
  console.log('Creating socket connection');
  const socket = io(`http://localhost:${testServerPort}`, {
    autoConnect: true
  });

  console.log('Waiting for socket connection');
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Socket connected');
      resolve();
    });
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      reject(error);
    });
  });

  console.log('Returning from setupAppTest');
  return {
    db: testDB,
    container,
    socket,
    storeState,
    server,
    cleanup: () => {
      console.log('Cleaning up test environment');
      vi.clearAllMocks();
      localStorage.clear();
      socket.disconnect();
      server.close();
      cleanupTestContainer(container);
    },
    mockSocket: socket
  };
};

export const waitFor = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export const simulateUserInteraction = async (element: HTMLElement, eventType: string): Promise<void> => {
  const event = new Event(eventType, { bubbles: true });
  element.dispatchEvent(event);
  await waitFor(0); // Allow event to propagate
};
