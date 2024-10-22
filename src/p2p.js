import {createLibp2p} from 'libp2p'
import {gossipsub} from '@chainsafe/libp2p-gossipsub'
import {noise} from '@chainsafe/libp2p-noise'
import {yamux} from '@chainsafe/libp2p-yamux'
import {webRTC} from '@libp2p/webrtc'
import {webSockets} from '@libp2p/websockets'
import {circuitRelayTransport} from '@libp2p/circuit-relay-v2'
import {identify} from '@libp2p/identify'
import {multiaddr} from '@multiformats/multiaddr'

export default class P2PNetwork {


    constructor() {
        this.eventListeners = new Map();
        this.peers = new Set();
        this.connectionRetryTimeout = null;
        this.healthCheckInterval = null;

        // Public STUN/TURN servers for WebRTC
        this.iceServers = [
            {urls: ['stun:stun1.l.google.com:19302']},
            {urls: ['stun:stun2.l.google.com:19302']},
            {
                urls: 'turn:relay.metered.ca:80',
                username: 'ee14adb7354e91d293e8be4e',
                credential: 'xO/Yz6sMLO4t0Sua'
            },
            {
                urls: 'turn:relay.metered.ca:443',
                username: 'ee14adb7354e91d293e8be4e',
                credential: 'xO/Yz6sMLO4t0Sua'
            }
        ];

        // Known public relay nodes
        this.knownPeers = [
            '/ip4/95.216.221.163/tcp/443/wss/p2p/12D3KooWBzp8KPZmFCpPsf1SpS8t6nRE4WNRWUNobRQZvKDFDy2M',
            '/dns4/p2p.decentranet.xyz/tcp/443/wss/p2p/12D3KooWLDspHLiwXKeqHsDxwoN7RpGY1KiQFoZUNk8RJNaWMYbK'
        ];

        // Increase relay discovery to increase the connection paths available
        this.relayDiscoveryCount = 3;

        // Retry configuration for peer connection
        this.retryDelays = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

    }

    async connect() {
        try {
            this.node = await createLibp2p({
                addresses: {
                    listen: ['/webrtc']
                },
                transports: [
                    webRTC({
                        rtcConfiguration: {
                            iceServers: this.iceServers,
                            iceTransportPolicy: 'all',
                            bundlePolicy: 'balanced',
                            rtcpMuxPolicy: 'require',
                            iceCandidatePoolSize: 1
                        }
                    }),
                    webSockets(),  // Ensure all websocket options are used
                    circuitRelayTransport({
                        discoverRelays: this.relayDiscoveryCount  // Increase relay discovery
                    })
                ],
                connectionEncryption: [noise()],
                streamMuxers: [yamux()],
                services: {
                    identify: identify({
                        protocolPrefix: 'ipfs',
                        host: {
                            agentVersion: 'p2p-search/1.0.0'
                        }
                    }),
                    pubsub: gossipsub({
                        allowPublishToZeroTopicPeers: true,
                        emitSelf: false,
                        gossipIncoming: true,
                        fallbackToFloodsub: true,
                        floodPublish: true
                    })
                },
                connectionManager: {
                    minConnections: 1,
                    maxConnections: 50,
                    maxDialsPerPeer: 2,
                    dialTimeout: 10000,
                    autoDialInterval: 15000
                }
            });

            await this.node.start();
            const peerId = this.node.peerId.toString();
            console.log('P2P network started. Node ID:', peerId);
            this.emit('network-ready', peerId);

            this.setupEventListeners();
            this.startHealthCheck();

            // Try to connect to known peers
            await this.connectToKnownPeers();

        } catch (err) {
            console.error('Failed to start P2P network:', err);
            this.emit('network-error', err.message);
            this.scheduleReconnect();
        }
    }

    async connectToKnownPeers() {
        for (const peerAddr of this.knownPeers) {
            await this.connectToPeerWithRetry(peerAddr);
        }
    }


    setupEventListeners() {
        // Handle peer discovery and connections
        this.node.addEventListener('peer:discovery', (evt) => {
            const peerId = evt.detail.id.toString()
            console.log('Discovered peer:', peerId)

            // Automatically try to connect to discovered peers
            this.node.dial(evt.detail.id).catch(err => {
                console.warn(`Failed to connect to discovered peer ${peerId}:`, err.message)
            })
        })

        this.node.addEventListener('peer:connect', (evt) => {
            const peerId = evt.detail.remotePeer.toString()
            if (!this.peers.has(peerId)) {
                this.peers.add(peerId)
                console.log('Connected to peer:', peerId)
                this.emit('peer-connected', peerId)
            }
        })

        this.node.addEventListener('peer:disconnect', (evt) => {
            const peerId = evt.detail.remotePeer.toString()
            if (this.peers.has(peerId)) {
                this.peers.delete(peerId)
                console.log('Disconnected from peer:', peerId)
                this.emit('peer-disconnected', peerId)
            }
        })


// Set up pubsub topics
        const topics = ['new-content', 'update-content', 'remove-content']

        topics.forEach(async topic => {
            try {
                await this.node.services.pubsub.subscribe(topic)
                console.log(`Subscribed to topic: ${topic}`)
            } catch (err) {
                console.error(`Failed to subscribe to topic ${topic}:`, err)
            }
        })

// Handle pubsub messages
        this.node.services.pubsub.addEventListener('message', (evt) => {
            try {
                const {topic, data} = evt.detail
                const message = JSON.parse(new TextDecoder().decode(data))
                this.emit(topic, message)
                console.log(`Received message on topic ${topic}:`, message)
            } catch (err) {
                console.error('Error processing pubsub message:', err)
            }
        })
    }

    startHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            const connectedPeers = this.peers.size
            console.log(`Health check - Connected peers: ${connectedPeers}`)

            if (connectedPeers === 0) {
                console.log('No peers connected, attempting to connect to known peers...')
                this.connectToKnownPeers()
            }

            // Log connection stats
            console.log('Network stats:', {
                connections: connectedPeers,
                protocols: Array.from(this.node.getProtocols())
            })
        }, 30000) // Check every 30 seconds
    }

    async disconnect() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval)
        }
        if (this.connectionRetryTimeout) {
            clearTimeout(this.connectionRetryTimeout)
        }
        if (this.node) {
            await this.node.stop()
            console.log('P2P network stopped')
        }
    }

// Event handling methods
    on(eventName, listener) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set())
        }
        this.eventListeners.get(eventName).add(listener)
    }

    off(eventName, listener) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).delete(listener)
        }
    }

    emit(eventName, data) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(listener => {
                try {
                    listener(data)
                } catch (err) {
                    console.error(`Error in event listener for ${eventName}:`, err)
                }
            })
        }
    }

// Publish method for sending messages
    async publish(topic, data) {
        try {
            const message = JSON.stringify(data)
            await this.node.services.pubsub.publish(topic, new TextEncoder().encode(message))
            console.log(`Published message to topic ${topic}:`, data)
        } catch (err) {
            console.error(`Failed to publish to topic ${topic}:`, err)
            throw err
        }
    }

// Reconnection logic
    scheduleReconnect() {
        if (!this.connectionRetryTimeout) {
            this.connectionRetryTimeout = setTimeout(async () => {
                console.log('Attempting to reconnect...')
                try {
                    if (this.node) {
                        await this.node.stop()
                    }
                    await this.connect()
                    this.connectionRetryTimeout = null
                } catch (err) {
                    console.error('Reconnection failed:', err)
                    this.scheduleReconnect()
                }
            }, 5000)
        }
    }

    async connectToPeerWithRetry(peerAddr, retryCount = 0) {
        try {
            const ma = multiaddr(peerAddr);
            console.log('Attempting to connect to peer:', peerAddr);
            await this.node.dial(ma, {timeout: 10000});
            console.log('Successfully connected to peer:', peerAddr);
        } catch (err) {
            console.warn(`Failed to connect to peer ${peerAddr} (attempt ${retryCount + 1}):`, err.message);
            if (retryCount < this.retryDelays.length) {
                setTimeout(() => this.connectToPeerWithRetry(peerAddr, retryCount + 1), this.retryDelays[retryCount]);
            }
        }
    }
}