import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createLibp2p, Libp2p } from 'libp2p';
import { createEd25519PeerId, Ed25519PeerId } from '@libp2p/peer-id-factory';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { bootstrap } from '@libp2p/bootstrap';
import { AddressInfo } from 'net';
import { startServer} from "../server/server"; // Import startServer
import P2PNode from '../server/p2p';

describe('End-to-End Tests', () => {
    let io: SocketIOServer;
    let server: HTTPServer;
    let serverSocket: Socket;
    let clientSocket: ClientSocket;
    let p2pNode: P2PNode;
    let peerId1: Ed25519PeerId;
    let peerId2: Ed25519PeerId;
    let libp2pNode1: Libp2p;
    let libp2pNode2: Libp2p;

    beforeAll(async () => {
        // Create and start the Express server
        const { server: startedServer, io: startedIo } = await startServer();
        server = startedServer;
        io = startedIo;

        // Get the server address
        const serverAddress = server.address() as AddressInfo;
        const serverUrl = `http://localhost:${serverAddress.port}`;

        // Connect the client socket to the server
        clientSocket = Client(serverUrl);

        // Create peer IDs
        peerId1 = await createEd25519PeerId();
        peerId2 = await createEd25519PeerId();

        // Create Libp2p nodes
        libp2pNode1 = await createLibp2p({
            peerId: peerId1,
            transports: [new webSockets()],
            connectionEncryption: [new noise()],
            streamMuxers: [new mplex()],
            addresses: {
                listen: ['/ip4/127.0.0.1/tcp/0/ws']
            }
        });

        libp2pNode2 = await createLibp2p({
            peerId: peerId2,
            transports: [new webSockets()],
            connectionEncryption: [new noise()],
            streamMuxers: [new mplex()],
            addresses: {
                listen: ['/ip4/127.0.0.1/tcp/0/ws']
            },
            peerDiscovery: [
                new bootstrap({
                    list: [
                        `/ip4/127.0.0.1/tcp/${(libp2pNode1.getMultiaddrs()[0].nodeAddress() as any).port}/ws/p2p/${peerId1.toString()}`
                    ]
                })
            ]
        });

        // Start Libp2p nodes
        await libp2pNode1.start();
        await libp2pNode2.start();

        // Create a P2P node
        p2pNode = new P2PNode({
            peerId: peerId1,
            bootstrapList: [
                `/ip4/127.0.0.1/tcp/${(libp2pNode1.getMultiaddrs()[0].nodeAddress() as any).port}/ws/p2p/${peerId1.toString()}`
            ]
        });

        // Start the P2P node
        await p2pNode.start();
    });

    afterAll(async () => {
        // Clean up resources
        await p2pNode.stop();
        await libp2pNode1.stop();
        await libp2pNode2.stop();

        // Disconnect sockets
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

    it('should establish a WebSocket connection between client and server', (done) => {
        clientSocket.on('connect', () => {
            expect(clientSocket.connected).toBe(true);
            done();
        });
    });

    it('should relay a message from client to server via WebSocket', (done) => {
        const testMessage = { target: 'server', data: 'Hello from client' };

        io.on('connection', (socket) => {
            socket.on('signal', (message) => {
                expect(message).toEqual(testMessage);
                done();
            });
        });

        clientSocket.emit('signal', testMessage);
    });

    it('should establish a P2P connection between two server nodes', async () => {
        const connection = await new Promise<any>((resolve) => {
            libp2pNode1.addEventListener('peer:connect', (evt) => {
                const connection = evt.detail;
                resolve(connection);
            });

            libp2pNode2.dial(libp2pNode1.getMultiaddrs()[0]);
        });

        expect(connection).toBeDefined();
        expect(connection.remotePeer.toString()).toBe(peerId2.toString());
    });

    it('should send and receive a message between two server nodes via P2P', (done) => {
        const testTopic = 'test-topic';
        const testMessage = 'Hello from P2PNode1';

        p2pNode.on('message', (msg) => {
            expect(msg.data.toString()).toEqual(testMessage);
            done();
        });

        p2pNode.sendGossipMessage(testTopic, testMessage);
    });
});