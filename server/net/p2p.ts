import { createLibp2p, Libp2p } from 'libp2p';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { webRTCStar } from '@libp2p/webrtc-star';
import { WebSocketServer, RawData } from 'ws';
import { createHash } from 'crypto';
import { createServer } from 'https';
import { readFileSync } from 'fs';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import { Components } from '@libp2p/interface-components';
import { MainlineDHT } from 'bittorrent-dht';
import { EventEmitter } from 'events';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { PeerId } from '@libp2p/interface-peer-id';
import type { Libp2pOptions } from 'libp2p';
import { pino } from 'pino'; // Import pino logger

interface P2PNodeOptions {
    peerId: PeerId;
    bootstrapList?: string[];
}

class P2PNode extends EventEmitter {
    private node: Libp2p | undefined;
    private dht: MainlineDHT;
    private wss: WebSocketServer;
    private provider: WebrtcProvider;

    constructor(options: P2PNodeOptions) {
        super();
        this.dht = new MainlineDHT();
        this.wss = new WebSocketServer({ port: 8080 });

        this.wss.on('connection', (ws, req) => {
            const token = new URLSearchParams(req.url?.split('?')[1] || '').get('token');
            if (!this.authenticatePeer(token)) {
                ws.close();
                return;
            }
            ws.on('message', (message: RawData) => {
                const msgStr = message.toString();
                this.handleWebSocketMessage(msgStr);
            });
            ws.send('Authentication successful');
        });

        console.log('WebSocket Server running on ws://localhost:8080');

        // Initialize y-webrtc provider
        const ydoc = new Y.Doc();
        this.provider = new WebrtcProvider('your-room-name', ydoc, {
            signaling: ['ws://localhost:8080'],
            // Add additional configuration as needed
        });
    }

    async start(options: P2PNodeOptions) {
        this.node = await this.createLibp2pNode(options);
        await this.node.start();
        this.setupEventListeners();
        this.dht.listen(6881, () => console.log('Mainline DHT listening on port 6881'));
    }

    async stop() {
        await this.node?.stop();
        this.dht.destroy();
        this.wss.close();
        this.provider.destroy();
    }

    private authenticatePeer(token: string | null): boolean {
        // Replace with a more secure authentication mechanism
        // For example, validate against a database of valid tokens
        const validTokens = ['token1', 'token2', 'token3']; // Replace with actual token retrieval
        return token !== null && validTokens.includes(token);
    }

    private handleWebSocketMessage(message: string): void {
        // Handle incoming WebSocket messages
        console.log('Received WebSocket message:', message);
        // Integrate with y-webrtc provider as needed
        // For example, handle custom signaling messages
    }

    private async createLibp2pNode(options: P2PNodeOptions): Promise<Libp2p> {
        const bs = options.bootstrapList || [
            "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p-webrtc-star/",
            "/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p-webrtc-star/"
        ];
        const logger = pino(); // Create pino logger instance

        return await createLibp2p({
            addresses: {
                listen: [
                    '/dns4/localhost/tcp/0/ws',
                ]
            },
            transports: [
                (components: Components) => webRTCStar.createTransport()
            ],
            connectionEncryption: [
                noise()
            ],
            streamMuxers: [
                mplex()
            ],
            peerDiscovery: [
                bootstrap({ list: bs })
            ],
            dht: kadDHT(),
            pubsub: new GossipSub({
                logger: logger, // Use pino logger
                // Additional configuration if necessary
            }),
        });
    }

    private setupEventListeners() {
        if (!this.node) return;

        this.node.connectionManager.addEventListener('peer:connect', (e) => {
            const connection = e.detail;
            console.log('Connected to:', connection.remotePeer.toString());
            this.emit('peer:connect', connection);
        });

        this.node.pubsub.addEventListener('message', (e) => {
            const msg = e.detail;
            console.log('Received message:', msg.data.toString());
            this.emit('message', msg);
        });

        this.dht.on('peer', (peer) => {
            console.log('Found peer:', peer);
            this.emit('dht:peer', peer);
        });
    }

    async sendGossipMessage(topic: string, message: string) {
        if (!this.node) throw new Error('Libp2p node is not initialized');
        await this.node.pubsub.publish(topic, Buffer.from(message));
    }

    async getPeers() {
        if (!this.node) throw new Error('Libp2p node is not initialized');
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

    getMultiaddrs() {
        return this.node?.getAddresses() || [];
    }
}

export default P2PNode;
