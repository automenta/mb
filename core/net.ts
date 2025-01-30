/**
 * Interface representing network metrics collected by the Network class
 */
interface NetworkMetricsData {
    bytesTransferred: number;
    messagesSent: number;
    messagesReceived: number;
    peersConnected: Set<string>;
}

/**
 * Class to manage network metrics.
 */
class NetworkMetrics {
    private  NetworkMetricsData;

    constructor() {
        this.data = {
            bytesTransferred: 0,
            messagesSent: 0,
            messagesReceived: 0,
            peersConnected: new Set(),
        };
    }

    incrementBytesTransferred(bytes: number): void {
        this.data.bytesTransferred += bytes;
    }

    incrementMessagesSent(): void {
        this.data.messagesSent += 1;
    }

    incrementMessagesReceived(): void {
        this.data.messagesReceived += 1;
    }

    addPeerConnected(peerId: string): void {
        this.data.peersConnected.add(peerId);
    }

    removePeerConnected(peerId: string): void {
        this.data.peersConnected.delete(peerId);
    }

    getMetrics(): NetworkMetricsData {
        return { ...this.data }; // Return a copy to prevent direct modification
    }

    getPeersConnected(): Set<string> {
        return new Set(this.data.peersConnected); // Return a copy
    }

    getMessagesSent(): number {
        return this.data.messagesSent;
    }

    getMessagesReceived(): number {
        return this.data.messagesReceived;
    }

    getBytesTransferred(): number {
        return this.data.bytesTransferred;
    }
}

export const NETWORK_ACTIVITY = Symbol('network-activity'); // Export NETWORK_ACTIVITY
const MESSAGE_SENT = Symbol('message-sent');
const MESSAGE_RECEIVED = Symbol('message-received');
const PEER_CONNECTED = Symbol('peer-connected');
const PEER_DISCONNECTED = Symbol('peer-disconnected');
const AWARENESS_UPDATE = Symbol('awareness-update');
export const OBJECT_SHARED = Symbol('object-shared'); // Export OBJECT_SHARED
const OBJECT_UNSHARED = Symbol('object-unshared');

/**
 * Union type of all possible network event types
 */
type NetworkEventType =
    | typeof MESSAGE_SENT
    | typeof MESSAGE_RECEIVED
    | typeof PEER_CONNECTED
    | typeof PEER_DISCONNECTED
    | typeof AWARENESS_UPDATE
    | typeof OBJECT_SHARED
    | typeof OBJECT_UNSHARED;

/**
 * Interface representing data payload for network events
 */
interface NetworkEventData {
    bytes?: number;
    peerId?: string;
    changes?: any;
    pageId?: string;
    stats?: ReturnType<Network['getNetworkStats']>;
}

import {WebrtcProvider} from 'y-webrtc';
import DB from "./db";
import {events} from './events';

/**
 * Network class handles WebRTC connections and document synchronization
 * using Yjs and y-webrtc provider. Manages signaling servers, peer connections,
 * and document sharing state.
 */
class Network {

    readonly channel: string;
    private db: DB;
    private docsShared: Set<string>;
    private readonly metrics: NetworkMetrics; // Use the NetworkMetrics class
    net!: WebrtcProvider;
    private readonly signalingServers: string[];

    constructor(channel:string, db:DB) {
        this.channel = channel;
        this.db = db;

        this.docsShared = new Set();
        this.metrics = new NetworkMetrics(); // Initialize NetworkMetrics

        this.db.doc.on('update', (update, origin) => {
            this.metrics.incrementBytesTransferred(update.length);
            if (origin === this.net!) {
                this.metrics.incrementMessagesSent();
                this.emit(MESSAGE_SENT, { bytes: update.length });
            } else {
                this.metrics.incrementMessagesReceived();
                this.emit(MESSAGE_RECEIVED, { bytes: update.length });
            }
        });

        // Load persisted signaling servers with fallback to default
        try {
            const storedServers = localStorage.getItem('signalingServers');
            this.signalingServers = storedServers
                ? JSON.parse(storedServers)
                : ['ws://localhost:4444'];
        } catch (error) {
            console.warn('Failed to load signaling servers from localStorage:', error);
            this.signalingServers = ['ws://localhost:4444'];
        }

        this.reset();
    }

    reset() {
        if (this.net) {
            this.net.destroy();
        }

        /** https://github.com/yjs/y-webrtc
         *  https://github.com/feross/simple-peer#peer--new-peeropts */
        this.net = new WebrtcProvider(this.channel, this.db.doc, {
            signaling: this.signalingServers,
        });

        this.net.awareness.setLocalStateField('user', {
            id: this.db.userID,
            name: 'Anonymous',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        });

        // Track peer connections
        this.net.on('peers', ({added, removed}) => {
            added.forEach(id => {
                this.metrics.addPeerConnected(id);
                this.emit(PEER_CONNECTED, {peerId: id});
            });
            removed.forEach(id => {
                this.metrics.removePeerConnected(id);
                this.emit(PEER_DISCONNECTED, {peerId: id});
            });
        });

        this.net.awareness.on('change', (changes: any) => this.emit(AWARENESS_UPDATE, {changes}));

        this.enableEncryption(); // Call enableEncryption after reset
     }

    private enableEncryption() {
        console.log("Encryption is being enabled (feature not fully implemented yet).");
        // Future implementation will handle encryption setup for WebRTC
    }
    addBootstrap(url:string) {
        const urlObj = new URL(url);
        if (!urlObj.protocol.startsWith('ws')) {
            console.warn("Invalid bootstrap URL protocol:", urlObj.protocol);
            return;
        }
        if (this.signalingServers.includes(url)) {
            console.warn("Bootstrap URL already added:", url);
            return;
        }

        this.signalingServers.push(url);
        localStorage.setItem('signalingServers', JSON.stringify(this.signalingServers));
        console.log("Bootstrap URL added:", url);
        this.reset(); // Reconnect with new signaling servers
    }

    removeBootstrap(url:string) {
        const index = this.signalingServers.indexOf(url);
        if (index > -1) {
            this.signalingServers.splice(index, 1);
            localStorage.setItem('signalingServers', JSON.stringify(this.signalingServers));
            console.log("Bootstrap URL removed:", url);
            this.reset(); // Reconnect without the removed signaling core
        }
    }

    shareObject(pageId:string) {
        if (this.docsShared.has(pageId)) {
            console.warn(`Document "${pageId}" already shared.`);
            return;
        }
        this.docsShared.add(pageId);
        this.emit(OBJECT_SHARED, { pageId });
    }

    unshareObject(pageId:string) {
        if (!this.docsShared.has(pageId)) {
            console.warn(`Object "${pageId}" not currently shared.`);
            return;
        }
        this.docsShared.delete(pageId);
        this.emit(OBJECT_UNSHARED, { pageId });
    }

    getNetworkStats(): ReturnType<NetworkMetrics['getMetrics']> & { awareness: any[] } {
        const metricsData = this.metrics.getMetrics();
        return {
            messagesSent: metricsData.messagesSent,
            messagesReceived: metricsData.messagesReceived,
            bytesTransferred: metricsData.bytesTransferred,
            peersConnected: this.metrics.getPeersConnected(),
            awareness: Array.from(this.net!.awareness.getStates().values())
                .map(state => ({
                    clientID: state.user?.id,
                    userName: state.user?.name,
                    userColor: state.user?.color,
                    lastActive: state.lastActive,
                    // ... any other relevant awareness info
                }))
        };
    }

    on(event: NetworkEventType, listener: { (value: unknown): void }): void {
        events.on(event, listener); // No prefix needed, using Symbols directly
    }

    emit(event: NetworkEventType,  value:NetworkEventData): void {
        events.emit(event, { ...value, stats: this.getNetworkStats() });
        events.emit(NETWORK_ACTIVITY, { type: event,  ...value, stats: this.getNetworkStats(), timestamp: Date.now() });
    }
}

export default Network;
