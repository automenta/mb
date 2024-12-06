import P2PNode from './P2PNode';

describe('P2PNode', () => {
    it('should send and receive messages between nodes', async () => {
        const node1 = new P2PNode({ /* ... config */ });
        const node2 = new P2PNode({ /* ... config */ });

        const message = 'Test message';
        const topic = 'test-topic';

        // Use a Promise to wait for the message
        const receivedPromise = new Promise<string>((resolve) => {
            node2.on('message', (receivedTopic, receivedMessage) => {
                if (receivedTopic === topic) {
                    resolve(receivedMessage);
                }
            });
        });


        await node1.start();
        await node2.start();

        // Connect the two nodes - replace with your actual connection logic
        node1.connectTo(node2.id); // Example, assuming a connectTo method

        node1.sendGossipMessage(topic, message);

        const receivedMessage = await receivedPromise;

        expect(receivedMessage).toBe(message);

        await node1.stop();
        await node2.stop();
    });
});
