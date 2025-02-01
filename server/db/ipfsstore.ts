import * as IPFS from 'ipfs-core';
import { DatastorePlugin } from './datastore-plugin';

export class IPFSDatastore implements DatastorePlugin {
  name = 'ipfs';
  private ipfs: IPFS.IPFS;

  async init(config: any): Promise<void> {
    this.ipfs = await IPFS.create(config);
  }

  async put(key: string, value: any): Promise<void> {
    const result = await this.ipfs.add(value);
    // Assuming the key is the CID; adjust if necessary
    if (key !== result.cid.toString()) {
      console.warn(`Key "${key}" does not match generated CID "${result.cid.toString()}"`);
    }
  }

  async get(key: string): Promise<any> {
    const decoder = new TextDecoder();
    let content = '';
    for await (const chunk of this.ipfs.cat(key)) {
      content += decoder.decode(chunk, { stream: true });
    }
    return content;
  }

  async del(key: string): Promise<void> {
    // IPFS doesn't have a direct delete; unpinning is a close equivalent
    await this.ipfs.pin.rm(key);
  }

  async close(): Promise<void> {
    await this.ipfs.stop();
  }
}