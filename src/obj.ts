import * as Y from 'yjs';
import {uuidv4} from "lib0/random";

export default class NObject {
  public readonly id: string;
  private readonly doc: Y.Doc;
  public readonly root: Y.Map<any>;
  private readonly metadata: Y.Map<any>;
  private readonly links: Y.Map<Y.Array<string>>;

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
      ['author', ''],
      ['tags', new Y.Array<string>()]
    ]);
    this.links = this.getOrInitSubMap('links', [
      ['reply', new Y.Array<string>()],
      ['replyTo', new Y.Array<string>()]
    ]);

    if (!this.root.has('content'))
      this.root.set('content', new Y.Text());
  }
  private getOrInitSubMap(key: string, initialData: [string, any][] = []): Y.Map<any> {
    let subMap = this.root.get(key);
    if (!subMap) {
      subMap = new Y.Map<any>(initialData);
      this.root.set(key, subMap);
    }
    return subMap;
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
  get author(): string { return this.metadata.get('author'); }
  get text(): Y.Text { return this.root.get('content'); }
  get tags(): Y.Array<string> { return this.metadata.get('tags'); }
  get replies(): Y.Array<string> { return this.links.get('reply'); }
  get repliesTo(): Y.Array<string> { return this.links.get('replyTo'); }

  // Setters
  set name(v: string) { this.updateMetadata({ name: v }); }
  set public(v: boolean) { this.updateMetadata({ public: v }); }
  set author(v: string) { this.updateMetadata({ author: v }); }

  setText(newText: string | Y.Text) {
    this.doc.transact(() => {
      const t = this.text;
      t.delete(0, t.length);
      t.insert(0, newText.toString());
      this.updateMetadata({}); // Just to update 'updated'
    });
  }

  // Helper method for adding to Y.Array
  private addToArray(arr: Y.Array<string>, item: string) {
    this.doc.transact(() => {
      if (!arr.toArray().includes(item)) {
        arr.push([item]);
        this.updateMetadata({}); // Just to update 'updated'
      }
    });
  }

  // Helper method for removing from Y.Array
  private removeFromArray(arr: Y.Array<string>, item: string) {
    this.doc.transact(() => {
      const index = arr.toArray().indexOf(item);
      if (index > -1) {
        arr.delete(index, 1);
        this.updateMetadata({}); // Just to update 'updated'
      }
    });
  }

  // Methods using the helpers
  addTag(tag: string) { this.addToArray(this.tags, tag); }
  removeTag(tag: string) { this.removeFromArray(this.tags, tag); }
  addReply(id: string) { this.addToArray(this.replies, id); }
  removeReply(id: string) { this.removeFromArray(this.replies, id); }
  addReplyTo(id: string) { this.addToArray(this.repliesTo, id); }
  removeReplyTo(id: string) { this.removeFromArray(this.repliesTo, id); }

  observe(fn: (events: Y.YEvent<any>[]) => void) {
    this.root.observeDeep(fn);
  }

  unobserve(fn: (events: Y.YEvent<any>[]) => void) {
    this.root.unobserveDeep(fn);
  }

  toJSON(): any {
    return this.root.toJSON();
  }
}