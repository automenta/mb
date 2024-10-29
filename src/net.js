// net.js
import { WebrtcProvider } from 'y-webrtc';
import $ from 'jquery';

/**
 * Network Class
 * Manages network interactions, document sharing, and real-time collaboration using Yjs and WebRTC.
 */
class Network {
    constructor(channel, db) {
        this.db = db;

        this.channel = channel;
        this.metrics = {
            messagesSent: 0,
            messagesReceived: 0,
            bytesTransferred: 0,
            peersConnected: new Set(),
        };

        // Initialize WebRTC provider
        this.net = new WebrtcProvider(channel, this.db.doc, {
            signaling: ['ws://localhost:4444'], // Update with your signaling server
            // Specify options if needed
        });

        // Initialize user awareness
        const userId = `User-${Math.floor(Math.random() * 10000)}`;
        this.net.awareness.setLocalStateField('user', {
            id: userId,
            name: 'Anonymous',
            color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        });

        // Set to track shared documents
        this.sharedDocuments = new Set();

        this.setupEventListeners();
    }

    /**
     * Setup event listeners for network events.
     */
    setupEventListeners() {
        // Track peer connections
        this.net.on('peers', ({ added, removed }) => {
            added.forEach((id) => {
                this.metrics.peersConnected.add(id);
                this.emitNetworkEvent('peer-connected', { peerId: id });
            });

            removed.forEach((id) => {
                this.metrics.peersConnected.delete(id);
                this.emitNetworkEvent('peer-disconnected', { peerId: id });
            });
        });

        // Track awareness changes
        this.net.awareness.on('change', (changes) => {
            this.emitNetworkEvent('awareness-update', { changes });
        });

        // Track document updates
        this.db.doc.on('update', (update, origin) => {
            this.metrics.bytesTransferred += update.length;
            if (origin === this.net) {
                this.metrics.messagesSent++;
                this.emitNetworkEvent('message-sent', { bytes: update.length });
            } else {
                this.metrics.messagesReceived++;
                this.emitNetworkEvent('message-received', { bytes: update.length });
            }
        });
    }

    /**
     * Share a document by adding it to the sharedDocuments set and ensuring it's synced over the network.
     * @param {string} pageId - The ID of the page/document to share.
     */
    shareDocument(pageId) {
        if (!this.sharedDocuments.has(pageId)) {
            const page = this.db.page(pageId);
            if (page && page.isPublic) {
                // Assuming that sharing a document involves ensuring its content is synced
                // Since Yjs syncs all shared content in the document, no action is needed here
                // However, if you have separate Y.Docs per page, initialize and connect them here
                this.sharedDocuments.add(pageId);
                console.log(`Document ${pageId} is now shared.`);
                this.emitNetworkEvent('document-shared', { pageId });
            } else {
                console.warn(`Cannot share document ${pageId} as it is not public.`);
            }
        }
    }

    /**
     * Unshare a document by removing it from the sharedDocuments set and stopping its synchronization.
     * @param {string} pageId - The ID of the page/document to unshare.
     */
    unshareDocument(pageId) {
        if (this.sharedDocuments.has(pageId)) {
            // Assuming that unsharing involves removing its content from synchronization
            // Since Yjs syncs all shared content in the document, you might need to remove or isolate it
            // If using separate Y.Docs per page, disconnect the provider here
            this.sharedDocuments.delete(pageId);
            console.log(`Document ${pageId} is now unshared.`);
            this.emitNetworkEvent('document-unshared', { pageId });
        }
    }

    /**
     * Retrieve current network statistics.
     * @returns {Object} The network statistics.
     */
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

    /**
     * Emit a custom network event.
     * @param {string} type - The type of the event.
     * @param {Object} data - The data associated with the event.
     */
    emitNetworkEvent(type, data) {
        const event = new CustomEvent('network-activity', {
            detail: {
                type,
                timestamp: Date.now(),
                data: {
                    ...data,
                    stats: this.getNetworkStats(),
                },
            },
        });
        window.dispatchEvent(event);
    }

    /**
     * Render the network visualization or information in the provided container.
     * @param {HTMLElement} container - The DOM element to render the network.
     */
    renderNetwork(container) {
        const updateStatus = () => {
            $(container).empty(); // Clear previous content
            $(container)
                .append('<h3>Network</h3>')
                .append('<network-visualizer></network-visualizer>');
            // Implement or integrate a network visualizer as needed
        };
        this.net.on('peers', updateStatus);
        updateStatus();
    }

    /**
     * Retrieve the current user information.
     * @returns {Object} The user object.
     */
    user() {
        return this.awareness().getLocalState().user;
    }

    /**
     * Retrieve the awareness instance.
     * @returns {Object} The awareness instance.
     */
    awareness() {
        return this.net.awareness;
    }
}

export default Network;
