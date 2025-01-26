import 'fake-indexeddb/auto';
import { vi } from 'vitest';

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