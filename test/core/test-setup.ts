import 'fake-indexeddb/auto';
import {vi} from 'vitest';

vi.mock('ws', () => {
    return {
        WebSocket: vi.fn(() => ({
            on: vi.fn(),
            send: vi.fn(),
            close: vi.fn()
        })),
        WebSocketServer: vi.fn(() => ({
            on: vi.fn()
        }))
    };
});

vi.mock('bittorrent-dht', () => {
    return {
        MainlineDHT: vi.fn(() => ({
            listen: vi.fn(),
            destroy: vi.fn(),
            on: vi.fn(),
            lookup: vi.fn()
        }))
    };
});

vi.stubGlobal('localStorage', {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn()
});
