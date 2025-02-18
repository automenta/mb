import {beforeAll, describe, expect, it} from 'vitest';
import {waitFor} from '@testing-library/dom';
import P2PNode from '../../server/net/p2p'; // Changed to default import
import {createEd25519PeerId} from '@libp2p/peer-id-factory';
import {PeerId} from '@libp2p/interface-peer-id';
import {v4 as uuidv4} from 'uuid'; // Import uuidv4

describe('P2PNode', () => {
    let peerId1: PeerId, peerId2: PeerId;

    beforeAll(async () => {
        peerId1 = await createEd25519PeerId() as PeerId;
        peerId2 = await createEd25519PeerId() as PeerId;
    });

    it('should discover each other and log connection', async () => {
        const roomName1 = uuidv4(); // Generate unique room name for node1
        const roomName2 = uuidv4(); // Generate unique room name for node2
        const node1 = new P2PNode({
            peerId: peerId1,
            bootstrapList: ['/ip4/127.0.0.1/tcp/0/ws/p2p/' + peerId2.toString()],
        }, roomName1); // Pass roomName1 to P2PNode constructor
        const node2 = new P2PNode({peerId: peerId2}, roomName2); // Pass roomName2 to P2PNode constructor

        const capturedLogs: string[] = [];
        const originalConsoleLog = console.log;
        console.log = (...args) => {
            capturedLogs.push(args.join(' '));
        };

        await node1.start({peerId: peerId1});
        await node2.start({peerId: peerId2});

        let node1Connected = false;
        let node2Connected = false;

        node1.on('peer:connect', () => {
            node1Connected = true;
        });

        node2.on('peer:connect', () => {
            node2Connected = true;
        });

        await waitFor(() => expect(node1Connected).toBe(true), {timeout: 10000});
        await waitFor(() => expect(node2Connected).toBe(true), {timeout: 10000});

        const node1Peers = await node1.getPeers();
        const node2Peers = await node2.getPeers();

        expect(node1Peers.find((p) => p.toString() === peerId2.toString())).toBeDefined();
        expect(node2Peers.find((p) => p.toString() === peerId1.toString())).toBeDefined();

        expect(capturedLogs).toContain(`Node1 connected to: ${peerId2.toString()}`);

        const node2Multiaddr = node2.getMultiaddrs()[0].toString() + '/p2p/' + peerId2.toString();
        expect(capturedLogs).toContain(`node2Multiaddr ${node2Multiaddr}`);

        expect(capturedLogs.some(log => log.includes('Node1 peers:'))).toBe(true);
        expect(capturedLogs.some(log => log.includes('Node2 peers:'))).toBe(true);

        console.log = originalConsoleLog;

        await node1.stop();
        await node2.stop();
    });

    it('should handle connection failures gracefully', async () => {
        const roomName1 = uuidv4(); // Generate unique room name for node1
        const roomName2 = uuidv4(); // Generate unique room name for node2
        const node1 = new P2PNode({
            peerId: peerId1,
            bootstrapList: ['/ip4/127.0.0.1/tcp/0/ws/p2p/' + peerId2.toString()],
        }, roomName1); // Pass roomName1 to P2PNode constructor
        const node2 = new P2PNode({peerId: peerId2}, roomName2); // Pass roomName2 to P2PNode constructor

        await node1.start({peerId: peerId1});
        await node2.start({peerId: peerId2});

        // Simulate a connection failure by stopping node2
        await node2.stop();

        const node1Peers = await node1.getPeers();

        // Node1 should not have node2 in its peer list
        expect(node1Peers.find((p) => p.toString() === peerId2.toString())).toBeUndefined();

        await node1.stop();
    });
});
