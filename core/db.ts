import * as Y from "yjs";
import {IndexeddbPersistence} from "y-indexeddb";
import NObject from "./obj";
import {Network} from "./net";
import {Persistence} from "./persistence";
import {Replies} from "./replies";
import {Config} from "./config";

export default class DB {
    readonly doc: Y.Doc;
    public readonly index: Y.Map<string>;
    public readonly provider: IndexeddbPersistence & { awareness?: any };
    public readonly store: Y.Doc;
    private persistenceManager: Persistence;
    private replyManager: Replies;
    private readonly configManager: Config;
    private net?: Network; // Add network reference

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

    public get config(): Config {
        // Added public getter for configManager
        return this.configManager;
    }

    setNetwork(net: Network) {
        this.net = net;
    }

    async add(obj: NObject) {
        try {
            this.doc.transact(() => {
                this.index.set(obj.id, obj.id);
            }, this.provider);
        } catch (error) {
            console.error("Error adding object:", error);
        }
    }

    async get(id: string): Promise<NObject | null> {
        try {
            const objectId = this.index.get(id);
            if (!objectId) return null;

            return new NObject(this.doc, objectId);
        } catch (error) {
            console.error("Error getting object:", error);
            return null;
        }
    }

    delete(id: string) {
        try {
            this.doc.transact(() => {
                this.index.delete(id);
            }, this.provider);
        } catch (error) {
            console.error("Error deleting object:", error);
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
        // Generate key pair and sign the object upon creation
        obj.generateKeyPair().then(keyPair => {
            if (keyPair) obj.sign(keyPair.privateKey); // Sign the object with the private key
        });
        this.add(obj);
        return obj;
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
}
