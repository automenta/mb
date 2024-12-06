// server/P2PNode.ts  (This is a new file - move the P2PNode class here)
import { Node, PeerId } from 'libp2p';
import { createLibp2p } from 'libp2p';
import { Bootstrap } from '@libp2p/bootstrap';
import { KadDHT } from '@libp2p/kad-dht';
import { WebRTCStar } from '@libp2p/webrtc-star';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
// ... other imports

// ... (P2PNode class code from p2p.ts)
// ... (Interface P2PNodeOptions remains the same)

export default class P2PNode {
    // ... existing class members

    public id: string; // Add the id property

    // ... existing methods

    async start(): Promise<void> {
        // ... existing start logic

        this.id = this.libp2p.peerId.toString(); // Initialize the id property
    }

    async connectTo(peerId: string): Promise<void> {
        // TODO: Replace this with your actual connection logic
        // This is a placeholder and might not work directly with your P2P setup
        // You'll likely need to use a signaling server or other mechanism
        // to establish the initial connection.
        const peer = await this.libp2p.peerStore.get(PeerId.createFromB58String(peerId));
        if (!peer) {
            throw new Error(`Peer not found: ${peerId}`);
        }
        await this.libp2p.dial(peer);
        console.log(`Connected to ${peerId}`);
    }


    sendGossipMessage(topic: string, message: string): void {
        // TODO: Replace this with your actual message sending logic
        // Assuming you have a gossipsub instance available
        if (!this.gossipsub) {
            throw new Error("Gossipsub not initialized");
        }
        this.gossipsub.publish(topic, message);
        console.log(`Sent message "${message}" to topic ${topic}`);
    }
}
