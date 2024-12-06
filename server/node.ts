import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as viteServer } from 'vite';
import { Plugin } from './Plugin';


// Dynamic imports for plugins
async function loadPlugin(pluginName: string): Promise<Plugin> {
    const module = await import(`./${pluginName}Plugin`);
    return new module.default();
}

interface AppConfig {
    plugins: { [pluginName: string]: any };
}

function loadConfig(): AppConfig {
    // ... (Implementation to load config from file or environment)
    // Placeholder for demonstration
    return {
        plugins: {
            P2P: { enabled: true, /* ... other P2P options */ }
        }
    };
}

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

    const appConfig = loadConfig();
    const plugins: { [pluginName: string]: Plugin } = {};

    for (const pluginName in appConfig.plugins) {
        if (appConfig.plugins[pluginName].enabled) {
            const plugin = await loadPlugin(pluginName);
            plugins[pluginName] = plugin;
            await plugin.init(io, appConfig.plugins[pluginName]);
            await plugin.start();
        }
    }

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

        s.on('disconnect', () => {
            console.log('User disconnected:', s.id);
        });

        // Generic plugin message handler
        s.on('plugin-message', async (pluginName, topic, message) => {
            if (plugins[pluginName] && plugins[pluginName].handleMessage) {
                await plugins[pluginName].handleMessage(topic, message);
            }
        });
    }

    io.on('connection', (socket) => wsConnect(socket));


    // Define HTTP routes
    app.get('/status', (req, res) => {
        res.json({ status: 'OK', timestamp: new Date() });
    });

    httpServer.listen(PORT, () => {
        console.log(`Signaling server is running at http://localhost:${PORT}`);
    });
})();
