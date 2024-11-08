import {afterEach, beforeAll, vi} from 'vitest';
import {Doc} from 'yjs';
import $ from 'jquery';

// Mock WebRTC provider
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

// Mock IndexedDB provider
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

    // Mock WebRTC connections
    global.RTCPeerConnection = vi.fn();
    global.RTCSessionDescription = vi.fn();

    // Add jQuery to global scope as some components expect it
    global.$ = $;
});

// Clean up after each test
afterEach(() => {
    vi.clearAllMocks();
});

// Helper to create a test document
export function createTestDoc() {
    return new Doc();
}

// Helper to simulate user events
export function simulateUserEvent(element, eventType, data = {}) {
    const event = new Event(eventType, { bubbles: true });
    Object.assign(event, data);
    element.dispatchEvent(event);
}