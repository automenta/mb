import {afterEach, beforeAll, vi} from 'vitest';
import $ from 'jquery';

vi.mock('y-webrtc', () => ({
    WebrtcProvider: vi.fn().mockImplementation(() => ({
        awareness: {
            setLocalStateField: vi.fn(),
            on: vi.fn(),
            getLocalState: () => ({ user: { id: 'test-user', name: 'Test User' } }),
            getStates: () => new Map(),
        },
        on: vi.fn(),
        destroy: vi.fn(),
    })),
}));

vi.mock('y-indexeddb', () => ({
    IndexeddbPersistence: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
    })),
}));

// Setup global mocks and stubs
beforeAll(() => {
    // Mock localStorage
    global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        clear: vi.fn(),
    };

    // Mock IndexedDB
    global.indexedDB = {
        open: vi.fn().mockReturnValue({
            onupgradeneeded: vi.fn(),
            onsuccess: vi.fn(),
            onerror: vi.fn(),
        }),
        deleteDatabase: vi.fn().mockReturnValue({
            onsuccess: vi.fn(),
            onerror: vi.fn(),
        }),
    };

    // Mock localStorage
    global.localStorage = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        clear: vi.fn(),
    };

    // Mock WebRTC connections
    global.RTCPeerConnection = vi.fn();
    global.RTCSessionDescription = vi.fn();

    // Add jQuery to global scope as some components expect it
    global.$ = $;
});

// Clean up after each test
afterEach(() => vi.clearAllMocks());
