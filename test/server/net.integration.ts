import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {Server as SocketIOServer, Socket} from 'socket.io';
import {Server as HTTPServer} from 'http';
import {io as Client, Socket as ClientSocket} from 'socket.io-client';
import { createLibp2p } from 'libp2p';
import { createEd25519PeerId } from '@libp2p/peer-id-factory';
import { peerIdFromString } from '@libp2p/peer-id';
import { webSockets } from '@libp2p/websockets';
import { Noise } from '@chainsafe/libp2p-noise';
import { mplex } from '@libp2p/mplex';
import { Bootstrap } from '@libp2p/bootstrap';
import { GossipSub } from '@chainsafe/libp2p-gossipsub';
import type { PeerId } from '@libp2p/interface-peer-id';
import type { Libp2p } from 'libp2p';
import {AddressInfo} from 'net';
import { createServer } from "../../server/server"; // Corrected import
import P2PNode from '../../server/p2p';

describe('End-to-End Tests', () => {
    let io: SocketIOServer;
    let server: HTTPServer;
    let serverSocket: Socket;
    let clientSocket: ClientSocket;
    let p2pNode: P2PNode;
    let peerId1: string;
    let peerId2: string;
    let libp2pNode1: Libp2p;
    let libp2pNode2: Libp2p;
    const serverUrl = 'http://localhost:8080'; // Define serverUrl here

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

        // Create peer IDs
        const peerIdStr1 = (await createEd25519PeerId()).toString();
        const peerIdStr2 = (await createEd25519PeerId()).toString();
        peerId1 = peerIdStr1; // Store as string
        peerId2 = peerIdStr2; // Store as string

        // Create Libp2p nodes
        libp2pNode1 = await createLibp2p({
            addresses: {
                listen: ['/ip4/127.0.0.1/tcp/0/ws']
            },
            transports: [webSockets()],
            connectionEncrypters: [new Noise()],
            streamMuxers: [mplex],
            peerDiscovery: [new Bootstrap({
                list: [
                    '/dns4/bootstrap.libp2p.io/tcp/443/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
                ]
            })],
            services: {
                pubsub: (components: any) => new GossipSub(components, {
                    allowPublishToZeroPeers: true,
                    emitSelf: true
                })
            }
        });

        libp2pNode2 = await createLibp2p({
            addresses: {
                listen: ['/ip4/127.0.0.1/tcp/0/ws']
            },
            transports: [webSockets()],
            connectionEncrypters: [new Noise()],
            streamMuxers: [mplex],
            peerDiscovery: [new Bootstrap({
                list: [
                    `/ip4/127.0.0.1/tcp/${(libp2pNode1.getMultiaddrs()[0].nodeAddress() as any).port}/ws/p2p/${peerId1.toString()}`
                ]
            })],
            services: {
                pubsub: (components: any) => new GossipSub(components, {
                    allowPublishToZeroPeers: true,
                    emitSelf: true
                })
            }
        });

        // Start Libp2p nodes
        await libp2pNode1.start();
        await libp2pNode2.start();

        // Create a P2P node
        p2pNode = new P2PNode(peerId1, {
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

        // Close server
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

    it('should establish a P2P connection between 2 server nodes', async () => {
        const connection = await new Promise<any>((resolve) => {
            libp2pNode1.addEventListener('peer:connect', (evt) => {
                const connection = evt.detail;
                resolve(connection);
            });

            libp2pNode2.dial(libp2pNode1.getMultiaddrs()[0]);
        });

        // Verify connection details
        expect(connection).toBeDefined();
        expect(connection.remotePeer.toString()).toBe(peerId2.toString());
        expect(connection.stat.status).toBe('OPEN');
        expect(connection.stat.timeline.open).toBeDefined();
        expect(connection.stat.timeline.close).toBeUndefined();
        
        // Verify both nodes have each other in their peer stores
        const node1Peers = await libp2pNode1.peerStore.all();
        const node2Peers = await libp2pNode2.peerStore.all();
        
        expect(node1Peers.some(p => p.id.toString() === peerId2.toString())).toBe(true);
        expect(node2Peers.some(p => p.id.toString() === peerId1.toString())).toBe(true);
    });

    it('should send and receive a message between 2 server nodes via P2P', () => {
        return new Promise<void>((resolve) => {
            const testTopic = 'test-topic';
            const testMessage = 'Hello from P2PNode1';

            p2pNode.on('message', (msg) => {
                expect(msg.data.toString()).toEqual(testMessage);
                resolve();
            });

            p2pNode.sendGossipMessage(testTopic, testMessage);
        });
    });

    it('should authenticate valid WebSocket connections', async () => {
        const validToken = 'token1';
        const authClientSocket = Client(serverUrl, { auth: { token: validToken } });

        await new Promise<void>((resolve) => {
            authClientSocket.on('connect', () => {
                expect(authClientSocket.connected).toBe(true);
                authClientSocket.disconnect();
                resolve();
            });
        });
    });

    it('should reject invalid WebSocket connections', async () => {
        const WebSocket = require('ws');
        const invalidToken = 'invalid-token';
        
        const ws = new WebSocket('ws://localhost:8080?token=' + invalidToken);
        
        const closed = await new Promise<boolean>((resolve) => {
            ws.on('close', () => {
                resolve(true);
            });
        });
        
        expect(closed).toBe(true);
    });

    it('should handle WebSocket messages', async () => {
        const WebSocket = require('ws');
        const validToken = 'token1';
        const testMessage = 'Test WebSocket message';
        
        const ws = new WebSocket('ws://localhost:8080?token=' + validToken);
        
        await new Promise<void>((resolve) => {
            ws.on('open', () => {
                ws.send(testMessage);
                resolve();
            });
        });
        
        // Verify message was handled by checking console output
        // This assumes the console.log in handleWebSocketMessage is sufficient
        // for testing purposes
        expect(console.log).toHaveBeenCalledWith(
            'Received WebSocket message:',
            testMessage
        );
        
        ws.close();
    });
});