// src/db.ts
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import NObject from './obj';
import { v4 as uuidv4 } from 'uuid';

class DB {
    readonly doc: Y.Doc;
    public readonly index: Y.Map<NObject>;

    constructor(
        readonly userID: string,
        provider?: IndexeddbPersistence// | LeveldbPersistence
    ) {
        this.doc = new Y.Doc();

        this.initializeProvider(provider);
        this.index = this.doc.getMap<NObject>('objects');
    }

    /**
     * Initializes the persistence provider.
     * @param provider The persistence provider to bind.
     */
    private initializeProvider(provider?: IndexeddbPersistence /*| LeveldbPersistence*/): void {
         if (!provider) {
            provider = new IndexeddbPersistence(`todo_${this.userID}`, this.doc);
        } else {
             if (provider.bindState)
                provider.bindState(this.doc.name, this.doc);
        }

        provider.on('synced', () => console.log('Synced'));
    }

    /**
     * Creates a new NObject and adds it to the index.
     * @returns The created NObject.
     */
    create(): NObject {
        const obj = NObject.create(this.doc, uuidv4());
        obj.init(this.userID);
        this.index.set(obj.id, obj.toJSON());
        return obj;
    }

    /**
     * Retrieves an NObject by ID.
     * @param id The ID of the object.
     * @returns The NObject if found, otherwise null.
     */
    get(id: string): NObject | null {
        var indexed = this.index.get(id);
        if (!indexed) return null;

        const m = this.doc.getMap(id);
        return m ? new NObject(id, this.doc, m) : null;
    }

    /**
     * Deletes an NObject by ID.
     * @param id The ID of the object to delete.
     * @returns True if deletion was successful, else false.
     */
    delete(id: string): boolean {
        const obj = this.get(id);
        if (!obj) return false;

        // Cleanup references
        this.list().forEach(other => {
            if (other.replies.has(id)) other.removeReply(id);
            if (other.repliesTo.has(id)) other.removeReplyTo(id);
        });

        this.doc.transact(() => {
            this.index.delete(id);
        });
        return true;
    }

    /**
     * Filters the list of NObjects based on a predicate.
     * @param predicate The predicate function to filter objects.
     * @returns An array of filtered NObjects.
     */
    filterList(predicate: (obj: NObject) => boolean): NObject[] {
        return Array.from(this.index.keys())
            .map(id => this.get(id))
            .filter((obj): obj is NObject => obj !== null && predicate(obj));
    }

    list = (): NObject[] => this.filterList(() => true);

    listByTag = (tag: string): NObject[] => this.filterList(obj => obj.tags.includes(tag));

    listByAuthor = (author: string): NObject[] => this.filterList(obj => obj.author === author);

    /**
     * Searches for NObjects matching the query.
     * @param query The search query string.
     * @returns An array of matching NObjects.
     */
    search(query: string): NObject[] {
        const q = query.toLowerCase();
        return this.filterList(obj =>
            obj.name.toLowerCase().includes(q) ||
            obj.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }

    /**
     * Creates a reply to an existing NObject.
     * @param parentId The ID of the parent object.
     * @param name Optional name for the reply.
     * @returns The created reply NObject if successful, else null.
     */
    createReply(parentId: string, name: string): NObject | null {
        // if (!parentId) {
        //     console.error('Invalid parentId:', parentId);
        //     return null;
        // }
        // if (name !== undefined) {
        //     console.error('Invalid name:', name);
        //     return null;
        // }

        const parent = this.get(parentId);
        if (!parent) return null;

        const reply = this.create();
        reply.name = name;
        reply.addReplyTo(parentId);
        parent.addReply(reply.id);
        return reply;
    }

    getReplies = (id: string): NObject[] =>
        Array.from(this.get(id)?.replies ?? [])
            .map(rid => this.get(rid))
            .filter((r): r is NObject => r !== null);

    getRepliesTo = (id: string): NObject[] =>
        Array.from(this.get(id)?.repliesTo ?? [])
            .map(pid => this.get(pid))
            .filter((p): p is NObject => p !== null);

    // Uncomment if observation needed
    // observe = (fn: Observer): void => this.index.observe(fn);
    // observeObject = (id: string, fn: Observer): void =>
    //     this.get(id)?.observe(fn);

    /**
     * Retrieves the text of an object by its page ID.
     * @param pageId The ID of the page.
     * @returns The text of the object if found, else null.
     */
    objText(pageId: string): Y.Text | null {
        const page = this.get(pageId);
        return page ? page.text : null;
    }

    /**
     * Sets the name of an object.
     * @param pageId The ID of the page.
     * @param title The new title.
     */
    objName(pageId: string, title: string): void {
        const page = this.get(pageId);
        if (page)
            page.name = title;
    }

    /**
     * Sets the public status of an object.
     * @param pageId The ID of the page.
     * @param isPublic The public status.
     */
    objPublic(pageId: string, isPublic: boolean): void {
        const page = this.get(pageId);
        if (page)
            page.public = isPublic;
    }
}

export default DB;