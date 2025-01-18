import { describe, it, expect } from 'vitest';
import P2PNode from '../server/p2p';
import { createRSAPeerId, createEd25519PeerId, createSecp256k1PeerId } from '@libp2p/peer-id-factory';

describe('P2PNode', () => {
    it('should discover each other', async () => {
        const peerId1 = await createRSAPeerId();
        const peerId2 = await createEd25519PeerId();
        const node1 = new P2PNode({
            peerId: peerId1,
            bootstrapList: [
                `/ip4/127.0.0.1/tcp/0/ws/p2p/${peerId2.toString()}`
            ]
        });
        const node2 = new P2PNode({ peerId: peerId2 });
        let node2Multiaddr;

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
        await node1.stop();
        await node1.stop();
        await node2.stop();
    });

    it('should return a list of connected peers', async () => {
        const peerId1 = await createRSAPeerId();
        const peerId2 = await createRSAPeerId();
        const node1 = new P2PNode({
            peerId: peerId1,
            bootstrapList: [
                `/ip4/127.0.0.1/tcp/0/ws/p2p/${peerId2.toString()}`
            ]
        });
        const node2 = new P2PNode({ peerId: peerId2 });

        await node1.start();
        await node2.start();

        // Wait for nodes to connect
        await new Promise(resolve => setTimeout(resolve, 5000));

        const node1Peers = await node1.getPeers();
        expect(node1Peers.find(p => p.toString() === peerId2.toString())).toBeDefined();

        await node1.stop();
        await node2.stop();

        // Clean up
        if (node1.isStarted()) {
            await node1.stop();
        }
        if (node2.isStarted()) {
            await node2.stop();
        }
    });

    it('should start and stop the node', async () => {
        const peerId = await createRSAPeerId();
        const node = new P2PNode({ peerId });

        await node.start();
        expect(node.isStarted()).toBe(true);

        await node.stop();
        expect(node.isStarted()).toBe(false);

        // Clean up
        if (node.isStarted()) {
            await node.stop();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicDJwLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwMnAudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDOUMsT0FBTyxPQUFPLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUd6RCxRQUFRLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtJQUNyQixFQUFFLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxjQUFjLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNqRSxNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sS0FBSyxHQUFHLElBQUksT0FBTyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUU7Z0JBQ3BELDhCQUE4QixHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUU7YUFDdEQsRUFBRSxDQUFDLENBQUM7UUFDVCxNQUFNLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLElBQUksY0FBa0MsQ0FBQztRQUV2QyxNQUFNLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixNQUFNLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVwQixLQUFLLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3BDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLEVBQUUsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1lBQzFCLGNBQWMsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwRixPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO1FBRUgsa0VBQWtFO1FBQ2xFLE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFeEQsTUFBTSxVQUFVLEdBQUcsTUFBTSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsTUFBTSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFeEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNoRixNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRWhGLE1BQU0sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ25CLE1BQU0sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCB9IGZyb20gJ3ZpdGVzdCc7XG5pbXBvcnQgUDJQTm9kZSBmcm9tICcuLi9zZXJ2ZXIvcDJwJztcbmltcG9ydCB7IGNyZWF0ZUZyb21KU09OIH0gZnJvbSAnQGxpYnAycC9wZWVyLWlkLWZhY3RvcnknO1xuaW1wb3J0IHsgUGVlcklkIH0gZnJvbSAnQGxpYnAycC9pbnRlcmZhY2UtcGVlci1pZCc7XG5cbmRlc2NyaWJlKCdQMlBOb2RlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZGlzY292ZXIgZWFjaCBvdGhlcicsIGFzeW5jICgpID0+IHtcbiAgICAgICAgY29uc3QgcGVlcklkMSA9IGF3YWl0IGNyZWF0ZUZyb21KU09OKHJlcXVpcmUoJy4vcGVlci1pZDEuanNvbicpKTtcbiAgICAgICAgY29uc3QgcGVlcklkMiA9IGF3YWl0IGNyZWF0ZUZyb21KU09OKHJlcXVpcmUoJy4vcGVlci1pZDIuanNvbicpKTtcblxuICAgICAgICBjb25zdCBub2RlMSA9IG5ldyBQMlBOb2RlKHsgcGVlcklkOiBwZWVySWQxLCBib290c3RyYXBMaXN0OiBbXG4gICAgICAgICAgICAgICAgJy9pcDQvMTI3LjAuMC4xL3RjcC8wL3dzL3AycC8nICsgcGVlcklkMi50b1N0cmluZygpXG4gICAgICAgICAgICBdIH0pO1xuICAgICAgICBjb25zdCBub2RlMiA9IG5ldyBQMlBOb2RlKHsgcGVlcklkOiBwZWVySWQyIH0pO1xuICAgICAgICBsZXQgbm9kZTJNdWx0aWFkZHI6IHN0cmluZyB8IHVuZGVmaW5lZDtcblxuICAgICAgICBhd2FpdCBub2RlMS5zdGFydCgpO1xuICAgICAgICBhd2FpdCBub2RlMi5zdGFydCgpO1xuXG4gICAgICAgIG5vZGUxLm9uKCdwZWVyOmNvbm5lY3QnLCAoY29ubmVjdGlvbikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ05vZGUxIGNvbm5lY3RlZCB0bzonLCBjb25uZWN0aW9uLnJlbW90ZVBlZXIudG9TdHJpbmcoKSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5vZGUyLm9uKCdwZWVyOmNvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgICAgICBub2RlMk11bHRpYWRkciA9IG5vZGUyLmdldE11bHRpYWRkcnMoKVswXS50b1N0cmluZygpICsgJy9wMnAvJyArIHBlZXJJZDIudG9TdHJpbmcoKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwibm9kZTJNdWx0aWFkZHJcIiwgbm9kZTJNdWx0aWFkZHIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGRpbmcgYSBkZWxheSB0byBlbnN1cmUgbm9kZXMgaGF2ZSB0aW1lIHRvIGRpc2NvdmVyIGVhY2ggb3RoZXJcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMDApKTtcblxuICAgICAgICBjb25zdCBub2RlMVBlZXJzID0gYXdhaXQgbm9kZTEuZ2V0UGVlcnMoKTtcbiAgICAgICAgY29uc3Qgbm9kZTJQZWVycyA9IGF3YWl0IG5vZGUyLmdldFBlZXJzKCk7XG5cbiAgICAgICAgY29uc29sZS5sb2coJ05vZGUxIHBlZXJzOicsIG5vZGUxUGVlcnMpO1xuICAgICAgICBjb25zb2xlLmxvZygnTm9kZTIgcGVlcnM6Jywgbm9kZTJQZWVycyk7XG5cbiAgICAgICAgZXhwZWN0KG5vZGUxUGVlcnMuZmluZChwID0+IHAudG9TdHJpbmcoKSA9PT0gcGVlcklkMi50b1N0cmluZygpKSkudG9CZURlZmluZWQoKTtcbiAgICAgICAgZXhwZWN0KG5vZGUyUGVlcnMuZmluZChwID0+IHAudG9TdHJpbmcoKSA9PT0gcGVlcklkMS50b1N0cmluZygpKSkudG9CZURlZmluZWQoKTtcblxuICAgICAgICBhd2FpdCBub2RlMS5zdG9wKCk7XG4gICAgICAgIGF3YWl0IG5vZGUyLnN0b3AoKTtcbiAgICB9KTtcbn0pO1xuIl19
