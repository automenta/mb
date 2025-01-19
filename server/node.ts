import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as viteServer } from 'vite';

const PORT = 3000;

(async () => {
    const app = express();

    app.use((await viteServer({
        server: { middlewareMode: 'html' },
        root: path.resolve('../'),
    })).middlewares);

    const httpServer = http.createServer(app);

    const io = new SocketIOServer(httpServer, {
        cors: { origin: '*' },
    });


    function wsConnect(s: Socket) {
        console.log('User connected:', s.id);

        s.on('signal', (message) => {
            const { target, data } = message;
            console.log(`Relaying message from ${s.id} to ${target}`);
            io.to(target).emit('signal', { sender: s.id, data });
        });

        s.on('join', (roomId) => {
            s.join(roomId);
            console.log(`${s.id} joined room: ${roomId}`);
            s.to(roomId).emit('user-joined', { userId: s.id });
        });

        s.on('join', (roomId) => {
            s.join(roomId);
            console.log(`${s.id} joined room: ${roomId}`);
            s.to(roomId).emit('user-joined', { userId: s.id });
        });


        s.on('disconnect', () => {
            console.log('User disconnected:', s.id);
        });

        // // Generic plugin message handler
        // s.on('plugin-message', async (pluginName, topic, message) => {
        //     if (plugins[pluginName] && plugins[pluginName].handleMessage) {
        //         await plugins[pluginName].handleMessage(topic, message);
        //     }
        // });
    }

    io.on('connection', (socket) => wsConnect(socket));


    // Define HTTP routes
    app.get('/status', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date() });
    });

    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
})();
