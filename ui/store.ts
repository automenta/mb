import type NObject from '../src/obj';
import type { UserInfo } from './types';
export type { UserInfo } from './types';
import type DB from '../src/db';

import type { Awareness } from 'y-protocols/awareness';
import type { Doc as YDoc } from 'yjs';

export interface AppState {
  currentUser: UserInfo | null;
  currentObject: NObject | null;
  objects: NObject[];
  friends: UserInfo[];
  networkStatus: 'connected' | 'disconnected' | 'error';
  pluginStatus: Record<string, boolean>;
  errors: Array<{ pluginName: string; error: any; timestamp: number }>;
  db: DB | null;
  net?: {
    bindDocument: (doc: YDoc) => void;
    unshareDocument: (id: string) => void;
  };
  awareness?: Awareness;
}

type Listener = (state: AppState) => void;
interface StoreConfig {
  initialState: AppState;
  persistKeys?: (keyof AppState)[];
}

class Store {
  private state: AppState;
  private subscribers = new Set<Listener>();
  private persistKeys?: (keyof AppState)[];

  constructor(config: StoreConfig) {
    this.state = config.initialState;
    this.persistKeys = config.persistKeys;
  }

  update(updater: (state: AppState) => AppState) {
    this.state = updater(this.state);
    this.notify();
  }

  syncWithDB(db: DB) {
    const updateObjects = () => {
      let objects = Array.from(db.index.values());
      objects = objects.map(x => {
        //if (x.constructor!=="NObject")
          return db.get(x.id); //HACK
        //else
          //return x;
      });
      objects = objects.filter(x => x);

      this.update(currentState => ({
        ...currentState,
        objects,
        currentObject: !currentState.currentObject && objects.length > 0
          ? objects[0]
          : currentState.currentObject
      }));
    };
    
    db.index.observe(updateObjects);
    updateObjects();
  }

  subscribe(callback: Listener): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(listener => listener(this.state));
  }

  setCurrentUser(user: UserInfo) {
    this.state.currentUser = user;
    this.notify();
  }

  setCurrentObject(obj: NObject) {
    this.state.currentObject = obj;
    this.notify();
  }

  addObject(obj: NObject) {
    this.state.objects = [...this.state.objects, obj];
    this.setCurrentObject(obj);
    this.notify();
  }

  removeObject(id: string) {
    this.state.objects = this.state.objects.filter(o => o.id !== id);
    if (this.state.currentObject?.id === id) {
      this.state.currentObject = null;
    }
    this.notify();
  }

  setNetworkStatus(status: 'connected' | 'disconnected') {
    this.state.networkStatus = status;
    this.notify();
  }

  updatePluginStatus(plugins: Record<string, boolean>) {
    this.state.pluginStatus = plugins;
    this.notify();
  }

  logError(error: { pluginName: string; error: any; timestamp: number }) {
    this.state.errors = [error, ...this.state.errors].slice(0, 100);
    this.notify();
  }

  reset() {
    this.state = {
      currentUser: null,
      currentObject: null,
      objects: [],
      friends: [],
      networkStatus: 'disconnected',
      pluginStatus: {},
      errors: [],
      db: this.state.db
    };
    this.notify();
  }

    getState(): AppState {
        return this.state;
    }
}
let storeInstance: Store | null = null;
export function initializeStore(db: DB) {
    if (!storeInstance) {
        storeInstance = new Store({
            initialState: {
                currentUser: null,
                currentObject: null,
                objects: [],
                friends: [],
                networkStatus: 'disconnected',
                pluginStatus: {},
                errors: [],
                db: db,
            },
        });
        storeInstance.syncWithDB(db);
    }
    return storeInstance;
}
export const store = {
    getState: () => storeInstance?.getState() ||
        {
            currentUser: null,
            currentObject: null,
            objects: [],
            friends: [],
            networkStatus: 'disconnected',
            pluginStatus: {},
            errors: [],
            db: null,
        },
    subscribe: (callback: (state: AppState) => void) => storeInstance?.subscribe(callback) || (() => { }),
    setCurrentUser: (user: UserInfo) => storeInstance?.setCurrentUser(user),
    setNetworkStatus: (status: 'connected' | 'disconnected') => storeInstance?.setNetworkStatus(status),
    addObject: (obj: NObject) => storeInstance?.addObject(obj),
    removeObject: (id: string) => storeInstance?.removeObject(id),
    setCurrentObject: (obj: NObject) => storeInstance?.setCurrentObject(obj),
    updatePluginStatus: (plugins: Record<string, boolean>) => storeInstance?.updatePluginStatus(plugins),
    logError: (error: {
        pluginName: string;
        error: any;
        timestamp: number;
    }) => storeInstance?.logError(error),
};