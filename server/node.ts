import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

const PORT = 3000;

// Initialize Express app
const app = express();

// Serve static content from ../ui folder
app.use(express.static(path.join('../ui')));

// Create HTTP server
const httpServer = http.createServer(app);

// Initialize Socket.IO for signaling
const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*', // Update this to specify the allowed origins for better security
    },
});

// Define WebRTC signaling events
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Relay signaling messages between clients
    socket.on('signal', (message) => {
        const { target, data } = message;
        console.log(`Relaying message from ${socket.id} to ${target}`);
        io.to(target).emit('signal', { sender: socket.id, data });
    });

    // Handle room joining
    socket.on('join', (roomId) => {
        socket.join(roomId);
        console.log(`${socket.id} joined room: ${roomId}`);
        socket.to(roomId).emit('user-joined', { userId: socket.id });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Define HTTP routes
app.get('/', (req, res) => {
    res.send('WebRTC Signaling Server is running');
});

// You can add more routes here
app.get('/status', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Signaling server is running at http://localhost:${PORT}`);
});