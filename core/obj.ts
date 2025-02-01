import * as Y from 'yjs';
import {uuidv4} from "lib0/random";

export default class NObject {
    public readonly id: string;
    public readonly doc: Y.Doc;
    public readonly root: Y.Map<any>;
    protected readonly meta: Y.Map<any>;
    protected readonly links: Y.Map<Y.Array<string>>;

    constructor(doc: Y.Doc, id?: string) {
        this.doc = doc;
        this.id = id || uuidv4();
        this.root = doc.getMap(this.id);
        this.meta = this.getOrInitSubMap('metadata', [
            ['id', this.id],
            ['name', '?'],
            ['created', Date.now()],
            ['updated', Date.now()],
            ['public', false],
            ['isQuery', false],
            ['author', ''],
            ['tags', new Y.Array<string>()],
            ['signature', ''], // Add signature metadata field
            ['publicKey', ''], // Add publicKey metadata field
            ['sharedWith', new Y.Array<string>()]
        ]);
        this.links = this.getOrInitSubMap('links', [
            ['reply', new Y.Array<string>()],
            ['replyTo', new Y.Array<string>()]
        ]);

        this.getOrInitSubMap('content'); // Ensure content map is initialized
    }

    // Getters
    get created() {
        return this.meta.get('created');
    }

    get updated() {
        return this.meta.get('updated');
    }

    get name() {
        return this.meta.get('name');
    }

    // Setters
    set name(v: string) {
        this.updateMetadata({name: v});
    }

    get public() {
        return this.meta.get('public');
    }

    set public(v: boolean) {
        this.updateMetadata({public: v});
    }

    get isQuery() {
        return this.meta.get('isQuery');
    }

    set isQuery(v: boolean) {
        this.updateMetadata({isQuery: v});
    }

    get author() {
        return this.meta.get('author');
    }

    set author(v: string) {
        this.updateMetadata({author: v});
    }

    get text(): Y.Text {
        let content = this.root.get('content');
        if (!(content instanceof Y.Text)) {
            content = new Y.Text();
            content.insert(0, 'Test text');
            this.root.set('content', content);
        }
        return content;
    }

    set text(newText: string) {
        this.doc.transact(() => {
            const ytext = this.text;
            ytext.delete(0, ytext.length);
            ytext.insert(0, newText);
            this.updateMetadata({});
        });
    }

    get tags() {
        return this.meta.get('tags');
    }

    get sharedWith(): Y.Array<string> {
        return this.meta.get('sharedWith');
    }

    get replies(): Y.Array<string> {
        return this.links.get('reply');
    }

    get repliesTo(): Y.Array<string> {
        return this.links.get('replyTo');
    }

    // Methods using the helpers
    addTag(tag: string) {
        this.updateArray(this.tags, tag, true);
    }

    removeTag(tag: string) {
        this.updateArray(this.tags, tag, false);
    }

    addReply(id: string) {
        this.updateArray(this.replies, id, true);
    }

    removeReply(id: string) {
        this.updateArray(this.replies, id, false);
    }

    addReplyTo(id: string) {
        this.updateArray(this.repliesTo, id, true);
    }

    removeReplyTo(id: string) {
        this.updateArray(this.repliesTo, id, false);
    }

    shareWith(userId: string) {
        this.updateArray(this.sharedWith, userId, true);
    }

    unshareWith(userId: string) {
        this.updateArray(this.sharedWith, userId, false);
    }

    async generateKeyPair() {
        try {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-256" // or "P-384" or "P-521"
                },
                true, // extractable
                ["sign", "verify"] // key usages
            );
            // Store public key in metadata (consider encoding it to a string format like base64)
            const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
            this.setMetadata('publicKey', JSON.stringify(publicKeyJwk)); // Store public key as stringified JWK
            return keyPair; // Return the key pair (privateKey and publicKey) - IMPORTANT: Handle privateKey securely outside NObject
        } catch (error) {
            console.error("Error generating key pair:", error);
        }
    }

    observe(fn: (events: Y.YEvent<any>[]) => void) {
        this.root.observeDeep(fn);
    }

    unobserve(fn: (events: Y.YEvent<any>[]) => void) {
        this.root.unobserveDeep(fn);
    }

    protected getOrInitSubMap(key: string, initialData: [string, any][] = []): Y.Map<any> {
        let ymap = this.root.get(key);
        if (!(ymap instanceof Y.Map)) {
            ymap = new Y.Map();
            this.root.set(key, ymap);
        }
        // Set initial data if provided
        if (initialData.length > 0) {
            this.doc.transact(() => {
                initialData.forEach(([k, v]) => {
                    if (!ymap.has(k)) {
                        ymap.set(k, v);
                    }
                });
            });
        }
        return ymap;
    }

    // Helper method for adding to Y.Array
    protected updateArray(arr: Y.Array<string>, item: string, add: boolean) {
        this.doc.transact(() => {
            const index = arr.toArray().indexOf(item);
            if (add && index === -1) {
                arr.push([item]);
            } else if (!add && index > -1) {
                arr.delete(index, 1); // Use index directly to delete
            }
            this.updateMetadata({}); // Just to update 'updated'
        });
    }

    // Helper to update metadata within a transaction
    private updateMetadata(updates: { [key: string]: any }) {
        this.doc.transact(() => {
            for (const key in updates) {
                this.meta.set(key, updates[key]);
            }
            this.meta.set('updated', Date.now());
        });
    }
}
