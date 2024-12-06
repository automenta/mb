import P2PNode from '../server/P2PNode';


// Test script to verify two nodes discovering each other
(async () => {
    const peerId1 = await createFromJSON(require('./peer-id1.json'));
    const peerId2 = await createFromJSON(require('./peer-id2.json'));

    const node1 = new P2PNode({ peerId: peerId1, bootstrapList: [
            '/dns4/localhost/tcp/15002/ws/p2p/' + peerId2.toString()
        ] });
    const node2 = new P2PNode({ peerId: peerId2, bootstrapList: [] });

    await node1.start();
    await node2.start();

    node1.on('peer:connect', (connection) => {
        console.log('Node1 connected to:', connection.remotePeer.toString());
    });

    node2.on('peer:connect', (connection) => {
        console.log('Node2 connected to:', connection.remotePeer.toString());
    });

    // Adding a delay to ensure nodes have time to discover each other
    setTimeout(async () => {
        console.log('Node1 peers:', await node1.getPeers());
        console.log('Node2 peers:', await node2.getPeers());

        await node1.stop();
        await node2.stop();
    }, 15000);
})();
