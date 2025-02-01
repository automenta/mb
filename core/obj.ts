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
    this.metadata = this.getOrInitSubMap('metadata', [
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

  protected getOrInitSubMap(key: string, initialData: [string, any][] = []): Y.Map<any> {
    return (this.root.get(key) instanceof Y.Map ? this.root.get(key) : this.root.set(key, new Y.Map()).get(key)) as Y.Map<any>;
  }

  // Helper to update metadata within a transaction
  private updateMetadata(updates: { [key: string]: any }) {
    this.doc.transact(() => {
      for (const key in updates) {
        this.metadata.set(key, updates[key]);
      }
      this.metadata.set('updated', Date.now());
    });
  }

  // Getters
  get created() { return this.metadata.get('created'); }
  get updated() { return this.metadata.get('updated'); }
  get name() { return this.metadata.get('name'); }
  get public() { return this.metadata.get('public'); }
  get isQuery() { return this.metadata.get('isQuery'); }
  get author() { return this.metadata.get('author'); }
  get text(): Y.Text {
      let content = this.root.get('content');
      if (!(content instanceof Y.Text)) {
          content = new Y.Text();
          content.insert(0, 'Test text');
          this.root.set('content', content);
      }
      return content;
  }
  get tags() { return this.metadata.get('tags'); }
  get sharedWith(): Y.Array<string> { return this.metadata.get('sharedWith'); }
  get replies(): Y.Array<string> { return this.links.get('reply'); }
  get repliesTo(): Y.Array<string> { return this.links.get('replyTo'); }

  // Setters
  set name(v: string) { this.updateMetadata({ name: v }); }
  set public(v: boolean) { this.updateMetadata({ public: v }); }
  set isQuery(v: boolean) { this.updateMetadata({ isQuery: v }); }
  set author(v: string) { this.updateMetadata({ author: v }); }
    set text(newText: string) {
        this.doc.transact(() => {
            const ytext = this.text;
            ytext.delete(0, ytext.length);
            ytext.insert(0, newText);
            this.updateMetadata({});
        });
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

  // Methods using the helpers
  addTag(tag: string) { this.updateArray(this.tags, tag, true); }
  removeTag(tag: string) { this.updateArray(this.tags, tag, false); }
  addReply(id: string) { this.updateArray(this.replies, id, true); }
  removeReply(id: string) { this.updateArray(this.replies, id, false); }
  addReplyTo(id: string) { this.updateArray(this.repliesTo, id, true); }
  removeReplyTo(id: string) { this.updateArray(this.repliesTo, id, false); }
  shareWith(userId: string) { this.updateArray(this.sharedWith, userId, true); }
  unshareWith(userId: string) { this.updateArray(this.sharedWith, userId, false); }

   set text(newText: string) {
       this.doc.transact(() => {
           const ytext = this.text;
           ytext.delete(0, ytext.length);
           ytext.insert(0, newText);
           this.updateMetadata({});
           this.generateKeyPair().then(keyPair => { // Regenerate key pair and sign on text change - for demonstration only
               if (keyPair) {
                   this.sign(keyPair.privateKey);
               }
           });
       });
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

  toJSON(): any {
    return this.root.toJSON();
  }

  getMetadata(key: string): any {
      return this.metadata.get(key);
  }

  setMetadata(key: string, value: any): void {
    this.updateMetadata({ [key]: value });
  }
}
