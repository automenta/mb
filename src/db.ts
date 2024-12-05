// src/db.ts
import * as Y from 'yjs';
import {IndexeddbPersistence} from 'y-indexeddb';
import NObject from "./obj";
import {v4 as uuid} from "uuid";

export default class DB {
    readonly doc = new Y.Doc();
    public readonly index: Y.Map<any>;
    private readonly storage: IndexeddbPersistence;

    constructor(readonly userId: string) {
        this.userId = userId;
        this.index = this.doc.getMap('objects');
        this.storage = new IndexeddbPersistence(`todo_${userId}`, this.doc);
        this.storage.on('synced', () => console.log('Synced'));
    }

    create(): NObject {
        const obj = new NObject(this.doc, uuid());
        obj.init(this.userId);
        this.index.set(obj.id, obj.toJSON());
        return obj;
    }

    get(id: string): NObject | null {
        try { return new NObject(this.doc, id); }
        catch { return null; }
    }

    delete(id: string): boolean {
        const obj = this.get(id);
        if (!obj) return false;

        // Cleanup references
        this.list().forEach(other => {
            if (other.replies.has(id)) other.removeReply(id);
            if (other.repliesTo.has(id)) other.removeReplyTo(id);
        });

        this.doc.transact(() => this.index.delete(id));
        return true;
    }

    list = (): NObject[] =>
        Array.from(this.index.keys())
            .map(id => this.get(id))
            .filter((obj): obj is NObject => obj !== null);

    listByTag = (tag: string) =>
        this.list().filter(obj => obj.tags.includes(tag));

    listByAuthor = (author: string) =>
        this.list().filter(obj => obj.author === author);

    search = (query: string): NObject[] => {
        const q = query.toLowerCase();
        return this.list().filter(obj =>
            obj.name.toLowerCase().includes(q) ||
            obj.tags.some(tag => tag.toLowerCase().includes(q))
        );
    }

    createReply(parentId: string, name?: string): NObject | null {
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


    // observe = (fn: Observer): void => this.index.observe(fn);
    // observeObject = (id: string, fn: Observer): void =>
    //     this.get(id)?.observe(fn);

    objText(pageId: string) {
        const page = this.get(pageId);
        return page ? page.text : null;
    }

    objName(pageId:string, title:string):void {
        const page = this.get(pageId);
        if (page)
            page.name = title;
    }

    objPublic(pageId:string, isPublic:boolean):void {
        const page = this.get(pageId);
        if (page)
            page.public = isPublic;
    }

}
