/**
 * Interface representing network metrics collected by the Network class
 */
interface NetworkMetrics {
    bytesTransferred: number;
    messagesSent: number;
    messagesReceived: number;
    peersConnected: Set<string>;
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
    private readonly metrics: NetworkMetrics;
    net!: WebrtcProvider;
    private readonly signalingServers: string[];

    constructor(channel:string, db:DB) {
        this.channel = channel;
        this.db = db;

        this.docsShared = new Set();
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesTransferred: 0,
            peersConnected: new Set(),
        };

        this.db.doc.on('update', (update, origin) => {
            this.metrics.bytesTransferred += update.length;
            if (origin === this.net!) {
                this.metrics.messagesSent++;
                this.emit('message-sent', { bytes: update.length });
            } else {
                this.metrics.messagesReceived++;
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
                this.metrics.peersConnected.add(id);
                this.emit('peer-connected', {peerId: id});
            });
            removed.forEach(id => {
                this.metrics.peersConnected.delete(id);
                this.emit('peer-disconnected', {peerId: id});
            });
        });

        this.net.awareness.on('change', (changes: any) => this.emit('awareness-update', {changes}));
    }

    addBootstrap(url:string) {
        if (!this.signalingServers.includes(url)) {
            this.signalingServers.push(url);
            this.reset(); // Reinitialize with the new list
        }
    }

    removeBootstrap(url:string) {
        const index = this.signalingServers.indexOf(url);
        if (index !== -1) {
            this.signalingServers.splice(index, 1);
            this.reset(); // Reinitialize with the updated list
        } else
            throw "Bootstrap not found";
    }

    user() { return this.awareness()?.getLocalState()?.user; }
    awareness() { return this.net?.awareness; }

    shareObject(pageId: string) {
        if (!this.docsShared.has(pageId)) {
            const obj = this.db.get(pageId);
            if (obj && obj.public) {
                this.docsShared.add(pageId);
                obj.shareWith(this.db.userID); // Add current user to sharedWith list
                console.log(`Object ${pageId} is now shared with user ${this.db.userID}.`);
                this.emit('object-shared', { pageId, peerId: this.db.userID });
+                events.emit('public-object-shared', { pageId, peerId: this.db.userID }); // Announce public object sharing
            } else
                console.warn(`Cannot share object ${pageId} as it is not public.`);
        }
    }

    unshareObject(pageId:string) {
        if (this.docsShared.has(pageId)) {
            const obj = this.db.get(pageId);
            if (obj) {
                this.docsShared.delete(pageId);
                obj.unshareWith(this.db.userID); // Remove current user from sharedWith list
                console.log(`Object ${pageId} is now unshared with user ${this.db.userID}.`);
                this.emit('object-unshared', { pageId, peerId: this.db.userID });
            }
        }
    }

    getNetworkStats() {
        return {
            ...this.metrics,
            peersConnected: Array.from(this.metrics.peersConnected),
            connectedPeersCount: this.metrics.peersConnected.size,
            awareness: Array.from(this.net.awareness.getStates().entries()).map(
                ([clientId, state]) => ({
                    clientId,
                    metadata: state.user,
                    lastActive: Date.now(), // Placeholder for actual last active timestamp
                })
            ),
        };
    }

    emit(type: NetworkEventType, data: NetworkEventData) {
        events.emit('networkActivity', {
            detail: {
                type,
                timestamp: Date.now(),
                data: {
                    ...data,
                    stats: this.getNetworkStats(),
                }
            }
        });
    }
}

export default Network;
