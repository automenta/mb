import * as Y from 'yjs';
import {uuidv4} from "lib0/random";

export default class NObject {
  public readonly id: string;
  public readonly doc: Y.Doc;
  public readonly root: Y.Map<any>;
  protected readonly meta: Y.Map<any>;
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
      ['tags', new Y.Array<string>()],
      ['sharedWith', new Y.Array<string>()]
    ]);
    this.links = this.getOrInitSubMap('links', [
      ['reply', new Y.Array<string>()],
      ['replyTo', new Y.Array<string>()]
    ]);

    this.getOrInitSubMap('content'); // Ensure content map is initialized
  }
  private getOrInitSubMap(key: string, initialData: [string, any][] = []): Y.Map<any> {
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

  // Method to ensure content is loaded
  loadContent(): void {
      if (!this.root.has('content')) {
          this.root.set('content', new Y.Text());
      }
      this.text; // Accessing the text property to ensure Y.Text is initialized
  }

  // Getters
    get created(): number { return this.metadata.get('created'); }
    get updated(): number { return this.metadata.get('updated'); }
    get name(): string { return this.metadata.get('name'); }
    get public(): boolean { return this.metadata.get('public'); }
    get author(): string { return this.metadata.get('author'); }
    get text(): Y.Text {
        if (!this.root.has('content') || !(this.root.get('content') instanceof Y.Text)) { // Check if content exists and is Y.Text
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
    set author(v: string) { this.updateMetadata({ author: v }); }
    set text(newText: string) {
        this.doc.transact(() => {
            const t = this.text;
            t.delete(0, t.length);
            t.insert(0, newText);
            this.updateMetadata({});
        });
    }

    setText(newText: string | Y.Text) {
      this.doc.transact(() => {
        const t = this.text;
        t.delete(0, t.length);
        t.insert(0, newText instanceof Y.Text ? newText.toString() : newText);
        this.updateMetadata({}); // Just to update 'updated'
      });
    }

    // Helper method for adding to Y.Array
    private updateArray(arr: Y.Array<string>, item: string, add: boolean) {
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

    async evolveToAgent(): Promise<void> {
      // Stub for future implementation of thought evolution to agent
      console.log(`Evolving object ${this.id} to agent... (not implemented yet)`);
      // Future implementation will involve transforming this NObject into an "Agent" object
      // and setting up necessary mechanisms for goal automation and achievement.
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
