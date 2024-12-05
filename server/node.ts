import express from 'express';
import http from 'http';
import path from 'path';
import {Server as wsServer, Socket} from 'socket.io';
import {createServer as viteServer} from 'vite';

const PORT = 3000;

(async () => {
    const app = express();


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