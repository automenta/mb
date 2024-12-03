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

import express from 'express';
import http from 'http';
import path from 'path';
import { Server as wsServer, Socket } from 'socket.io';
import { createServer as viteServer } from 'vite';
import P2P from './p2p';

const PORT = 3000;

(async () => {
    const app = express();

    const p2p = new P2P();
    await p2p.start();

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

        p2p.handleSocketConnection(socket);
    });


    // Define HTTP routes
    app.get('/status', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date() });
    });

    httpServer.listen(PORT, () => {
        console.log(`Signaling server is running at http://localhost:${PORT}`);
    });
})();
