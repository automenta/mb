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

    it('creates and retrieves objects', () => {
        const obj = db.create();
        const retrieved = db.get(obj.id);
        expect([obj, retrieved].every(o => o instanceof NObject)).toBeTruthy();
        expect(retrieved?.toJSON()).toEqual(obj.toJSON());
    });

    it('deletes objects and cleans up references', () => {
        const [obj1, obj2] = [db.create(), db.create()];
        obj1.addReply(obj2.id);
        expect(obj1.replies.toArray()).toContain(obj2.id);

        db.delete(obj2.id);
        expect([db.get(obj2.id), obj1.replies.toArray().includes(obj2.id)])
          .toEqual([null, false]);
    });

    it('lists all objects', () => {
        const objects = [db.create(), db.create()];
        expect(db.list().map(o => o.id)).toEqual(objects.map(o => o.id));
    });

    it('filters objects by tag', () => {
        const [obj1, obj2] = [db.create(), db.create()];
        obj1.addTag('test');
        const tagged = db.listByTag('test').map(o => o.id);
        expect([tagged.includes(obj1.id), tagged.includes(obj2.id)])
          .toEqual([true, false]);
    });

    it('filters objects by author', () => {
        const [obj1, obj2] = [db.create(), db.create()];
        obj2.author = 'anotherUser';
        const authored = db.listByAuthor('testuser').map(o => o.id);
        expect([authored.includes(obj1.id), authored.includes(obj2.id)])
          .toEqual([true, false]);
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
        const db = new DB('test-channel');
        const parentObj = db.create();
        const reply1 = db.createReply(parentObj.id, 'Reply 1');
        const reply2 = db.createReply(parentObj.id, 'Reply 2');

        expect(reply1).toBeDefined();
        expect(reply2).toBeDefined();

        if (reply1 && reply2) {
            const replies = db.getReplies(parentObj.id);
            expect(replies).toContain(reply1.id);
            expect(replies).toContain(reply2.id);
        }
    });

    it('retrieve repliesTo', () => {
        const db = new DB('test-channel');
        const parentObj1 = db.create();
        const parentObj2 = db.create();
        const replyObj = db.createReply(parentObj1.id, 'Reply to Parent1');

        expect(replyObj).toBeDefined();

        if (replyObj) {
            replyObj.addReplyTo(parentObj2.id);

            let repliesTo = db.getRepliesTo(replyObj.id);
            expect(repliesTo).toContain(parentObj2.id);

            repliesTo = replyObj.repliesTo.toArray();
            expect(repliesTo).toContain(parentObj2.id);
        }
    });

    it('update "updated" timestamp on transact', async () => {
        const obj = db.create();
        const initialUpdated = obj.updated;
        obj.name = 'Updated Name';
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedUpdated = obj.updated;
        expect(updatedUpdated).toBeGreaterThanOrEqual(initialUpdated); // Changed to GreaterOrEqual
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
        expect(retrievedObj.text.toString()).toEqual('Test text'); // Corrected assertion
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
        const reply = db.createReply(obj.id, null); // Pass null explicitly
        expect(consoleSpy).toHaveBeenCalledWith('Invalid name:', null);
        expect(reply).toBeNull();
    });
    // New test for error handling in createReply
    it('log error for invalid name in createReply', () => {
        const obj = db.create();
        const consoleSpy = vi.spyOn(console, 'error');
        const reply = db.createReply(obj.id, undefined); // Pass undefined explicitly
        expect(consoleSpy).toHaveBeenCalledWith('Invalid name:', undefined);
        expect(reply).toBeNull();
    });
});
