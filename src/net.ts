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


/**
 * Union type of all possible network event types
 */
type NetworkEventType =
    | 'message-sent'
    | 'message-received'
    | 'peer-connected'
    | 'peer-disconnected'
    | 'awareness-update'
    | 'object-shared'
    | 'object-unshared';


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
                this.emit('message-sent', { bytes: update.length });
            } else {
                this.metrics.incrementMessagesReceived();
                this.emit('message-received', { bytes: update.length });
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
        if (this.net!)
            this.net!.destroy();

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
                this.emit('peer-connected', {peerId: id});
            });
            removed.forEach(id => {
                this.metrics.removePeerConnected(id);
                this.emit('peer-disconnected', {peerId: id});
            });
        });

        this.net.awareness.on('change', (changes: any) => this.emit('awareness-update', {changes}));

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
            this.reset(); // Reconnect without the removed signaling server
        }
    }

    shareObject(pageId:string) {
        if (this.docsShared.has(pageId)) {
            console.warn(`Document "${pageId}" already shared.`);
            return;
        }
        this.docsShared.add(pageId);
        this.emit('object-shared', { pageId });
    }

    unshareObject(pageId:string) {
        if (!this.docsShared.has(pageId)) {
            console.warn(`Document "${pageId}" not currently shared.`);
            return;
        }
        this.docsShared.delete(pageId);
        this.emit('object-unshared', { pageId });
    }

    getNetworkStats() {
        const metricsData = this.metrics.getMetrics();
        return {
            messagesSent: metricsData.messagesSent,
            messagesReceived: metricsData.messagesReceived,
            bytesTransferred: metricsData.bytesTransferred,
            peersConnected: Array.from(this.metrics.getPeersConnected()), // Use getter
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


    on(event: NetworkEventType, listener: ( NetworkEventData) => void): void {
        events.on(`network-${event}`, listener);
    }

    emit(event: NetworkEventType,  NetworkEventData): void {
        events.emit(`network-${event}`, { ...NetworkEventData, stats: this.getNetworkStats() });
        events.emit('networkActivity', { type: event,  ...NetworkEventData, stats: this.getNetworkStats(), timestamp: Date.now() });
    }
}

export default Network;
