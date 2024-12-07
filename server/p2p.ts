import { createLibp2p } from 'libp2p';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { webRTCStar } from '@libp2p/webrtc-star';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { multiaddr } from 'multiaddr';
import { MainlineDHT } from 'bittorrent-dht';
import { EventEmitter } from 'events';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { PeerId } from '@libp2p/interface-peer-id';

import { logger } from 'libp2p'; //TODO ComponentLogger??

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
        const bs = options.bootstrapList || [
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
                new webRTCStar()
            ],
            connectionEncryption: [
                new noise()
            ],
            streamMuxers: [
                new mplex()
            ],
            peerDiscovery: [
                new bootstrap({ list: bs })
            ],
            dht: new kadDHT(),
            pubsub: new GossipSub({
                logger: logger
            }),
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
        this.node.connectionManager.addEventListener('peer:connect', e => {
            const connection = e.detail;
            console.log('Connected to:', connection.remotePeer.toString());
            this.emit('peer:connect', connection);
        });

        this.node.pubsub.addEventListener('message', e => {
            const msg = e.detail;
            console.log('Received message:', msg.data.toString());
            this.emit('message', msg);
        });

        this.dht.on('peer', peer => {
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
