import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'net';
import { createServer } from '../../server/server';

describe('WebSocket Communication', () => {
    let io: SocketIOServer;
    let server: HTTPServer;
    let serverSocket: Socket;
    let clientSocket: ClientSocket;

    beforeAll(async () => {
        // Create and start the Express server
        const { server: startedServer, io: startedIo } = await createServer();
        server = startedServer;
        io = startedIo;

        // Get the server address
        const serverAddress = server.address() as AddressInfo;
        const serverUrl = `http://localhost:${serverAddress.port}`;

        // Connect the client socket to the server
        clientSocket = Client(serverUrl);
    });

    afterAll(async () => {
        // Clean up resources
        await io.close();
        clientSocket.close();

        // Close the Express server
        await new Promise<void>((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    });

    it('should establish a WebSocket connection between client and server', () => {
        return new Promise<void>((resolve) => {
            clientSocket.on('connect', () => {
                expect(clientSocket.connected).toBe(true);
                resolve();
            });
        });
    });

    it('should relay a message from client to server via WebSocket', () => {
        return new Promise<void>((resolve) => {
            const testMessage = { target: 'server', data: 'Hello from client' };

            io.on('connection', (socket) => {
                socket.on('signal', (message) => {
                    expect(message).toEqual(testMessage);
                    resolve();
                });
            });

            clientSocket.emit('signal', testMessage);
        });
    });

    it('should handle multiple simultaneous connections', async () => {
        const numClients = 5;
        const clients = [];
        const messages: Array<{ target: string, data: string }> = [];

        // Create multiple client connections
        for (let i = 0; i < numClients; i++) {
            const address = server.address();
            if (!address) {
                throw new Error('Server address is null');
            }
            const client = Client(`http://localhost:${(address as AddressInfo).port}`);
            clients.push(client);
            
            await new Promise<void>((resolve) => {
                client.on('connect', () => resolve());
            });
        }

        // Test message broadcasting
        const testMessage = { target: 'broadcast', data: 'Broadcast message' };
        
        io.on('connection', (socket) => {
            socket.on('broadcast', (message) => {
                messages.push(message);
            });
        });

        // Send broadcast from first client
        clients[0].emit('broadcast', testMessage);

        // Wait for messages to propagate
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Verify all clients received the message
        expect(messages.length).toBe(numClients);
        messages.forEach(msg => {
            expect(msg).toEqual(testMessage);
        });

        // Clean up clients
        clients.forEach(client => client.close());
    });

    it('should handle connection errors gracefully', async () => {
        const invalidClient = Client('http://localhost:9999');
        
        const connectionError = await new Promise((resolve) => {
            invalidClient.on('connect_error', (err) => {
                resolve(err.message);
            });
        });

        expect(connectionError).toContain('connect ECONNREFUSED');
        invalidClient.close();
    });
});