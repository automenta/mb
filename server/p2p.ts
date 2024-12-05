import { Node } from 'libp2p';
import { createLibp2p } from 'libp2p';
import { Bootstrap } from '@libp2p/bootstrap';
import { KadDHT } from '@libp2p/kad-dht';
import { WebRTCStar } from '@libp2p/webrtc-star';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { multiaddr } from 'multiaddr';
import { MainlineDHT } from 'bittorrent-dht';
import { EventEmitter } from 'events';
import { Noise } from '@chainsafe/libp2p-noise';
import { Mplex } from '@libp2p/mplex';
import { createFromJSON } from '@libp2p/peer-id-factory';
import { PeerId } from '@libp2p/interface-peer-id';

interface P2PNodeOptions {
    peerId: PeerId;
    bootstrapList?: string[];
}

class P2PNode extends EventEmitter {
    private node: Node;
    private dht: any;

    constructor(options: P2PNodeOptions) {
        super();
        this.node = this.createLibp2pNode(options);
        this.dht = new MainlineDHT();
    }

    private createLibp2pNode(options: P2PNodeOptions): Node {
        const bootstrap = options.bootstrapList || [
            "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p-webrtc-star/",
            "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p-webrtc-star/"
        ];

        return createLibp2p({
            peerId: options.peerId,
            addresses: {
                listen: [
                    '/dns4/localhost/tcp/0/ws',
                ]
            },
            transports: [
                new WebRTCStar()
            ],
            connectionEncryption: [
                new Noise()
            ],
            streamMuxers: [
                new Mplex()
            ],
            peerDiscovery: [
                new Bootstrap({ list: bootstrap })
            ],
            dht: new KadDHT(),
            pubsub: new GossipSub(),
        });
    }

    async start() {
        await this.node.start();
        this.setupEventListeners();
        this.dht.listen(6881, () => console.log('Mainline DHT listening on port 6881'));
    }

    async stop() {
        await this.node.stop();
        this.dht.destroy();
    }

    private setupEventListeners() {
        this.node.connectionManager.addEventListener('peer:connect', (evt) => {
            const connection = evt.detail;
            console.log('Connected to:', connection.remotePeer.toString());
            this.emit('peer:connect', connection);
        });

        this.node.pubsub.addEventListener('message', (evt) => {
            const msg = evt.detail;
            console.log('Received message:', msg.data.toString());
            this.emit('message', msg);
        });

        this.dht.on('peer', (peer) => {
            console.log('Found peer:', peer);
            this.emit('dht:peer', peer);
        });
    }

    async sendGossipMessage(topic: string, message: string) {
        await this.node.pubsub.publish(topic, Buffer.from(message));
    }

    async getPeers() {
        return this.node.peerStore.getPeers();
    }

    async findNode(id: string) {
        return new Promise((resolve, reject) => {
            this.dht.lookup(id, (err, res) => {
                if (err) reject(err);
                resolve(res);
            });
        });
    }
}

export default P2PNode;

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
