import { createLibp2p, Libp2p, Libp2pOptions } from 'libp2p';
import { NetworkPlugin } from './network-plugin';

export class LibP2PNetwork implements NetworkPlugin {
  name = 'libp2p';
  private libp2p: Libp2p;

  async init(config: Libp2pOptions): Promise<void> {
    this.libp2p = await createLibp2p(config);

    this.libp2p.addEventListener('peer:discovery', (evt) => {
      console.log('Discovered:', evt.detail.id.toString());
    });

    this.libp2p.addEventListener('peer:connect', (evt) => {
      console.log('Connected to:', evt.detail.id.toString());
    });

    this.libp2p.addEventListener('peer:disconnect', (evt) => {
      console.log('Disconnected from:', evt.detail.id.toString());
    });
    
    this.libp2p.addEventListener('start', () => {
      console.log('libp2p started and listening on:', this.libp2p.getMultiaddrs().map(addr => addr.toString()));
    });
    
    this.libp2p.addEventListener('stop', () => {
      console.log('libp2p stopped.');
    });

    this.libp2p.connectionManager.addEventListener('peer:connect', (evt) => {
      const connection = evt.detail
      console.log('Connection established to:', connection.remotePeer.toString())
    });
  }

  async connect(): Promise<void> {
    await this.libp2p.start();
  }

  async disconnect(): Promise<void> {
    await this.libp2p.stop();
  }

  async broadcast(message: any): Promise<void> {
    // Placeholder for message broadcasting logic
    console.log('Broadcasting message:', message);
  }

  onReceive(callback: (message: any) => void): void {
    // Placeholder for message receiving logic
    console.log('Setting up message receive callback');
  }
}