import * as Y from 'yjs';
import {uuidv4} from "lib0/random";

export default class NObject {
  public readonly id: string;
  public readonly doc: Y.Doc;
  public readonly root: Y.Map<any>;
  protected readonly meta Y.Map<any>;
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
      ['sharedWith', new Y.Array<string>()]
    ]);
    this.links = this.getOrInitSubMap('links', [
      ['reply', new Y.Array<string>()],
      ['replyTo', new Y.Array<string>()]
    ]);

    this.getOrInitSubMap('content'); // Ensure content map is initialized
  }

  protected getOrInitSubMap(key: string, initialData: [string, any][] = []): Y.Map<any> {
    return this.root.has(key) && this.root.get(key) instanceof Y.Map ? this.root.get(key) : this.root.set(key, new Y.Map<any>(initialData)) as Y.Map<any>;
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
  get created(): number { return this.metadata.get('created'); }
  get updated(): number { return this.metadata.get('updated'); }
  get name(): string { return this.metadata.get('name'); }
  get public(): boolean { return this.metadata.get('public'); }
  get isQuery(): boolean { return this.metadata.get('isQuery'); }
  get author(): string { return this.metadata.get('author'); }
  get text(): Y.Text {
      if (!this.root.has('content') || !(this.root.get('content') instanceof Y.Text)) {
          this.root.set('content', new Y.Text());
      }
      return this.root.get('content');
  }
  get tags(): Y.Array<string> { return this.metadata.get('tags'); }
  get sharedWith(): Y.Array<string> { return this.metadata.get('sharedWith'); }
  get replies(): Y.Array<string> { return this.links.get('reply') || new Y.Array<string>(); }
  get repliesTo(): Y.Array<string> { return this.links.get('replyTo') || new Y.Array<string>(); }

  // Setters
  set name(v: string) { this.updateMetadata({ name: v }); }
  set public(v: boolean) { this.updateMetadata({ public: v }); }
  set isQuery(v: boolean) { this.updateMetadata({ isQuery: v }); }
  set author(v: string) { this.updateMetadata({ author: v }); }
  set text(newText: string) {
      this.doc.transact(() => {
          const t = this.text;
          t.delete(0, t.length);
          t.insert(0, newText);
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
        arr.delete(index, 1);
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

  getMetadataKeys(): string[] {
    return Array.from(this.metadata.keys());
  }

  setMetadata(key: string, value: any): void {
    this.updateMetadata({ [key]: value });
  }
}
