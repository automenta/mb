import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {WebrtcProvider} from 'y-webrtc';
import DB from '../../core/db';
import Network, {OBJECT_SHARED} from '../../core/net';
import {IndexeddbPersistence} from 'y-indexeddb';
import * as Y from 'yjs';

describe('Network', () => {
    let db: DB;
    let net: Network;
    let provider: WebrtcProvider;
    let ydoc: Y.Doc;
    let indexeddbProvider: IndexeddbPersistence;

    beforeEach(() => {
        ydoc = new Y.Doc();
        indexeddbProvider = new IndexeddbPersistence('testdb', ydoc);
        db = new DB('testuser', indexeddbProvider);
        net = new Network('test-channel', db);
        provider = net.net;
    });

    afterEach(() => {
        // Destroy the providers to clean up
        if (provider) {
            provider.destroy();
        }
        indexeddbProvider.destroy();
    });

    it('initialize with default values', () => {
        expect(net.channel).toEqual('test-channel');
    });

    it('add and remove bootstrap servers', () => {
        net.addBootstrap('ws://test-server:4444');
        net.removeBootstrap('ws://test-server:4444');
    });

    it('share and unshare documents', () => {
        const obj = db.create();
        obj.public = true;
        net.shareObject(obj.id);

        net.unshareObject(obj.id);
    });

    it('get network stats', () => {
        const stats = net.getNetworkStats();
        expect(stats).toHaveProperty('peersConnected');
        expect(stats).toHaveProperty('awareness');
    });

    it('emit network activity events', () => {
        const emitSpy = vi.spyOn(net, 'emit');
        net.emit(OBJECT_SHARED, { pageId: 'test-page', peerId: 'test-peer' });
        expect(emitSpy).toHaveBeenCalledWith(OBJECT_SHARED, {
            pageId: 'test-page',
            peerId: 'test-peer',
            stats: expect.any(Object)
        });
    });
});
