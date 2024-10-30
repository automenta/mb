"use strict";
import {WebrtcProvider} from 'y-webrtc';

class Network {

    constructor(channel, db) {
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
            if (origin === this.net) {
                this.metrics.messagesSent++;
                this.emit('message-sent', { bytes: update.length });
            } else {
                this.metrics.messagesReceived++;
                this.emit('message-received', { bytes: update.length });
            }
        });

        //TODO load persisted signaling servers
        this.signalingServers = ['ws://localhost:4444']; // Default server

        this.reset();
    }

    reset() {
        if (this.net)
            this.net.destroy();

        this.net = new WebrtcProvider(this.channel, this.db.doc, {
            signaling: this.signalingServers,
        });
        this.net.awareness.setLocalStateField('user', {
            id: `User-${Math.floor(Math.random() * 10000)}`,
            name: 'Anonymous',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        });
        this.setupEventListeners();
    }

    addBootstrap(url) {
        if (!this.signalingServers.includes(url)) {
            this.signalingServers.push(url);
            this.reset(); // Reinitialize with the new list
        }
    }

    removeBootstrap(url) {
        const index = this.signalingServers.indexOf(url);
        if (index !== -1) {
            this.signalingServers.splice(index, 1);
            this.reset(); // Reinitialize with the updated list
        } else
            throw "Bootstrap not found";
    }

    setupEventListeners() {
        // Track peer connections
        this.net.on('peers', ({ added, removed }) => {
            added.forEach(id => {
                this.metrics.peersConnected.add(id);
                this.emit('peer-connected', { peerId: id });
            });

            removed.forEach(id => {
                this.metrics.peersConnected.delete(id);
                this.emit('peer-disconnected', { peerId: id });
            });
        });

        // Track awareness changes
        this.net.awareness.on('change', changes => {
            this.emit('awareness-update', { changes });
        });


    }

    user() { return this.awareness().getLocalState().user; }
    awareness() { return this.net.awareness; }

    shareDocument(pageId) {
        if (!this.docsShared.has(pageId)) {
            const page = this.db.page(pageId);
            if (page && page.isPublic) {
                // Assuming that sharing a document involves ensuring its content is synced
                // Since Yjs syncs all shared content in the document, no action is needed here
                // However, if you have separate Y.Docs per page, initialize and connect them here
                this.docsShared.add(pageId);
                console.log(`Document ${pageId} is now shared.`);
                this.emit('document-shared', { pageId });
            } else
                console.warn(`Cannot share document ${pageId} as it is not public.`);
        }
    }

    unshareDocument(pageId) {
        if (this.docsShared.has(pageId)) {
            // Assuming that unsharing involves removing its content from synchronization
            // Since Yjs syncs all shared content in the document, you might need to remove or isolate it
            // If using separate Y.Docs per page, disconnect the provider here
            this.docsShared.delete(pageId);
            console.log(`Document ${pageId} is now unshared.`);
            this.emit('document-unshared', { pageId });
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

    emit(type, data) {
        window.dispatchEvent(new CustomEvent('network-activity', {
            detail: {
                type,
                timestamp: Date.now(),
                data: {
                    ...data,
                    stats: this.getNetworkStats(),
                }
            }
        }));
    }
}

export default Network;
