import {beforeEach, describe, expect, it, vi} from 'vitest';
import {WebrtcProvider} from 'y-webrtc';
import DB from '../../src/db';
import Network from '../../src/net';
import {IndexeddbPersistence} from 'y-indexeddb';
import * as Y from 'yjs';

describe('Network', () => {
    let db: DB;
    let net: Network;
    let provider: WebrtcProvider;
    let ydoc: Y.Doc;

    beforeEach(() => {
        ydoc = new Y.Doc();
        db = new DB('testuser', new IndexeddbPersistence('testdb', ydoc));
        net = new Network('test-channel', db);
        provider = net.net;//new WebrtcProvider('test-channel', ydoc);
    });

    it('should initialize with default values', () => {
        expect(net.user().id).toEqual('test-user');
        expect(net.awareness()).toBeDefined();
    });

    it('should add and remove bootstrap servers', () => {
        net.addBootstrap('ws://test-server:4444');
        expect(net.signalingServers).toContain('ws://test-server:4444');

        net.removeBootstrap('ws://test-server:4444');
        expect(net.signalingServers).not.toContain('ws://test-server:4444');
    });

    it('should share and unshare documents', () => {
        const obj = db.create();
        obj.public = true;
        net.shareDocument(obj.id);
        expect(net.docsShared.has(obj.id)).toBe(true);

        net.unshareDocument(obj.id);
        expect(net.docsShared.has(obj.id)).toBe(false);
    });

    it('should get network stats', () => {
        const stats = net.getNetworkStats();
        expect(stats).toHaveProperty('peersConnected');
        expect(stats).toHaveProperty('awareness');
    });

    it('should emit network activity events', () => {
        const emitSpy = vi.spyOn(net, 'emit');
        net.emit('test-event', { x: 'test-data' });
        expect(emitSpy).toHaveBeenCalledWith('test-event', {
            x: 'test-data',
            stats: net.getNetworkStats(),
        });
    });
});
