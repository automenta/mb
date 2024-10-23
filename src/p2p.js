import { createLibp2p } from 'libp2p'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { bootstrap } from '@libp2p/bootstrap'
import { webSockets } from '@libp2p/websockets'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { multiaddr } from '@multiformats/multiaddr'

export default class P2PNetwork {
    constructor() {
        this.eventListeners = new Map();
        this.peers = new Set();
        this.node = null;
        this.isInitialized = false;

        // Bootstrap nodes that support WebSocket connections
        this.bootstrapNodes = [
            '/dns4/node0.preload.ipfs.io/tcp/443/wss/p2p/QmZMxNdpMkewiVZLMRxaNxUeZpDUb34pWjZ1kZvsd16Zic',
            '/dns4/node1.preload.ipfs.io/tcp/443/wss/p2p/Qmbut9Ywz9YEDrz8ySBSgWyJk41Uvm2QJPhwDJzJyGFsD6'
        ];
    }

    async connect() {
        if (this.isInitialized) {
            console.log('P2P network already initialized');
            return;
        }

        try {
            this.node = await createLibp2p({
                addresses: {
                    listen: [
                        '/ip4/127.0.0.1/tcp/0/ws',  // Local WebSocket address
                        '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star'  // WebRTC signaling server
                    ],
                    announce: [
                        '/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star'
                    ]
                },
                transports: [
                    webSockets({
                        filter: multiaddr => {
                            return multiaddr.toString().indexOf('/ws') !== -1 ||
                                multiaddr.toString().indexOf('/wss') !== -1;
                        }
                    }),
                    circuitRelayTransport({
                        discoverRelays: 1
                    })
                ],
                connectionEncryption: [noise()],
                streamMuxers: [yamux()],
                services: {
                    identify: identify(),
                    pubsub: gossipsub({
                        allowPublishToZeroTopicPeers: true,
                        emitSelf: false,
                        gossipIncoming: true,
                        fallbackToFloodsub: true,
                        heartbeatInterval: 1000
                    }),
                    bootstrap: bootstrap({
                        list: this.bootstrapNodes,
                        timeout: 20000,
                        minPeers: 1
                    })
                },
                connectionManager: {
                    minConnections: 1,
                    maxConnections: 50,
                    maxDialsPerPeer: 2,
                    dialTimeout: 10000
                },
                relay: {
                    enabled: true,
                    autoRelay: {
                        enabled: true,
                        maxListeners: 2
                    }
                }
            });

            await this.node.start();
            this.isInitialized = true;

            console.log('P2P network started successfully');
            console.log('Listening on addresses:', this.node.getMultiaddrs());

            this.emit('network-ready', this.node.peerId.toString());
            this.setupEventListeners();

            // Initial bootstrap attempt
            await this.bootstrapNetwork();

        } catch (err) {
            console.error('Failed to start P2P network:', err);
            this.isInitialized = false;
            this.emit('network-error', err.message);
            throw err;
        }
    }

    async bootstrapNetwork() {
        for (const addr of this.bootstrapNodes) {
            try {
                const ma = multiaddr(addr);
                await this.node.dial(ma, { timeout: 10000 });
                console.log('Connected to bootstrap node:', addr);
            } catch (err) {
                console.warn('Could not connect to bootstrap node:', addr);
            }
        }
    }

    setupEventListeners() {
        if (!this.node) return;

        this.node.addEventListener('peer:discovery', async (evt) => {
            const peerId = evt.detail.id.toString();
            console.log('Discovered peer:', peerId);

            try {
                await this.node.dial(evt.detail.id, { timeout: 10000 });
                console.log('Successfully connected to discovered peer:', peerId);
            } catch (err) {
                console.warn('Failed to connect to discovered peer:', peerId);
            }
        });

        this.node.addEventListener('peer:connect', (evt) => {
            const peerId = evt.detail.remotePeer.toString();
            if (!this.peers.has(peerId)) {
                this.peers.add(peerId);
                console.log('Connected to peer:', peerId);
                this.emit('peer-connected', peerId);
            }
        });

        this.node.addEventListener('peer:disconnect', (evt) => {
            const peerId = evt.detail.remotePeer.toString();
            this.peers.delete(peerId);
            console.log('Disconnected from peer:', peerId);
            this.emit('peer-disconnected', peerId);
        });

        this.node.services.pubsub.addEventListener('message', (evt) => {
            try {
                const message = JSON.parse(new TextDecoder().decode(evt.detail.data));
                this.emit(evt.detail.topic, message);
            } catch (err) {
                console.error('Error processing pubsub message:', err);
            }
        });
    }

    async publish(topic, data) {
        if (!this.node || !this.isInitialized) {
            throw new Error('Cannot publish: node not initialized');
        }

        try {
            const message = JSON.stringify(data);
            await this.node.services.pubsub.publish(topic, new TextEncoder().encode(message));
            return true;
        } catch (err) {
            console.error(`Failed to publish to ${topic}:`, err);
            return false;
        }
    }

    async disconnect() {
        if (this.node && this.isInitialized) {
            try {
                await this.node.stop();
                this.peers.clear();
                this.isInitialized = false;
                console.log('P2P network stopped');
            } catch (err) {
                console.error('Error stopping P2P network:', err);
                throw err;
            }
        }
    }

    on(eventName, listener) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(listener);
    }

    off(eventName, listener) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).delete(listener);
        }
    }

    emit(eventName, data) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(data);
                } catch (err) {
                    console.error(`Error in event listener for ${eventName}:`, err);
                }
            });
        }
    }
}