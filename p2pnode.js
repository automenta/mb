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
}


class PeerList extends EventTarget {
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
        this.emit('peer-added', { peerId });
        this.emit('peers-changed', { count: this.peers.size });
    }

    remove(peerId) {
        if (this.peers.delete(peerId)) {
            this.persistPeers();
            this.emit('peer-removed', { peerId });
            this.emit('peers-changed', { count: this.peers.size });
        }
    }

    broadcast(message, excludePeerIds = []) {
        this.peers.forEach((peer, peerId) => {
            if (!excludePeerIds.includes(peerId)) {
                try {
                    peer.connection.send(message);
                    peer.stats.messagesSent++;
                    peer.lastSeen = Date.now();
                    this.emit('message-sent', { peerId, messageId: message.id });
                } catch (error) {
                    this.emit('broadcast-error', { peerId, error: error.message });
                }
            }
        });
    }


    addBootstrapNode(nodeId) {
        this.bootstrapNodes.add(nodeId);
        this.persistPeers();
        this.emit('bootstrap-added', { nodeId });
    }

    getConnections() {
        return new Map([...this.peers].map(([id, data]) => [id, data.connection]));
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

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }
}

class Messages extends EventTarget {
    constructor(maxCacheSize = 1000) {
        super();
        this.seenMessages = new LRUCache(maxCacheSize);
        this.stats = {
            messagesRouted: 0,
            messagesByType: new Map()
        };
    }

    createMessage(type, content, sender, ttl = 7) {
        return {
            id: crypto.randomUUID(),
            type,
            content,
            sender,
            ttl,
            timestamp: Date.now(),
            path: []
        };
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

        this.emit('message-tracked', {
            id: message.id,
            type: type,
            stats: this.getStats()
        });

        return true;
    }

    getStats() {
        return {
            total: this.stats.messagesRouted,
            byType: Object.fromEntries(this.stats.messagesByType)
        };
    }

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }
}

// networkStats.js
class NetStats extends EventTarget {
    constructor() {
        super();
        this.stats = {
            startTime: Date.now(),
            messagesRouted: 0,
            bytesTransferred: 0,
            peakPeerCount: 0,
            currentPeerCount: 0
        };
        this.startStatsUpdate();
    }

    updateMessageCount(count) {
        this.stats.messagesRouted = count;
        this.emit('stats-updated', { field: 'messagesRouted', value: count });
    }

    updatePeerCount(count) {
        this.stats.currentPeerCount = count;
        this.stats.peakPeerCount = Math.max(this.stats.peakPeerCount, count);
        this.emit('stats-updated', { field: 'peerCount', value: count });
    }

    addBytesTransferred(bytes) {
        this.stats.bytesTransferred += bytes;
        this.emit('stats-updated', { field: 'bytesTransferred', value: this.stats.bytesTransferred });
    }

    getUptime() {
        return Math.floor((Date.now() - this.stats.startTime) / 1000);
    }

    getStats() {
        return {
            ...this.stats,
            uptime: this.getUptime()
        };
    }

    startStatsUpdate() {
        // setInterval(() => {
        //     this.emit('uptime-changed', { seconds: this.getUptime() });
        // }, 1000);
    }

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }
}

class P2PNode extends EventTarget {
    constructor() {
        super();
        this.me = new UserProfile();
        this.peers = new PeerList();
        this.messages = new Messages();
        this.netstats = new NetStats();
        this.isBootstrap = false;
        this.connections = new Map(); // Added this back - critical for tracking active connections

        this.setupEventListeners();
        this.initialize();
    }

    initialize() {
        this.node = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            }
        });

        this.node.on('open', (id) => {
            this.me.setPeerId(id);
            this.emit('node-id-changed', { id });
            this.emit('log', { message: `Node initialized with ID: ${id}` });
        });

        this.node.on('connection', this.handleIncomingConnection.bind(this));
        this.node.on('error', (err) => this.emit('log', {message: `Error: ${err.message}`}));

        setInterval(() =>
            this.emit('network-stats-updated', {
                peerCount: this.connections.size, // Changed to use connections.size
                messagesRouted: this.messages.stats.messagesRouted,
                uptime: this.netstats.getUptime()
            }), 1000);
    }

    handleIncomingConnection(conn) {
        this.emit('log', { message: `Incoming connection from ${conn.peer}` });
        this.setupConnection(conn);
    }

    setupConnection(conn) {
        const handleConnectionEvent = (event) => {
            switch (event.type) {
                case 'open':
                    this.connections.set(conn.peer, conn); // Store in connections Map
                    this.peers.add(conn.peer, conn);
                    this.emit('log', { message: `Connection established with peer: ${conn.peer}` });

                    if (this.isBootstrap)
                        this.sharePeerList(conn);
                    break;
                case 'data':
                    this.handleMessage(conn.peer, event.data);
                    break;
                case 'close':
                    this.connections.delete(conn.peer); // Remove from connections Map
                    this.peers.remove(conn.peer);
                    this.emit('log', { message: `Connection closed with peer: ${conn.peer}` });
                    break;
                case 'error':
                    this.emit('log', { message: `Connection error with peer ${conn.peer}: ${err.message}` });
                    this.connections.delete(conn.peer); // Remove from connections Map
                    this.peers.remove(conn.peer);
                    break;
            }
        };

        conn.on('open', handleConnectionEvent);
        conn.on('data', handleConnectionEvent);
        conn.on('close', handleConnectionEvent);
        conn.on('error', handleConnectionEvent);
    }

    connectToBootstrap(bootstrapId) {
        if (!bootstrapId || bootstrapId === this.node.id) return;

        this.emit('log', { message: `Connecting to bootstrap node: ${bootstrapId}` });
        this.peers.addBootstrapNode(bootstrapId);
        this.setupConnection(this.node.connect(bootstrapId));
    }

    sharePeerList(conn) {
        conn.send(this.messages.createMessage(
            'PEER_LIST',
            Array.from(this.connections.keys()),
            this.node.id
        ));
    }

    handlePeerList(peers) {
        peers.forEach(peerId => {
            if (peerId !== this.node.id && !this.connections.has(peerId))
                this.setupConnection(this.node.connect(peerId));
        });
    }

    broadcast(content, ttl) {
        if (!content) return;

        const message = this.messages.createMessage(
            'BROADCAST',
            content,
            this.node.id,
            ttl
        );

        // Add our ID to the path
        message.path = [this.node.id];

        // Forward to all peers
        this.connections.forEach((conn, peerId) => conn.send(message));
    }

    handleBroadcast(message) {
        if (message.ttl <= 0) return;

        message.ttl--;
        message.path.push(this.node.id);

        // Forward to all peers except those in the path
        this.connections.forEach((conn, peerId) => {
            if (!message.path.includes(peerId))
                conn.send(message);
        });
    }

    sendResponse(message, type) {
        const responseMessage = new Message(type, message.timestamp, this.node.id);
        this.connections.forEach((conn, peerId) => {
            if (peerId === message.sender) {
                conn.send(responseMessage);
            }
        });
    }

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    setupEventListeners() {
        // Forward relevant events from components
        this.forwardEvent(this.me, 'profile-updated');
        this.forwardEvent(this.peers, 'peer-added', 'peer-removed', 'peers-changed', 'message-sent', 'broadcast-error', 'bootstrap-added');
        this.forwardEvent(this.messages, 'message-tracked');
        this.forwardEvent(this.netstats, 'stats-updated');
    }

    forwardEvent(source, ...eventNames) {
        eventNames.forEach(eventName => {
            source.addEventListener(eventName, (event) =>
                this.emit(event.type, event.detail)
            );
        });
    }

    becomeBootstrapNode() {
        this.isBootstrap = true;
        this.emit('log', { message: 'This node is now a bootstrap node' });
        this.emit('bootstrap-status-changed', { isBootstrap: true });
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
            KEEP_ALIVE: () => this.sendResponse(message, 'KEEP_ALIVE')
        };

        // switch (message.type) {
        //     case 'SEARCH_REQUEST':
        //         this.handleSearchRequest(message);
        //         break;
        //     case 'SEARCH_RESULT':
        //         this.handleSearchResult(message);
        //         break;
        //     case 'FILE_REQUEST':
        //         this.handleFileRequest(message);
        //         break;
        //     case 'FILE_TRANSFER':
        //         this.handleFileTransfer(message);
        //         break;
        //     case 'NODE_INFO':
        //         this.handleNodeInfo(message);
        //         break;
        //     case 'KEEP_ALIVE':
        //         this.handleKeepAlive(message);
        //         break;
        //     case 'DISCONNECT':
        //         this.handleDisconnect(message);
        //         break;
        // }

        const handler = handlers[message.type];
        if (handler) {
            handler();
        } else {
            this.emit('log', { message: `Unknown message type: ${message.type}` });
        }

        this.emit('message-received', { message });
        } catch (error) {
            this.emit('log', { message: `Error handling message: ${error.message}`, error });
            // Optionally, re-throw the error to halt execution or handle it at a higher level
            // throw error; 
        }
    }



    handleSearchRequest(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Search request received' });
    }

    handleSearchResult(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Search result received' });
    }

    handleFileRequest(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'File request received' });
    }

    handleFileTransfer(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'File transfer received' });
    }

    handleNodeInfo(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Node info received' });
    }


    handlePing(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Pong received' });
    }

    handlePong(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Pong received' });
    }

    handleKeepAlive(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'KeepAlive received' });
    }

    handleDisconnect(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Disconnect notification received' });
    }

    startStatsUpdate() {
        setInterval(() => {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            this.emit('uptime-changed', { seconds: uptime });
        }, 1000);
    }
}
