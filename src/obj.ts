import * as Y from "yjs";

type Observer = (events: Y.YEvent<any>[]) => void;

export default class NObject {
    public readonly root: Y.Map<any>;

    constructor(private doc: Y.Doc, public id:string) {
        this.id = id;
        this.root = doc.getMap(id);
    }

    public init(): void {
        const now = Date.now();
        this.doc.transact(() => {
            this.root.set('content', new Y.Text());

            const links = new Y.Map();
            links.set('reply', new Y.Array());
            links.set('replyTo', new Y.Array());
            this.root.set('links', links);

            const meta = new Y.Map();
            meta.set('id', this.id);
            meta.set('name', '?');
            meta.set('created', now);
            meta.set('updated', now);
            meta.set('public', false);
            meta.set('author', '');
            meta.set('tags', new Y.Array());
            this.root.set('metadata', meta);
        });
    }

    // Transactional property access
    private transact<T>(fn: () => T): T {
        return this.doc.transact(() => {
            const result = fn();
            this.root.get('metadata').set('updated', Date.now());
            return result;
        });
    }

    get created():number { return this.root.get('metadata').get('created'); }
    get updated():number { return this.root.get('metadata').get('updated'); }

    get name():string { return this.root.get('metadata').get('name'); }
    set name(v: string) { this.transact(() => this.root.get('metadata').set('name', v)); }

    get public():boolean { return this.root.get('metadata').get('public'); }
    set public(v: boolean) { this.transact(() => this.root.get('metadata').set('public', v)); }

    get author():string { return this.root.get('metadata').get('author'); }
    set author(v: string) { this.transact(() => this.root.get('metadata').set('author', v)); }

    get text():Y.Text { return this.root.get('content'); }
    setText(newText: string | Y.Text) {
        this.transact(() => {
            const t = this.text;
            t.delete(0, t.length);
            t.insert(0, newText.toString());
        });
    }

    // Collections with automatic transactions
    get tags():Array<string> { return this.root.get('metadata').get('tags').toArray(); }
    get replies():Set<string> { return new Set(this.root.get('links').get('reply')); }
    get repliesTo():Set<string> { return new Set(this.root.get('links').get('replyTo')); }

    private updateCollection(type: 'tags' | 'reply' | 'replyTo', value: string, add: boolean) {
        this.transact(() => {
            let arr = type === 'tags'
                ? this.root.get('metadata').get('tags')
                : this.root.get('links').get(type);

            if (add) {
                arr.push([value]);
            } else if (!add) {
                const idx = arr.indexOf(value);
                if (idx !== -1) arr.delete(idx, 1);
            }
        });
    }

    // Collection operations
    addTag = (tag: string) => this.updateCollection('tags', tag, true);
    removeTag = (tag: string) => this.updateCollection('tags', tag, false);
    addReply = (id: string) => this.updateCollection('reply', id, true);
    removeReply = (id: string) => this.updateCollection('reply', id, false);
    addReplyTo = (id: string) => this.updateCollection('replyTo', id, true);
    removeReplyTo = (id: string) => this.updateCollection('replyTo', id, false);

    toJSON(): any {
        return {
            metadata: {
                id: this.id,
                name: this.name,
                created: this.created,
                updated: this.updated,
                public: this.public,
                author: this.author,
                tags: this.tags
            },
            text: this.text.toString(),
            links: {
                reply: this.replies,
                replyTo: this.repliesTo
            }
        };
    }

    observe(fn: Observer) {
        this.root.observeDeep(fn);
    }

    unobserve(fn: Observer) {
        this.root.unobserveDeep(fn);
    }
}