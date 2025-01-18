import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import DB from '../src/db';
import NObject from '../src/obj';

vi.mock('y-indexeddb');

describe('DB', () => {
    let db: DB;
    let ydoc: Y.Doc;
    let provider: IndexeddbPersistence;

    beforeEach(() => {
        ydoc = new Y.Doc();
        provider = new IndexeddbPersistence('testdb', ydoc);
        db = new DB('testuser', provider);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should create and retrieve an object', () => {
        const obj = db.create();
        expect(obj).toBeInstanceOf(NObject);
        expect(db.get(obj.id)).toEqual(obj);
    });

    it('should delete an object and its references', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReply(obj2.id);
        expect(obj1.replies.has(obj2.id)).toBe(true);

        db.delete(obj2.id);
        expect(db.get(obj2.id)).toBeNull();
        expect(obj1.replies.has(obj2.id)).toBe(false);
    });

    it('should list objects', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        const list = db.list();
        expect(list).toContain(obj1);
        expect(list).toContain(obj2);
    });

    it('should filter objects by tag', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addTag('test');
        const list = db.listByTag('test');
        expect(list).toContain(obj1);
        expect(list).not.toContain(obj2);
    });

    it('should filter objects by author', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj2.author = 'anotherUser';
        const list = db.listByAuthor('testuser');
        expect(list).toContain(obj1);
        expect(list).not.toContain(obj2);
    });

    it('should search objects', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.name = 'searchable';
        obj2.addTag('searchable');
        const list = db.search('searchable');
        expect(list).toContain(obj1);
        expect(list).toContain(obj2);
    });

    it('should create and retrieve replies', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id, 'Test Reply');
        expect(reply).toBeInstanceOf(NObject);
        expect(obj.replies.has(reply.id)).toBe(true);
        expect(db.getReplies(obj.id)).toContain(reply);
    });

    it('should retrieve repliesTo', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id);
        expect(db.getRepliesTo(reply.id)).toContain(obj);
    });

    it('should update "updated" timestamp on transact', () => {
        const obj = db.create();
        const initialUpdated = obj.updated;
        obj.name = 'Updated Name';
        const updatedUpdated = obj.updated;
        expect(updatedUpdated).toBeGreaterThan(initialUpdated);
    });

    it('should set and get object text', () => {
        const obj = db.create();
        const text = new Y.Text('Test text');
        obj.setText(text);
        expect(db.objText(obj.id).toString()).toEqual('Test text');
    });

    it('should set text with string or Y.Text', () => {
        const obj = db.create();
        obj.setText('String text');
        expect(obj.text.toString()).toEqual('String text');
        const ytext = new Y.Text('Y.Text content');
        obj.setText(ytext);
        expect(obj.text.toString()).toEqual('Y.Text content');
    });

    it('should set and get object public status', () => {
        const obj = db.create();
        obj.setText(text);
        expect(db.objText(obj.id).toString()).toEqual('Test text');
    });

    it('should set and get object name', () => {
        const obj = db.create();
        db.objName(obj.id, 'Test Name');
        expect(obj.name).toEqual('Test Name');
    });

    it('should set and get object public status', () => {
        const obj = db.create();
    db.objPublic(obj.id, true);
    expect(obj.public).toEqual(true);
});

it('should add and remove tags', () => {
    const obj = db.create();
    obj.addTag('tag1');
    expect(obj.tags).toContain('tag1');
    obj.removeTag('tag1');
    expect(obj.tags).not.toContain('tag1');
});

it('should add and remove replies', () => {
    const obj1 = db.create();
    const obj2 = db.create();
    obj1.addReply(obj2.id);
    expect(obj1.replies.has(obj2.id)).toBe(true);
    obj1.removeReply(obj2.id);
    expect(obj1.replies.has(obj2.id)).toBe(false);
});

it('should add and remove replyTo', () => {
    const obj1 = db.create();
    const obj2 = db.create();
    obj2.addReplyTo(obj1.id);
    expect(obj2.repliesTo.has(obj1.id)).toBe(true);
    obj2.removeReplyTo(obj1.id);
    expect(obj2.repliesTo.has(obj1.id)).toBe(false);
});
});
