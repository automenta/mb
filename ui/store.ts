import NObject from '../src/obj';
import type { UserInfo } from './types';
export type { UserInfo } from './types';
import type DB from '../src/db';
import type { Awareness } from 'y-protocols/awareness';
import type { Doc as YDoc } from 'yjs';

type Listener = (store: Store) => void;

export class Store {
  currentUser: UserInfo | null = null;
  currentObject: NObject | null = null;
  objects: NObject[] = [];
  friends: UserInfo[] = [];
  networkStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  pluginStatus: Record<string, boolean> = {};
  errors: Array<{
    pluginName: string;
    error: any;
    timestamp: number;
  }> = [];
  db: DB | null = null;
  net?: {
    bindDocument: (doc: YDoc) => void;
    unshareDocument: (id: string) => void;
  };
  awareness?: Awareness;

  private subscribers = new Set<Listener>();

  constructor(db?: DB) {
    this.db = db || null;
    if (db) {
      this.syncWithDB(db);
    }
  }

  private notify() {
    this.subscribers.forEach(listener => listener(this));
  }

  subscribe(callback: Listener): () => void {
    this.subscribers.add(callback);
    callback(this);
    return () => this.subscribers.delete(callback);
  }

  syncWithDB(db: DB) {
    const updateObjects = () => {
      console.log('syncWithDB: updateObjects started');
      const objects = Array.from(db.index.values()).map(objId => {
        const obj = db.get(objId);
        return obj;
      }).filter((obj): obj is NObject => obj !== null);

      console.log('syncWithDB: updateObjects loaded', objects.length, 'objects');

      this.objects = objects;
      this.currentObject = objects.length > 0 ? objects[0] : null;

      console.log('syncWithDB: updateObjects finished');
      this.notify();
    };

    db.index.observe(updateObjects);
    updateObjects();
  }

  setCurrentUser(user: UserInfo) {
    this.currentUser = user;
    this.notify();
  }

  setCurrentObject(obj: NObject) {
    this.currentObject = obj;
    this.notify();
  }

  addObject(obj: NObject) {
    this.objects = [...this.objects, obj];
    this.setCurrentObject(obj);
    this.notify();
  }

  removeObject(id: string) {
    this.objects = this.objects.filter(o => o.id !== id);
    if (this.currentObject?.id === id) {
      this.currentObject = null;
    }
    this.notify();
  }

  setNetworkStatus(status: 'connected' | 'disconnected' | 'error') {
    this.networkStatus = status;
    this.notify();
  }

  updatePluginStatus(plugins: Record<string, boolean>) {
    this.pluginStatus = plugins;
    this.notify();
  }

  logError(error: { pluginName: string; error: any; timestamp: number }) {
    this.errors = [error, ...this.errors].slice(0, 100);
    this.notify();
  }

  reset() {
    this.currentUser = null;
    this.currentObject = null;
    this.objects = [];
    this.friends = [];
    this.networkStatus = 'disconnected';
    this.pluginStatus = {};
    this.errors = [];
    this.notify();
  }
}

let storeInstance: Store | null = null;

export function getStore(db?: DB): Store {
  if (!storeInstance) {
    storeInstance = new Store(db);
  }
  return storeInstance;
}
