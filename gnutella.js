class Message {
    constructor(type, content, sender, ttl = 7) {
        this.id = crypto.randomUUID();
        this.type = type;
        this.content = content;
        this.sender = sender;
        this.ttl = ttl;
        this.timestamp = Date.now();
        this.path = [sender];
    }
}

class GnutellaNode {
    constructor() {
        this.peer = null;
        this.connections = new Map();
        this.seenMessages = new LRUCache(1000); // Message deduplication cache
        this.bootstrapNodes = new Set();
        this.isBootstrap = false;
        this.stats = {
            messagesRouted: 0,
            startTime: Date.now()
        };

        this.initialize().then((f)=>this.startStatsUpdate());
    }

    async initialize() {
        this.peer = new Peer({
            debug: 2,
            config: {
                iceServers: [
                    {urls: 'stun:stun.l.google.com:19302'}
                ]
            }
        });

        this.peer.on('open', (id) => {
            document.getElementById('node-id').textContent = id;
            this.log(`Node initialized with ID: ${id}`);
        });

        this.peer.on('connection', this.handleIncomingConnection.bind(this));
        this.peer.on('error', (err) => this.log(`Error: ${err.message}`));
    }

    handleIncomingConnection(conn) {
        this.log(`Incoming connection from ${conn.peer}`);
        this.setupConnection(conn);
    }

    setupConnection(conn) {
        conn.on('open', () => {
            this.connections.set(conn.peer, conn);
            this.updatePeerCount();

            // If we're a bootstrap node, share our peer list
            if (this.isBootstrap)
                this.sharePeerList(conn);
        });

        conn.on('data', (data) => {
            this.handleMessage(conn.peer, data);
        });

        conn.on('close', () => {
            this.connections.delete(conn.peer);
            this.updatePeerCount();
            this.log(`Connection closed: ${conn.peer}`);
        });
    }

    connectToBootstrap() {
        const bootstrapId = document.getElementById('bootstrap-node').value.trim();
        if (!bootstrapId) return;

        this.log(`Connecting to bootstrap node: ${bootstrapId}`);
        const conn = this.peer.connect(bootstrapId);
        this.setupConnection(conn);
        this.bootstrapNodes.add(bootstrapId);
    }

    becomeBootstrapNode() {
        this.isBootstrap = true;
        this.log('This node is now a bootstrap node');
        document.getElementById('bootstrap-status').textContent = '(Active Bootstrap Node)';
    }

    sharePeerList(conn) {
        const peers = Array.from(this.connections.keys());
        const message = new Message('PEER_LIST', peers, this.peer.id);
        conn.send(message);
    }

    handleMessage(senderId, message) {
        // Check if we've seen this message before
        if (this.seenMessages.get(message.id))
            return;


        // Store in seen messages cache
        this.seenMessages.put(message.id, true);
        this.stats.messagesRouted++;

        // Process message based on type
        switch (message.type) {
            case 'PEER_LIST':
                this.handlePeerList(message.content);
                break;
            case 'BROADCAST':
                this.handleBroadcast(message);
                break;
        }

        this.displayMessage(message);
        this.updateStats();
    }

    handlePeerList(peers) {
        peers.forEach(peerId => {
            if (peerId !== this.peer.id && !this.connections.has(peerId)) {
                const conn = this.peer.connect(peerId);
                this.setupConnection(conn);
            }
        });
    }

    handleBroadcast(message) {
        if (message.ttl <= 0) return;

        // Decrement TTL and add our ID to the path
        message.ttl--;
        message.path.push(this.peer.id);

        // Forward to all peers except those in the path
        this.connections.forEach((conn, peerId) => {
            if (!message.path.includes(peerId)) {
                conn.send(message);
            }
        });
    }

    broadcast() {
        const content = document.getElementById('message-content').value.trim();
        if (!content) return;

        const ttl = parseInt(document.getElementById('ttl').value);

        const message = new Message('BROADCAST', content, this.peer.id, ttl);
        this.handleMessage(this.peer.id, message);
        document.getElementById('message-content').value = '';
    }

    displayMessage(message) {
        const messagesDiv = document.getElementById('messages');
        const messageEl = document.createElement('div');
        messageEl.className = 'message-item';
        messageEl.innerHTML = `
                    <strong>From:</strong> ${message.sender}<br>
                    <strong>Type:</strong> ${message.type}<br>
                    <strong>TTL:</strong> ${message.ttl}<br>
                    <strong>Path:</strong> ${message.path.join(' → ')}<br>
                    <strong>Content:</strong> ${message.content}
                `;
        messagesDiv.insertBefore(messageEl, messagesDiv.firstChild);
    }

    updateStats() {
        document.getElementById('message-count').textContent = this.stats.messagesRouted;
    }

    updatePeerCount() {
        document.getElementById('peer-count').textContent = this.connections.size;
    }

    startStatsUpdate() {
        setInterval(() => {
            const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
            document.getElementById('uptime').textContent = `${uptime}s`;
        }, 1000);
    }

    log(message) {
        const logEl = document.getElementById('log');
        const entry = document.createElement('div');
        entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
        logEl.appendChild(entry);
        logEl.scrollTop = logEl.scrollHeight;
    }
}



// Initialize the node
const node = new GnutellaNode();