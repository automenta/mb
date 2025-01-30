import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IndexeddbPersistence} from 'y-indexeddb';
import * as Y from 'yjs';
import DB from '../../core/db';
import NObject from '../../core/obj';

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

    it('create and retrieve an object', () => {
        const obj = db.create();
        expect(obj).toBeInstanceOf(NObject);
        const retrievedObj = db.get(obj.id);
        expect(retrievedObj).not.toBeNull();
        if (retrievedObj !== null) {
            expect(retrievedObj.toJSON()).toEqual(obj.toJSON());
        }
    });

    it('delete an object and its references', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReply(obj2.id);
        expect(obj1.replies.toArray().includes(obj2.id)).toBe(true);

        db.delete(obj2.id);
        expect(db.get(obj2.id)).toBeNull();
        expect(obj1.replies.toArray().includes(obj2.id)).toBe(false);
    });

    it('list objects', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        const list = db.list();
        expect(JSON.stringify(list)).toEqual(JSON.stringify([obj1, obj2]));
    });

    it('filter objects by tag', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addTag('test');
        const list = db.listByTag('test');
        const s = list.map(x => JSON.stringify(x)).toString();
        expect(list.map(o => o.id)).not.toContain(obj2.id);
        expect(list.map(o => o.id)).toContain(obj1.id);
    });

    it('filter objects by author', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj2.author = 'anotherUser';
        const list = db.listByAuthor('testuser');
        expect(JSON.stringify(list)).equals(JSON.stringify([obj1])); //and not obj2
    });

    it('search objects', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.name = 'searchable';
        obj2.addTag('searchable');
        const list = db.search('searchable');
        expect(JSON.stringify(list)).toEqual(JSON.stringify([obj1,obj2]));
    });

    it('create and retrieve replies', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id, 'Test Reply');
        expect(reply).toBeInstanceOf(NObject);
        expect(reply.name).toEqual('Test Reply');
        expect(obj.replies.toArray()).toContain(reply.id);
        expect(db.getReplies(obj.id)).toEqual([reply]);
    });

    it('retrieve repliesTo', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id, 'Test Reply');
        if (reply === null) throw new Error('Reply creation failed');
        expect(db.getRepliesTo(reply.id)).toEqual([obj]);
    });

    it('update "updated" timestamp on transact', async () => {
        const obj = db.create();
        const initialUpdated = obj.updated;
        obj.name = 'Updated Name';
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedUpdated = obj.updated;
        expect(updatedUpdated).toBeGreaterThan(initialUpdated);
    });

    it('set text with string', () => {
        const obj = db.create();
        obj.setText('String text');
        expect(obj.text.toString()).toEqual('String text');
        obj.setText('Y.Text content');
        expect(obj.text.toString()).toEqual('Y.Text content');
    });

    it('set and get object text', () => {
        const obj = db.create();
        obj.setText('Test text');
        const retrievedObj = db.get(obj.id);
        if (retrievedObj === null) throw new Error('Object is null');
        expect(retrievedObj.text.toString()).toEqual('Test text');
    });

    it('set and get object name', () => {
        const obj = db.create();
        obj.name = 'Test Name';
        expect(obj.name).toEqual('Test Name');
    });

    it('set and get object public status', () => {
        const obj = db.create();
        obj.public = true;
        expect(obj.public).toEqual(true);
    });

    it('add and remove tags', () => {
        const obj = db.create();
        obj.addTag('tag1');
        expect(obj.tags).toContain('tag1');
        obj.removeTag('tag1');
        expect(obj.tags).not.toContain('tag1');
    });

    it('add and remove replies', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReply(obj2.id);
        expect(obj1.replies.toArray()).toContain(obj2.id);
        obj1.removeReply(obj2.id);
        expect(obj1.replies.toArray()).not.toContain(obj2.id);
    });

    it('add and remove replyTo', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj2.addReplyTo(obj1.id);
        expect(obj2.repliesTo.toArray()).toContain(obj1.id);
        obj2.removeReplyTo(obj1.id);
        expect(obj2.repliesTo.toArray()).not.toContain(obj1.id);
    });

    // New tests for error handling and edge cases
    it('return null for non-existent object', () => {
        expect(db.get('non-existent-id')).toBeNull();
    });

    it('handle edge cases with long names and text', () => {
        const longName = 'a'.repeat(1000);
        const longText = 'b'.repeat(10000);
        const obj = db.create();
        obj.name = longName;
        obj.setText(longText);
        expect(obj.name).toEqual(longName);
        expect(obj.text.toString()).toEqual(longText);
    });

    describe('Provider Integration', () => {
        it('initialize provider and sync documents', async () => {
            const provider = new IndexeddbPersistence('testdb', ydoc);
            const db = new DB('testuser', provider);

            // Verify initial state
            expect(provider.synced).toBe(false);

            await provider.whenSynced;

            // Verify sync completion
            expect(provider.synced).toBe(true);
            expect(provider.doc).toBe(ydoc);
        });

        it('log synced event when provider completes synchronization', () => {
            const provider = new IndexeddbPersistence('testdb', ydoc);
            const db = new DB('testuser', provider);
            const consoleSpy = vi.spyOn(console, 'log');

            db.provider.emit('synced', []);

            expect(consoleSpy).toHaveBeenCalledWith('Synced');
            expect(consoleSpy).toHaveBeenCalledTimes(1);
        });
    });

    // New test for error handling in createReply
    it('log error for invalid name in createReply', () => {
        const obj = db.create();
        const consoleSpy = vi.spyOn(console, 'error');
        const reply = db.createReply(obj.id, null as any);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid name:', null);
        expect(reply).toBeNull();
    });
});

            db.provider.emit('synced', []);

            expect(consoleSpy).toHaveBeenCalledWith('Synced');
            expect(consoleSpy).toHaveBeenCalledTimes(1);
        });
    });

    // New test for error handling in createReply
    it('log error for invalid name in createReply', () => {
        const obj = db.create();
        const consoleSpy = vi.spyOn(console, 'error');
        const reply = db.createReply(obj.id, 123 as any);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid name:', 123);
        expect(reply).toBeNull();
    });
});
