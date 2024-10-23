class Message {
    constructor(type, content, sender, ttl = 7) {
        this.id = crypto.randomUUID();
        this.type = type;
        this.content = content;
        this.sender = sender;
        this.ttl = ttl;
        this.timestamp = Date.now();
        this.path = []; // Initialize path with only the sender
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

// Refactored p2pnodeNode class
class P2PNode extends EventTarget {
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

    async initialize() {
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
        this.node.on('error', (err) => {
            this.emit('log', { message: `Error: ${err.message}` });
        });
    }

    emit(name, detail) {
        this.dispatchEvent(new CustomEvent(name, { detail }));
    }

    setupEventListeners() {
        // Forward relevant events from components
        [this.me, this.peers, this.messages, this.netstats].forEach(component => {
            component.addEventListener('*', (event) => {
                this.emit(event.type, event.detail);
            });
        });
    }

    handleIncomingConnection(conn) {
        this.emit('log', { message: `Incoming connection from ${conn.peer}` });
        this.setupConnection(conn);
    }

    setupConnection(conn) {
        conn.on('open', () => {
            this.peers.add(conn.peer, conn);
            if (this.isBootstrap)
                this.sharePeerList(conn);
        });
        conn.on('data', (data) => { this.handleMessage(conn.peer, data); });
        conn.on('close', () => { this.peers.remove(conn.peer); });
    }

    connectToBootstrap(bootstrapId) {
        if (!bootstrapId) return;

        this.emit('log', { message: `Connecting to bootstrap node: ${bootstrapId}` });
        this.peers.addBootstrapNode(bootstrapId);
        this.setupConnection(this.node.connect(bootstrapId));
    }

    becomeBootstrapNode() {
        this.isBootstrap = true;
        this.emit('log', { message: 'This node is now a bootstrap node' });
        this.emit('bootstrap-status-changed', { isBootstrap: true });
    }

    handleMessage(senderId, message) {
        if (!this.messages.trackMessage(message)) return;

        this.peers.updatePeerStats(senderId, 'received');

        const handlers = {
            PEER_LIST: () => this.handlePeerList(message.content),
            BROADCAST: () => this.handleBroadcast(message),
            PING: () => this.handlePing(message),
            PONG: () => this.handlePong(message)
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
        if (handler)
            handler();
        else
            this.emit('log', { message: `Unknown message type: ${message.type}` });

        this.emit('message-received', { message });
    }

    handlePeerList(peers) {
        peers.forEach(peerId => {
            if (peerId !== this.node.id && !this.connections.has(peerId)) {
                this.setupConnection(this.node.connect(peerId));
            }
        });
    }

    handleBroadcast(message) {
        if (message.ttl <= 0) return;

        message.ttl--;
        message.path.push(this.node.id);

        this.peers.broadcast(message);
    }

    broadcast(content, ttl) {
        if (!content) return;

        const message = this.messages.createMessage(
            'BROADCAST',
            content,
            this.me.data.peerId,
            ttl
        );

        this.handleBroadcast(message);
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
        const pongMessage = new Message('PONG', message.timestamp, this.node.id);
        this.connections.forEach((conn, peerId) => {
            if (peerId === message.sender) {
                conn.send(pongMessage);
            }
        });
    }

    handlePong(message) {
        // Implementation preserved for future use
        this.emit('log', { message: 'Pong received' });
    }

    handleKeepAlive(message) {
        const keepAliveMessage = new Message('KEEP_ALIVE', message.timestamp, this.node.id);
        this.connections.forEach((conn, peerId) => {
            if (peerId === message.sender) {
                conn.send(keepAliveMessage);
            }
        });
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
