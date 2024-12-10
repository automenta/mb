import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createServer as viteServer } from 'vite';
import {Tool, OCRTool, VisionLLMTool, TextLLMTool} from './aissist/tools'; // Import tools
import {SnapshotManager} from './aissist/snapshotter';

const PORT = 3000;

//////////////////////////////
// Utils
//////////////////////////////
const Utils = {
    delay: ms => new Promise(r => setTimeout(r, ms)),
    getEnvNumber: (key, def) => isNaN(parseInt(process.env[key])) ? def : parseInt(process.env[key]),
    getEnvString: (key, def) => process.env[key] || def,
};

//////////////////////////////
// Plugin Management
//////////////////////////////
const activePlugins = {};

async function loadPlugin(pluginName) {
    switch (pluginName) {
        case 'ocr': return new OCRTool();
        case 'vision': return new VisionLLMTool(Utils.getEnvString('VISION_OLLAMA_URL','http://localhost:11434/api/chat'), Utils.getEnvString('VISION_MODEL','llava:7b'));
        case 'summary': return new TextLLMTool(Utils.getEnvString('NON_VISION_OLLAMA_URL','http://localhost:11434/api/chat'), Utils.getEnvString('NON_VISION_MODEL','llava:7b'));
        default: throw new Error(`Unknown plugin: ${pluginName}`);
    }
}

async function togglePlugin(pluginName, enable) {
    if (enable) {
        if (!activePlugins[pluginName]) activePlugins[pluginName] = await loadPlugin(pluginName);
    } else {
        delete activePlugins[pluginName]; // Stop and remove the plugin
    }
    io.emit('plugin-status', activePlugins); // Broadcast status update
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


    // const appConfig = { }
    // const plugins: { [pluginName: string]: Plugin } = {};
    // for (const pluginName in appConfig.plugins) {
    //     if (appConfig.plugins[pluginName].enabled) {
    //         const plugin = await loadPlugin(pluginName);
    //         plugins[pluginName] = plugin;
    //         await plugin.init(io, appConfig.plugins[pluginName]);
    //         await plugin.start();
    //     }
    // }

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

        s.on('toggle-plugin', async (pluginName, enable) => {
            try {
                await togglePlugin(pluginName, enable);
            } catch (e) {
                console.error(`Failed to toggle plugin ${pluginName}:`, e);
                s.emit('plugin-error', pluginName, e.message);
            }
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

    // Snapshot manager
    const snapshotManager = new SnapshotManager();

    // Start analysis loop
    const analysisInterval = Utils.getEnvNumber('ANALYSIS_INTERVAL', 10000);
    setInterval(async () => {
        const snap = await snapshotManager.createSnapshot();
        for (const pluginName in activePlugins) {
            const plugin = activePlugins[pluginName];
            if (plugin.canRun(snap)) {
                try {
                    await plugin.run(snap);
                } catch (e) {
                    console.error(`Plugin ${pluginName} error:`, e);
                }
            }
        }
        io.emit('snapshot', snap); // Broadcast snapshot data
    }, analysisInterval);

    httpServer.listen(PORT, () => {
        console.log(`Signaling server is running at http://localhost:${PORT}`);
    });
})();


//////////////////////////////
// Aissist tools (moved from renderer.js)
//////////////////////////////
// ... (Tool, OCRTool, VisionLLMTool, TextLLMTool, SnapshotManager code from renderer.js)
// ... but remove the ipcRenderer parts and the UI update functions (updateStatus, updateData, displayNotification)
// ... and export the classes:
export { Tool, OCRTool, VisionLLMTool, TextLLMTool };
export { SnapshotManager };


