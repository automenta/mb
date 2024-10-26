import {WebrtcProvider} from 'y-webrtc';
import {IndexeddbPersistence} from 'y-indexeddb';
import $ from "jquery";

class Network {
    constructor(channel, db) {
        this.db = db;

        this.channel = channel;
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesTransferred: 0,
            peersConnected: new Set()
        };


        //https://github.com/yjs/y-webrtc
        this.net = new WebrtcProvider(channel, this.db.doc, {
            signaling: ['ws://localhost:4444']
        });

        const userId = `User-${Math.floor(Math.random() * 10000)}`;
        this.net.awareness.setLocalStateField('user', {
            id: userId,
            name: 'Anonymous',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16)
        });
        this.setupEventListeners();
    }


    setupEventListeners() {
        this.net.on('peers', ({added, removed}) => {
            added.forEach(id => {
                this.metrics.peersConnected.add(id);
                this.emitNetworkEvent('peer-connected', {peerId: id});
            });

            removed.forEach(id => {
                this.metrics.peersConnected.delete(id);
                this.emitNetworkEvent('peer-disconnected', {peerId: id});
            });
        });

        this.net.awareness.on('change', changes => {
            this.emitNetworkEvent('awareness-update', {changes});
        });

        this.db.doc.on('update', (update, origin) => {
            this.metrics.bytesTransferred += update.length;
            if (origin === this.net) {
                this.metrics.messagesSent++;
                this.emitNetworkEvent('message-sent', {bytes: update.length});
            } else {
                this.metrics.messagesReceived++;
                this.emitNetworkEvent('message-received', {bytes: update.length});
            }
        });

    }

    getNetworkStats() {
        return {
            ...this.metrics,
            peersConnected: Array.from(this.metrics.peersConnected),
            connectedPeersCount: this.metrics.peersConnected.size,
            awareness: Array.from(this.net.awareness.getStates().entries())
                .map(([clientId, state]) => ({
                    clientId,
                    metadata: state.user,
                    lastActive: Date.now()
                }))
        };
    }

    emitNetworkEvent(type, data) {
        const event = new CustomEvent('network-activity', {
            detail: {
                type,
                timestamp: Date.now(),
                data: {
                    ...data,
                    stats: this.getNetworkStats()
                }
            }
        });
        window.dispatchEvent(event);
    }


    renderNetwork(container) {
        const updateStatus = () =>
            $(container)
                .append('<h3>Network</h3>')
                .append('<network-visualizer></network-visualizer>');
        this.net.on('peers', updateStatus);
        updateStatus();
    }

    user() {
        return this.awareness().getLocalState().user;
    }

    awareness() {
        return this.net.awareness;
    }
}

export default Network;