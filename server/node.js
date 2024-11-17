const WebSocket = await import('ws');
import {createServer} from 'http';
import {EventEmitter} from 'events';
import express from 'express';
import cors from 'cors';

const withTimestamp = data => ({ ...data, timestamp: Date.now() });
const safeJSON = str => { try { return JSON.parse(str); } catch { return null; } };
const debounce = (fn, ms) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), ms);
    };
};

class GossipProtocol extends EventEmitter {
    constructor(address) {
        super();
        Object.assign(this, {
            address,
            peers: new Map(),
            known: new Set([address]),
            state: new Map(),
            lastSeen: new Map(),
            retryTimeouts: new Map(),
            maxRetries: 3,
            retryDelay: 5000,
            syncInterval: 5000,
            staleTimeout: 30000
        });

        this.sync = debounce(this.sync.bind(this), 1000);
        this.pulse = setInterval(() => this.sync(), this.syncInterval);
    }

    connect(addr) {
        if (addr === this.address || this.peers.has(addr)) return;

        const retries = this.retryTimeouts.get(addr)?.retries || 0;
        if (retries >= this.maxRetries) {
            this.known.delete(addr);
            this.retryTimeouts.delete(addr);
            return;
        }

        const ws = new WebSocket(addr);
        const timeout = setTimeout(() => {
            if (ws.readyState !== WebSocket.OPEN) {
                ws.terminate();
                this.scheduleRetry(addr, retries + 1);
            }
        }, this.retryDelay);

        ws.once('open', () => {
            clearTimeout(timeout);
            this.retryTimeouts.delete(addr);
            this.bindWebSocket(ws, addr);
        });

        ws.once('error', () => {
            clearTimeout(timeout);
            this.scheduleRetry(addr, retries + 1);
        });
    }

    scheduleRetry(addr, retries) {
        const timeout = setTimeout(() => {
            this.retryTimeouts.delete(addr);
            this.connect(addr);
        }, this.retryDelay * Math.pow(2, retries));

        this.retryTimeouts.set(addr, { timeout, retries });
    }

    bindWebSocket(ws, addr) {
        this.peers.set(addr, ws);
        this.known.add(addr);
        this.lastSeen.set(addr, Date.now());

        const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.ping(() => this.lastSeen.set(addr, Date.now()));
            }
        }, this.syncInterval);

        ws.on('message', data => {
            const msg = safeJSON(data);
            msg?.type === 'state' && this.mergeState(addr, msg.data);
        });

        ws.on('close', () => {
            clearInterval(pingInterval);
            this.removePeer(addr);
        });

        ws.on('error', () => {
            clearInterval(pingInterval);
            this.removePeer(addr);
        });

        this.broadcast({ type: 'state', data: this.getState() });
    }

    mergeState(peer, data) {
        this.lastSeen.set(peer, Date.now());

        Object.entries(data.state || {}).forEach(([key, value]) => {
            if (!this.state.has(key) || value.timestamp > this.state.get(key).timestamp) {
                this.state.set(key, value);
            }
        });

        (data.known || []).forEach(addr =>
            !this.known.has(addr) && this.connect(addr));
    }

    sync() {
        const now = Date.now();

        [...this.lastSeen.entries()]
            .filter(([_, time]) => now - time > this.staleTimeout)
            .forEach(([peer]) => this.removePeer(peer));

        if (this.peers.size > 0) {
            this.broadcast({
                type: 'state',
                data: { ...this.getState(), known: [...this.known] }
            });
        }
    }

    removePeer(addr) {
        const ws = this.peers.get(addr);
        if (ws) {
            ws.terminate();
            this.peers.delete(addr);
            this.lastSeen.delete(addr);
            this.emit('peer-disconnected', addr);
            this.connect(addr); // Try to reconnect immediately
        }
    }

    broadcast(msg) {
        const payload = JSON.stringify(withTimestamp(msg));
        this.peers.forEach((peer, addr) => {
            if (peer.readyState === WebSocket.OPEN) {
                peer.send(payload, err => {
                    if (err) this.removePeer(addr);
                });
            }
        });
    }

    update(key, value) {
        this.state.set(key, withTimestamp({ value }));
        this.sync();
    }

    getState() {
        return {
            peers: [...this.peers.keys()],
            known: [...this.known],
            state: Object.fromEntries(this.state)
        };
    }

    destroy() {
        clearInterval(this.pulse);
        this.retryTimeouts.forEach(({ timeout }) => clearTimeout(timeout));
        this.peers.forEach((ws) => ws.terminate());
        this.peers.clear();
        this.known.clear();
        this.state.clear();
        this.lastSeen.clear();
        this.retryTimeouts.clear();
    }
}

class SignalingServer extends EventEmitter {
    constructor(port = 4444, address = `ws://localhost:${port}`) {
        super();
        Object.assign(this, {
            port,
            topics: new Map(),
            clients: new Map(),
            metadata: new Map(),
            metrics: {connections: 0, messages: 0, bytes: 0, start: Date.now()},
            gossip: new GossipProtocol(address),
            heartbeatInterval: 30000,
            cleanupInterval: 60000
        });

        this.initServer();
        this.startMaintenance();
    }

    initServer() {
        const app = express()
            .use(cors())
            .use(express.json())
            .use((req, res, next) => {
                res.setTimeout(5000, () => res.status(504).end());
                next();
            });

        const server = createServer(app);
        this.wss = new WebSocket.WebSocketServer({
            server,
            clientTracking: true,
            maxPayload: 50 * 1024, // 50KB max message size
            perMessageDeflate: true
        });

        this.setupEndpoints(app);
        this.setupWebSocket();

        server.listen(this.port, () => this.emit('ready'));

        this.statsInterval = setInterval(() => {
            const stats = this.getStats();
            this.emit('stats', stats);
            this.gossip.update('stats', stats);
        }, 5000);
    }

    startMaintenance() {
        // Regular cleanup of stale connections
        this.maintenanceInterval = setInterval(() => {
            const now = Date.now();
            this.clients.forEach((ws, clientId) => {
                if (now - ws.lastSeen > this.heartbeatInterval * 2) {
                    this.disconnect(clientId);
                }
            });

            // Clean empty rooms
            this.topics.forEach((clients, channel) => {
                if (clients.size === 0) this.topics.delete(channel);
            });
        }, this.cleanupInterval);
    }

    setupEndpoints(app) {
        const handlers = {
            '/status': () => ({
                status: 'running',
                uptime: Date.now() - this.metrics.start,
                ...this.getStats()
            }),
            '/rooms': () => ({
                rooms: [...this.topics].map(([channel, clients]) => ({
                    channel,
                    clients: [...clients].map(id => ({
                        id,
                        metadata: this.metadata.get(id)
                    }))
                }))
            }),
            '/clients': () => ({
                clients: [...this.clients.keys()].map(id => ({
                    id,
                    metadata: this.metadata.get(id),
                    rooms: [...this.topics]
                        .filter(([_, c]) => c.has(id))
                        .map(([ch]) => ch)
                }))
            }),
            '/gossip': () => this.gossip.getState(),
            '/metrics': () => this.formatMetrics()
        };

        Object.entries(handlers).forEach(([path, handler]) =>
            app.get(path, (_, res) => res.json(handler())));

        app.post('/gossip/peers', ({body: {peer}}, res) => {
            if (!peer) return res.status(400).json({error: 'Invalid peer'});
            this.gossip.connect(peer);
            res.json({status: 'ok', peer});
        });
    }

    setupWebSocket() {
        this.wss.on('connection', (conn, req) => {
            const clientId = `client-${Math.random().toString(36).slice(2)}`;
            conn.clientId = clientId;
            conn.lastSeen = Date.now();
            conn.isAlive = true;

            const heartbeat = setInterval(() => {
                if (!conn.isAlive) {
                    clearInterval(heartbeat);
                    return conn.terminate();
                }
                conn.isAlive = false;
                conn.ping();
            }, this.heartbeatInterval);

            conn.on('pong', () => {
                conn.isAlive = true;
                conn.lastSeen = Date.now();
            });

            this.clients.set(clientId, conn);
            this.metrics.connections++;

            this.send(clientId, {
                type: 'welcome',
                clientId,
                ip: req.socket.remoteAddress
            });

            conn.on('message', message => {
                const data = JSON.parse(message);
                console.log(data);

                let type = data.type;

                if (type==='subscribe') {
                    data.topics.forEach(topic => {
                        if (!this.topics.has(topic)) {
                            this.topics.set(topic, new Set());
                        }
                        this.topics.get(topic).add(clientId);
                    });
                    console.log(this.topics);
                    return;
                } else if (type==='unsubscribe') {
                    data.topics.forEach(topic => {
                        this.topics.get(topic)?.delete(clientId);
                    });
                    return;
                } else if (type==='publish') {
                    const {topic, data: payload} = data;
                    const recipients = this.topics.get(topic);
                    if (!recipients) return;

                    const message = JSON.stringify({
                        type: 'publish',
                        topic: topic,
                        data: payload
                    });

                    recipients.forEach(recipientId => {
                        const recipient = this.clients.get(recipientId);
                        if (recipient?.readyState === WebSocket.OPEN) {
                            recipient.send(message);
                        }
                    });
                }
            });
            conn.on('close', () => {
                this.topics.forEach(subscribers => subscribers.delete(clientId));
                this.clients.delete(clientId);
                conn.on('close', () => {
                    clearInterval(heartbeat);
                    this.disconnect(clientId);
                });
                conn.on('error', () => {
                    clearInterval(heartbeat);
                    this.disconnect(clientId);
                });
            });
        });
    }

    // handleMessage(clientId, {type, ...msg}) {
    //     console.log(type, msg);
    //     const actions = {
    //         join: () => this.joinRoom(clientId, msg.channel),
    //         leave: () => this.leaveRoom(clientId, msg.channel),
    //         broadcast: () => this.broadcast(clientId, msg.channel, msg.data),
    //         signal: () => this.relay(clientId, msg.target, msg.data),
    //         metadata: () => this.updateMetadata(clientId, msg.data)
    //     };
    //
    //     const action = actions[type];
    //     if (!action) throw new Error(`Unknown message type: ${type}`);
    //     action();
    // }

    // joinRoom(clientId, channel) {
    //     if (!channel) throw new Error('Channel required');
    //
    //     const room = this.topics.get(channel) ||
    //         this.topics.set(channel, new Set()).get(channel);
    //
    //     if (room.has(clientId)) return;
    //     room.add(clientId);
    //
    //     this.broadcast(clientId, channel, {
    //         type: 'peer-joined',
    //         clientId,
    //         metadata: this.metadata.get(clientId)
    //     });
    //
    //     this.send(clientId, {
    //         type: 'room-info',
    //         channel,
    //         peers: [...room]
    //             .filter(id => id !== clientId)
    //             .map(id => ({
    //                 clientId: id,
    //                 metadata: this.metadata.get(id)
    //             }))
    //     });
    // }

    // leaveRoom(clientId, channel) {
    //     const room = this.rooms.get(channel);
    //     if (!room?.has(clientId)) return;
    //
    //     room.delete(clientId);
    //
    //     if (room.size === 0) {
    //         this.rooms.delete(channel);
    //     } else {
    //         this.broadcast(clientId, channel, {
    //             type: 'peer-left',
    //             clientId
    //         });
    //     }
    // }
    //
    // updateMetadata(clientId, metadata) {
    //     if (!metadata) throw new Error('Metadata required');
    //
    //     this.metadata.set(clientId, metadata);
    //
    //     [...this.rooms].forEach(([channel, clients]) => {
    //         if (clients.has(clientId)) {
    //             this.broadcast(clientId, channel, {
    //                 type: 'peer-metadata-updated',
    //                 clientId,
    //                 metadata
    //             });
    //         }
    //     });
    // }

    broadcast(senderId, channel, data) {
        if (!channel || !data) return;

        const room = this.topics.get(channel);
        if (!room) return;

        const message = JSON.stringify(withTimestamp({
            ...data,
            sender: senderId,
            channel
        }));

        room.forEach(clientId => {
            if (clientId !== senderId) {
                const ws = this.clients.get(clientId);
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(message, err => {
                        if (err) this.disconnect(clientId);
                    });
                    this.metrics.messages++;
                    this.metrics.bytes += message.length;
                }
            }
        });
    }

    relay(senderId, targetId, data) {
        if (!targetId || !data) return;

        this.send(targetId, {
            type: 'signal',
            sender: senderId,
            data
        });
    }

    disconnect(clientId) {
        [...this.topics.keys()].forEach(channel =>
            this.leaveRoom(clientId, channel));

        const ws = this.clients.get(clientId);
        if (ws) {
            ws.terminate();
            this.clients.delete(clientId);
            this.metadata.delete(clientId);
        }
    }

    send(clientId, data) {
        const ws = this.clients.get(clientId);
        if (ws?.readyState === WebSocket.OPEN) {
            const message = JSON.stringify(withTimestamp(data));
            ws.send(message, err => {
                if (err) this.disconnect(clientId);
            });
            this.metrics.messages++;
            this.metrics.bytes += message.length;
        }
    }

    getStats() {
        return {
            ...this.metrics,
            currentConnections: this.clients.size,
            topics: [...this.topics].map(([channel, clients]) => ({
                channel,
                size: clients.size
            }))
        };
    }

    formatMetrics = () => {
        const metrics = {
            signaling_connections_total: this.metrics.connections,
            signaling_connections_active: this.clients.size,
            signaling_messages_total: this.metrics.messages,
            signaling_bytes_transferred_total: this.metrics.bytes,
            signaling_topics_total: this.topics.size,
            signaling_uptime_seconds: (Date.now() - this.metrics.start) / 1000
        };

        return Object.entries(metrics)
            .map(([k, v]) => [
                `# HELP ${k} ${k.replace(/_/g, ' ')}`,
                `# TYPE ${k} ${k.includes('total') ? 'counter' : 'gauge'}`,
                `${k} ${v}`
            ].join('\n')).join('\n');
    };

}

new SignalingServer(4444);