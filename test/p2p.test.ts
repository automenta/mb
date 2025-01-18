import { describe, it, expect } from 'vitest';
import P2PNode from '../server/p2p';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { PeerId } from '@libp2p/interface-peer-id';

describe('P2PNode', () => {
    it('should discover each other', async () => {
        const peerId1 = await createFromJSON(require('./peer-id1.json'));
        const peerId2 = await createFromJSON(require('./peer-id2.json'));

        const node1 = new P2PNode({ peerId: peerId1, bootstrapList: [
                '/ip4/127.0.0.1/tcp/0/ws/p2p/' + peerId2.toString()
            ] });
        const node2 = new P2PNode({ peerId: peerId2 });
        let node2Multiaddr: string | undefined;

        await node1.start();
        await node2.start();

        node1.on('peer:connect', (connection) => {
            console.log('Node1 connected to:', connection.remotePeer.toString());
        });

        node2.on('peer:connect', () => {
            node2Multiaddr = node2.getMultiaddrs()[0].toString() + '/p2p/' + peerId2.toString();
            console.log("node2Multiaddr", node2Multiaddr);
        });

        // Adding a delay to ensure nodes have time to discover each other
        await new Promise(resolve => setTimeout(resolve, 5000));

        const node1Peers = await node1.getPeers();
        const node2Peers = await node2.getPeers();

        console.log('Node1 peers:', node1Peers);
        console.log('Node2 peers:', node2Peers);

        expect(node1Peers.find(p => p.toString() === peerId2.toString())).toBeDefined();
        expect(node2Peers.find(p => p.toString() === peerId1.toString())).toBeDefined();

        await node1.stop();
        await node2.stop();
    });
});
