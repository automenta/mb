import { afterEach, beforeEach } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';

// Mock server dependencies
vi.mock('http', () => ({}));
vi.mock('net', () => ({}));
vi.mock('../../server/server', () => ({
  createServer: () => ({
    server: {
      close: vi.fn(cb => cb()),
      address: () => ({ port: 3000 })
    }
  })
}));

beforeEach(() => {
  // Setup fake IndexedDB
  global.indexedDB = indexedDB;
  global.IDBKeyRange = IDBKeyRange;
});

afterEach(() => {
  // Cleanup DOM and IndexedDB
  document.body.innerHTML = '';
  if (global.indexedDB && global.indexedDB.databases) {
    global.indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name) {
          global.indexedDB.deleteDatabase(db.name);
        }
      });
    });
  }
});