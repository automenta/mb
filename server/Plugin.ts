import { Server as SocketIOServer } from 'socket.io';

export interface Plugin {
    name: string;
    init(io: SocketIOServer, config: any): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    sendMessage?(topic: string, message: any): void; // Optional messaging
    handleMessage?(topic: string, message: any): void; // Optional message handling
}
