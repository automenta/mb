import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import NObject from "./obj";
import { Network } from "./net";
import { Persistence } from "./persistence";
import { Replies } from "./replies";
import { Config } from "./config";

export default class DB {
  readonly doc: Y.Doc;
  public readonly index: Y.Map<string>;
  public readonly provider: IndexeddbPersistence & { awareness?: any };
  public readonly store: Y.Doc;
  private persistenceManager: Persistence;
  private replyManager: Replies;
  private readonly configManager: Config;
  private net?: Network; // Add network reference
  public get config(): Config {
    // Added public getter for configManager
    return this.configManager;
  }

  constructor(
    channel: string,
    doc?: Y.Doc,
    provider?: IndexeddbPersistence,
    store?: Y.Doc
  ) {
    this.doc = doc || new Y.Doc();
    this.provider = provider || new IndexeddbPersistence(channel, this.doc);
    this.store = store || new Y.Doc();

    this.index = this.doc.getMap("index");
    this.persistenceManager = new Persistence(this.doc);
    this.replyManager = new Replies(this);
    this.configManager = new Config(this.doc);

    this.doc.on("update", (update, origin) => {
      if (origin !== this.provider) {
        Y.applyUpdate(this.store, update);
      }
    });

    this.store.on("update", (update, origin) => {
      Y.applyUpdate(this.doc, update, this.provider);
    });

    this.provider.on("synced", () => {
      console.log("Initial data loaded from IndexedDB");
      this.initialize();
    });
  }

  private initialize() {
    this.index.forEach((objectId) => {
      const obj = new NObject(this.doc, objectId);
      obj.observe((event) => {
        if (event.transaction.origin !== this.provider) {
          const objId = obj.id;
          const objData = obj.toJSON();
          this.store.transact(
            () => {
              const storeObj = this.store.getMap(objId);
              for (const key in objData) {
                storeObj.set(key, objData[key]);
              }
            },
            this.provider,
            false
          );
        }
      });
    });
  }

  setNetwork(net: Network) {
    this.net = net;
  }

  async add(obj: NObject) {
    try {
      this.doc.transact(() => {
        this.index.set(obj.id, obj.id);
        obj.observe((event) => {
          if (event.transaction.origin !== this.provider) {
            const objId = obj.id;
            const objData = obj.toJSON();
            this.store.transact(
              () => {
                const storeObj = this.store.getMap(objId);
                for (const key in objData) {
                  storeObj.set(key, objData[key]);
                }
              },
              this.provider,
              false
            );
          }
        });
      }, this.provider);
    } catch (error) {
      console.error("Error adding object:", error);
      // Handle error appropriately, possibly notifying the user
    }
  }

  get(id: string): NObject | null {
    try {
      const objectId = this.index.get(id) as string;
      return objectId ? new NObject(this.doc, objectId) : null;
    } catch (error) {
      console.error("Error getting object:", error);
      // Handle error appropriately, possibly notifying the user
      return null;
    }
  }

  delete(id: string) {
    try {
      this.doc.transact(() => {
        this.index.delete(id);
        const obj = this.get(id);
        if (obj) {
          obj.unobserve();
        }
      }, this.provider);
    } catch (error) {
      console.error("Error deleting object:", error);
      // Handle error appropriately, possibly notifying the user
    }
  }

  createReply(parentId: string, name: string): NObject | null {
    return this.replyManager.createReply(parentId, name);
  }

  getReplies(parentId: string): NObject[] {
    const parent = this.get(parentId);
    if (!parent) return [];
    return parent.replies.map((id) => this.get(id)).filter((obj) => obj !== null) as NObject[];
  }

  // Add a method to get the network instance
  getNetwork(): Network | undefined {
    return this.net;
  }

  create(): NObject {
      const obj = new NObject(this.doc);
      this.add(obj);
      obj.generateKeyPair(); // Generate key pair for new object
      return obj;
  }
}
