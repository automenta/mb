"use strict";

class Message {
    constructor(type, content, sender, ttl = 7) {
        this.id = crypto.randomUUID();
        this.type = type;
        this.content = content;
        this.sender = sender;
        this.ttl = ttl;
        this.timestamp = Date.now();
        this.path = [];
    }

    async sign(privateKey) {
        const data = JSON.stringify({
            type: this.type,
            content: this.content,
            sender: this.sender,
            timestamp: this.timestamp
        });
        this.signature = await crypto.subtle.sign(
            "RSASSA-PKCS1-v1_5",
            privateKey,
            new TextEncoder().encode(data)
        );
    }
}


class PeerList extends BaseEventEmitter {
    constructor() {
        super();
        this.peers = new Map();
        this.bootstrapNodes = new Set();
        this.loadPersistedPeers();
    }

    add(peerId, connection) {
        this.peers.set(peerId, {
            connection,
            lastSeen: Date.now(),
            stats: {
                messagesReceived: 0,
                messagesSent: 0
            }
        });
        this.persistPeers();
        this.emit('peer-added', {peerId});
        this.emit('peers-changed', {count: this.peers.size});
    }

    remove(peerId) {
        if (this.peers.delete(peerId)) {
            this.persistPeers();
            this.emit('peer-removed', {peerId});
            this.emit('peers-changed', {count: this.peers.size});
        }
    }

    broadcast(message, excludePeerIds = []) {
        this.peers.forEach((peer, peerId) => {
            if (!excludePeerIds.includes(peerId)) {
                try {
                    peer.connection.send(message);
                    peer.stats.messagesSent++;
                    peer.lastSeen = Date.now();
                    this.emit('message-sent', {peerId, messageId: message.id});
                } catch (error) {
                    this.emit('broadcast-error', {peerId, error: error.message});
                }
            }
        });
    }


    addBootstrapNode(nodeId) {
        this.bootstrapNodes.add(nodeId);
        this.persistPeers();
        this.emit('bootstrap-added', {nodeId});
    }

    getConnections() {
    return new Map([...this.peers.entries()].map(([id, data]) => [id, data.connection]));
    }

    getPeerIds() {
        return Array.from(this.peers.keys());
    }

    updatePeerStats(peerId, type) {
        const peer = this.peers.get(peerId);
        if (peer) {
            if (type === 'received') peer.stats.messagesReceived++;
            if (type === 'sent') peer.stats.messagesSent++;
            peer.lastSeen = Date.now();
        }
    }

    loadPersistedPeers() {
        try {
            const persisted = JSON.parse(localStorage.getItem('p2pnode-peers') || '{}');
            this.bootstrapNodes = new Set(persisted.bootstrapNodes || []);
        } catch (error) {
            console.error('Error loading persisted peers:', error);
        }
    }

    persistPeers() {
        try {
            localStorage.setItem('p2pnode-peers', JSON.stringify({
                bootstrapNodes: Array.from(this.bootstrapNodes)
            }));
        } catch (error) {
            console.error('Error persisting peers:', error);
        }
    }

    has(peerId) {
        return this.peers.has(peerId);
    }
}

class Messages extends BaseEventEmitter {
    constructor(maxCacheSize = 1000) {
        super();
        this.seenMessages = new LRUCache(maxCacheSize);
        this.stats = {
            messagesRouted: 0,
            messagesByType: new Map()
        };
    }

    createMessage(type, content, sender, ttl = 7) {
        return new Message(type, content, sender, ttl);
        // return {
        //     id: crypto.randomUUID(),
        //     type,
        //     content,
        //     sender,
        //     ttl,
        //     timestamp: Date.now(),
        //     path: []
        // };
    }

    hasSeenMessage(messageId) {
        return this.seenMessages.get(messageId) !== null;
    }

    trackMessage(message) {
        if (this.hasSeenMessage(message.id)) return false;

        this.seenMessages.put(message.id, true);
        this.stats.messagesRouted++;

        const type = message.type;
        const typeCount = this.stats.messagesByType.get(type) || 0;
        this.stats.messagesByType.set(type, typeCount + 1);

        return true;
    }

    getStats() {
        return {
            total: this.stats.messagesRouted,
            byType: Object.fromEntries(this.stats.messagesByType)
        };
    }

}

// networkStats.js
class NetStats extends BaseEventEmitter {
    constructor() {
        super();
        this.stats = {
            startTime: Date.now(),
            messagesRouted: 0,
            bytesTransferred: 0,
            peakPeerCount: 0,
            currentPeerCount: 0
        };
    }

    updateMessageCount(count) {
        this.stats.messagesRouted = count;
        this.emit('stats-updated', {field: 'messagesRouted', value: count});
    }

    updatePeerCount(count) {
        this.stats.currentPeerCount = count;
        this.stats.peakPeerCount = Math.max(this.stats.peakPeerCount, count);
        this.emit('stats-updated', {field: 'currentPeerCount', value: count});
    }

    addBytesTransferred(bytes) {
        this.stats.bytesTransferred += bytes;
        this.emit('stats-updated', {field: 'bytesTransferred', value: this.stats.bytesTransferred});
    }

    getUptime() {
        return Math.floor((Date.now() - this.stats.startTime) / 1000);
    }

}

class P2PNode extends BaseEventEmitter {
    constructor() {
        super();
        this.me = new UserProfile();
        this.peers = new PeerList();
        this.messages = new Messages();
        this.netstats = new NetStats();
        this.isBootstrap = false;

        this.setupEventListeners();
        this.initialize();
    }

    initialize() {
        this.node = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    {urls: 'stun:stun.l.google.com:19302'}
                ]
            }
        });

        this.node.on('open', id => {
            this.me.setPeerId(id);
            this.emit('node-id-changed', {id});
            this.emit('log', {message: `Node initialized with ID: ${id}`});
        });

        this.node.on('connection', this.handleIncomingConnection.bind(this));
        this.node.on('error', err => this.emit('log', {message: `Error: ${err.message}`}));

        setInterval(() =>
            this.emit('network-stats-updated', {
                peerCount: this.peers.peers.size,
                messagesRouted: this.messages.stats.messagesRouted,
                uptime: this.netstats.getUptime()
            }), 1000);
    }

    handleIncomingConnection(conn) {
        this.emit('log', {message: `Incoming connection from ${conn.peer}`});
        this.setupConnection(conn);
    }

    setupConnection(c) {
        c.on('open', () => {
            // Store connection directly in peers map
            this.peers.add(c.peer, c);
            this.emit('log', {message: `Connection established with peer: ${c.peer}`});

            if (this.isBootstrap)
                this.sharePeerList(c);
        });

        c.on('data', (data) => this.handleMessage(c.peer, data));

        c.on('close', () => {
            this.peers.remove(c.peer);
            this.emit('log', {message: `Connection closed with peer: ${c.peer}`});
        });

        c.on('error', (err) => {
            this.emit('log', {message: `Connection error with peer ${c.peer}: ${err.message}`});
            this.peers.remove(c.peer);
        });
    }

    connectToBootstrap(bootstrapId) {
        if (!bootstrapId || bootstrapId === this.node.id) return;

        this.emit('log', {message: `Connecting to bootstrap node: ${bootstrapId}`});
        this.peers.addBootstrapNode(bootstrapId);
        this.setupConnection(this.node.connect(bootstrapId));
    }

    sharePeerList(conn) {
        conn.send(this.messages.createMessage(
            'PEER_LIST',
            Array.from(this.peers.keys()),
            this.node.id
        ));
    }

    handlePeerList(peers) {
        peers.forEach(peerId => {
            if (peerId !== this.node.id && !this.peers.has(peerId))
                this.setupConnection(this.node.connect(peerId));
        });
    }

    broadcast(content, ttl) {
        if (!content) return;

        const m = this.messages.createMessage(
            'BROADCAST',
            content,
            this.node.id,
            ttl
        );

        // Add our ID to the path
        m.path = [this.node.id];

        this.messages.trackMessage(m);

        this.peers.broadcast(m);
    }

    handleBroadcast(m) {
        if (m.ttl <= 0) return;

        m.ttl--;
        m.path.push(this.node.id);

        // Forward to all peers except those in the path
        this.peers.peers.forEach((peer, peerId) => {
            if (!m.path.includes(peerId))
                peer.connection.send(m);
        });
    }

    sendResponse(m, type) {
        const responseMessage = new Message(type, m.timestamp, this.node.id);
        const peer = this.peers.peers.get(m.sender);
        peer?.connection.send(responseMessage);
    }

    setupEventListeners() {
        // Forward relevant events from components
        this.forwardEvent(this.me, 'profile-updated');
        this.forwardEvent(this.peers, 'peer-added', 'peer-removed', 'peers-changed', 'message-sent', 'broadcast-error', 'bootstrap-added');
        this.forwardEvent(this.netstats, 'stats-updated');
    }

    forwardEvent(source, ...eventNames) {
        eventNames.forEach(eventName =>
            source.addEventListener(eventName, event =>
                this.emit(event.type, event.detail)
            ));
    }

    becomeBootstrapNode() {
        this.isBootstrap = true;
        this.emit('log', {message: 'This node is now a bootstrap node'});
        this.emit('bootstrap-status-changed', {isBootstrap: true});
    }

    handleMessage(senderId, message) {
        try {
            if (!this.messages.trackMessage(message)) return;

            this.peers.updatePeerStats(senderId, 'received');

            const handlers = {
                PEER_LIST: () => this.handlePeerList(message.content),
                BROADCAST: () => this.handleBroadcast(message),
                PING: () => this.sendResponse(message, 'PONG'),
                PONG: () => this.handlePong(message),
                KEEP_ALIVE: () => this.sendResponse(message, 'KEEP_ALIVE'),
                UPDATE: () => this.handleUpdate(message)
                // SEARCH_REQUEST: () => this.handleSearchRequest(message),
                // SEARCH_RESULT: () => this.handleSearchResult(message),
                // FILE_REQUEST: () => this.handleFileRequest(message),
                // FILE_TRANSFER: () => this.handleFileTransfer(message),
                // NODE_INFO: () => this.handleNodeInfo(message),
                // DISCONNECT: () => this.handleDisconnect(message),
            };


            const handler = handlers[message.type];
            if (handler)
                handler(message);
            else
                this.emit('log', {message: `Unknown message type: ${message.type}`});


            this.emit('message-received', {message});
        } catch (error) {
            this.emit('log', {message: `Error handling message: ${error.message}`, error});
            // Optionally, re-throw the error to halt execution or handle it at a higher level throw error;
        }
    }



    handleSearchRequest(message) {
        this.emit('log', {message: 'Search request received'});
    }

    handleSearchResult(message) {
        this.emit('log', {message: 'Search result received'});
    }

    handleFileRequest(message) {
        this.emit('log', {message: 'File request received'});
    }

    handleFileTransfer(message) {
        this.emit('log', {message: 'File transfer received'});
    }

    handleNodeInfo(message) {
        this.emit('log', {message: 'Node info received'});
    }


    handlePing(message) {
        this.emit('log', {message: 'Ping received'});
    }

    handlePong(message) {
        this.emit('log', {message: 'Pong received'});
    }

    handleKeepAlive(message) {
        this.emit('log', {message: 'KeepAlive received'});
    }

    handleDisconnect(message) {
        this.emit('log', {message: 'Disconnect notification received'});
    }


    async resolveConflict(local, remote) {
        // If items have different modification histories, keep the one with more changes
        const localHistory = local.modificationCount || 0;
        const remoteHistory = remote.modificationCount || 0;

        if (localHistory !== remoteHistory) {
            return localHistory > remoteHistory ? local : remote;
        }

        // If equal histories, use timestamp-based resolution
        return local.updated > remote.updated ? local : remote;
    }
}
