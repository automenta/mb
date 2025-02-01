import WebTorrent from 'webtorrent';
import { NetworkPlugin } from './network-plugin';

export class BitTorrentNetwork implements NetworkPlugin {
  name = 'bittorrent';
  private client: WebTorrent.Instance;

  async init(config: any): Promise<void> {
    this.client = new WebTorrent(config);

    this.client.on('error', (err) => {
      console.error('BitTorrent client error:', err.message);
    });
  }

  async connect(): Promise<void> {
    // In BitTorrent, "connecting" is typically represented by joining a swarm
    console.log('BitTorrent connecting (joining swarm)...');
  }

  async disconnect(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.client.destroy((err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });
  }

  async broadcast(message: any): Promise<void> {
    // BitTorrent doesn't have a direct broadcast; seeding a file is a close equivalent
    const buffer = Buffer.from(JSON.stringify(message));
    const file = {
      name: 'broadcast.json',
      path: '/broadcast.json',
      getBlob: (cb) => cb(null, new Blob([buffer])),
      length: buffer.length,
    };

    this.client.seed(file as any, (torrent) => {
      console.log('Seeding message on infoHash:', torrent.infoHash);
    });
  }

  onReceive(callback: (message: any) => void): void {
    this.client.on('torrent', (torrent) => {
      torrent.files[0].getBuffer((err, buffer) => {
        if (err) {
          console.error('Error getting file buffer:', err);
          return;
        }
        try {
          const message = JSON.parse(buffer.toString());
          callback(message);
        } catch (err) {
          console.error('Error parsing received message:', err);
        }
      });
    });
  }
}