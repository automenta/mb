import express from 'express';
import http from 'http';
import path from 'path';
import { createLibp2p } from 'libp2p';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { bootstrap } from '@libp2p/bootstrap';
import { kadDHT } from '@libp2p/kad-dht';
import { gossipsub } from '@chainsafe/libp2p-gossipsub';

import {Server as wsServer, Socket} from 'socket.io';
import {createServer as viteServer} from 'vite';

const PORT = 3000;
const LIBP2P_ENABLED = process.env.LIBP2P_ENABLED === 'true';

(async () => {
    const app = express();

    let libp2p;
    if (LIBP2P_ENABLED) {
        libp2p = await createLibp2p({
            addresses: {
                listen: ['/ip4/0.0.0.0/tcp/0']
            },
            transports: [webSockets()],
            connectionEncryption: [noise()],
            streamMuxers: [mplex()],
            peerDiscovery: [
                bootstrap({
                    list: ['/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN']
                })
            ],
            dht: kadDHT(),
            pubsub: gossipsub()
        });

        libp2p.addEventListener('peer:discovery', (evt) => {
            const peerId = evt.detail.id.toString();
            console.log(`Discovered peer: ${peerId}`);
            //TODO: connect to discovered peer
        });

        await libp2p.start();
        console.log(`Libp2p started with peer ID: ${libp2p.peerId.toString()}`);
    }



    app.use((await viteServer({
        server: {
            middlewareMode: 'html'
        },
        root: path.resolve('../'),
    })).middlewares);

    const httpServer = http.createServer(app);

    const io = new wsServer(httpServer, {
        cors: {
            origin: '*', // Update this to specify the allowed origins for better security
        },
    });

    function wsConnect(s:Socket) {
        console.log('User connected:', s.id);

        // Relay signaling messages between clients
        s.on('signal', message => {
            const {target, data} = message;
            console.log(`Relaying message from ${s.id} to ${target}`);
            io.to(target).emit('signal', {sender: s.id, data});
        });

        // Handle room joining
        s.on('join', roomId => {
            s.join(roomId);
            console.log(`${s.id} joined room: ${roomId}`);
            s.to(roomId).emit('user-joined', {userId: s.id});
        });

        // Handle disconnect
        s.on('disconnect', () => {
            console.log('User disconnected:', s.id);
        });
    }
    io.on('connection', socket => wsConnect(socket, io));

    // Define HTTP routes
    app.get('/status', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date() });
    });

    httpServer.listen(PORT, () => {
        console.log(`Signaling server is running at http://localhost:${PORT}`);
    });
})();
