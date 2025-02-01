import levelup from 'levelup';
import leveldown from 'leveldown';
import { DatastorePlugin } from './datastore-plugin';

export class LevelDBDatastore implements DatastorePlugin {
  name = 'leveldb';
  private db: levelup.LevelUp;

  async init(config: any): Promise<void> {
    this.db = levelup(leveldown(config.location || './leveldb'));
  }

  async put(key: string, value: any): Promise<void> {
    await this.db.put(key, value);
  }

  async get(key: string): Promise<any> {
    return await this.db.get(key);
  }

  async del(key: string): Promise<void> {
    await this.db.del(key);
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}