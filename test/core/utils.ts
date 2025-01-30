// test/utils.ts
import { vi } from 'vitest';
import { IndexeddbPersistence } from 'y-indexeddb';
import * as Y from 'yjs';
import DB from '../../core/db';
import Network from '../../core/net';
import NObject from '../../core/obj';
import { createEd25519PeerId } from '@libp2p/peer-id-factory';
import P2PNode from '../../server/p2p';
import type { EventEmitter } from 'events';

export const createTestDB = (userId = 'testuser') => {
  const ydoc = new Y.Doc();
  const provider = new IndexeddbPersistence('testdb', ydoc);
  return new DB(userId, provider);
};

export const createTestNetwork = (channel = 'test-channel') => {
  const db = createTestDB();
  return new Network(channel, db);
};

export const mockConsole = () => {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  };
};

export const createTestObject = (doc?: Y.Doc) => {
  const ydoc = doc || new Y.Doc();
  return new NObject(ydoc, 'test-id');
};

export const waitForNetworkEvent = (network: Network & EventEmitter, event: string) => {
  return new Promise((resolve) => {
    network.on(event, resolve);
  });
};

export const createTestP2PNode = async () => {
  const peerId = await createEd25519PeerId() as import('@libp2p/interface-peer-id').PeerId;
  return new P2PNode({
    peerId,
    bootstrapList: [],
  });
};

export const mockIndexedDB = () => {
  return {
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
};

// Mock localStorage
const mockStorage: Storage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn(),
  length: 0
};

global.localStorage = mockStorage;

// Mock WebRTC connections
const mockRTCPeerConnection = vi.fn() as unknown as typeof RTCPeerConnection;
mockRTCPeerConnection.generateCertificate = vi.fn();
global.RTCPeerConnection = mockRTCPeerConnection;

const mockRTCSessionDescription = vi.fn() as unknown as typeof RTCSessionDescription;
global.RTCSessionDescription = mockRTCSessionDescription;