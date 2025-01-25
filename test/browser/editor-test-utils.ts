import { vi } from 'vitest';
import { EditorConfig, Y } from '../../ui/imports';
import { setupAppTest, TestSetupResult } from './test-utils';
import App from '../../ui/app';

const createBaseMockApp = (storeState: AppState, mockSocket: any): App => ({
  ...storeState,
  toggleDarkMode: vi.fn(),
  socket: mockSocket,
  db: storeState.db,
  net: {} as Network,
  match: {} as Matching,
  editor: {} as Editor,
  sidebar: {} as Sidebar,
  ele: $('<div>'),
  initializeApp: vi.fn(),
  initializeDB: vi.fn(),
  initializeNetwork: vi.fn(),
  initializeMatching: vi.fn(),
  initializeStore: vi.fn(),
  initializeEditor: vi.fn(),
  initializeSidebar: vi.fn(),
  initializeSocket: vi.fn(),
  setupSocket: vi.fn(),
  setupSocketListeners: vi.fn(),
  handleSocketEvent: vi.fn(),
  handleSocketPluginStatus: vi.fn(),
  handleSocketPluginError: vi.fn(),
  handleStoreUpdate: vi.fn(),
  showErrors: vi.fn(),
  showPluginStatus: vi.fn(),
  showConnectionWarning: vi.fn(),
  awareness: vi.fn(),
  isDarkMode: true,
  setNetworkStatus: vi.fn(),
  user: () => ({ userId: 'test-user', color: '#ff0000' }),
  channel: 'test-channel'
});

export const createEditorConfig = (testDoc: Y.Doc, setupResult: TestSetupResult, overrides: Partial<EditorConfig> = {}): EditorConfig => ({
  ele: null,
  db: setupResult.db,
  app: createBaseMockApp(setupResult.storeState, setupResult.mockSocket),
  getAwareness: setupResult.socket.awareness,
  currentObject: testDoc.getMap(),
  isReadOnly: false,
  networkStatusCallback: vi.fn(),
  ...overrides
});

export const createMockAwareness = (): Awareness => ({
  getStates: () => new Map(),
  setLocalStateField: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  once: vi.fn(),
  emit: vi.fn(),
  doc: new Y.Doc(),
  clientID: 1,
  states: new Map(),
  meta: new Map(),
  setLocalState: vi.fn(),
  getLocalState: vi.fn(),
  destroy: vi.fn(),
  _checkInterval: 1000,
  _observers: new Map()
});