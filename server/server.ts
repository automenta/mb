import express from "express";
import http from "http";
import path from "path";
import { Server as SocketIOServer, Socket } from "socket.io";
import { createServer as viteServer } from "vite";
import { WebSocketServer } from "ws";
import * as Y from "yjs";

const PORT = 3000;

export async function createServer(port = 3000) {
  const app = express();

  app.use(
    (
      await viteServer({
        server: { middlewareMode: true },
        root: path.resolve("./"), //relative to root, when running from root
      })
    ).middlewares
  );

  const httpServer = http.createServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  // Yjs WebSocket provider
  const wss = new WebSocketServer({ noServer: true });
  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url?.startsWith("/yjs")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });
  const ydoc = new Y.Doc();
  wss.on("connection", (ws, request) => {
    //setupWSConnection(ws, request, ydoc);
  });

  const wsConnect = (s: Socket) => {
    console.log(new Date().toISOString(), "User connected:", s.id);

    s.on("signal", (message) => {
      const { target, data } = message;
      console.log(new Date().toISOString(), `Relaying message from ${s.id} to ${target}`);
      io.to(target).emit("signal", { sender: s.id, data });
    });

    s.on("join", (roomId) => {
      s.join(roomId);
      console.log(new Date().toISOString(), `${s.id} joined room: ${roomId}`);
      s.to(roomId).emit("user-joined", { userId: s.id });
    });

    s.on("disconnect", () => {
      console.log(new Date().toISOString(), "User disconnected:", s.id);
    });

    s.on("error", (err) => {
      console.error(new Date().toISOString(), "Socket error:", err);
    });

    // // Generic plugin message handler
    // s.on('plugin-message', async (pluginName, topic, message) => {
    //     if (plugins[pluginName] && plugins[pluginName].handleMessage) {
    //         await plugins[pluginName].handleMessage(topic, message);
    //     }
    // });
    s.on("shareDocument", (documentId) => {
      console.log(new Date().toISOString(), `Document ${documentId} shared by ${s.id}`);
      // Add logic to synchronize documentId over the network
    });
    s.on("unshareDocument", (documentId) => {
      console.log(new Date().toISOString(), `Document ${documentId} unshared by ${s.id}`);
      // Add logic to stop synchronizing documentId over the network
    });
  };

  io.on("connection", wsConnect);

  app.get("/status", (req, res) => {
    res.json({ status: "OK", timestamp: new Date() });
  });

  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  
  async function enableSupernodeMode(): Promise<void> {
    // Stub for enabling supernode mode
    console.log('Enabling supernode mode... (not implemented yet)');
    // Future implementation will handle supernode functionalities like large-scale coordination and fallback
  }

  return { server: httpServer, io };
}

// Start server if not running in a test environment
// /* @ts-ignore */ if (import.meta.url === `file://${process.argv[1]}`)
  createServer();
