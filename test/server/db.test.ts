import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {IndexeddbPersistence} from 'y-indexeddb';
import * as Y from 'yjs';
import DB from '../../src/db';
import NObject from '../../src/obj';

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
        const retrievedObj = db.get(obj.id);
        expect(retrievedObj).not.toBeNull();
        if (retrievedObj !== null) {
            expect(retrievedObj.toJSON()).toEqual(obj.toJSON());
        }
    });

    it('should delete an object and its references', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReply(obj2.id);
        expect(obj1.replies.toArray().includes(obj2.id)).toBe(true);

        db.delete(obj2.id);
        expect(db.get(obj2.id)).toBeNull();
        expect(obj1.replies.toArray().includes(obj2.id)).toBe(false);
    });

    it('should list objects', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        const list = db.list();
        expect(JSON.stringify(list)).toEqual(JSON.stringify([obj1, obj2]));
    });

    it('should filter objects by tag', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addTag('test');
        const list = db.listByTag('test');
        const s = list.map(x => JSON.stringify(x)).toString();
        expect(list.map(o => o.id)).not.toContain(obj2.id);
        expect(list.map(o => o.id)).toContain(obj1.id);
    });

    it('should filter objects by author', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj2.author = 'anotherUser';
        const list = db.listByAuthor('testuser');
        expect(JSON.stringify(list)).equals(JSON.stringify([obj1])); //and not obj2
    });

    it('should search objects', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.name = 'searchable';
        obj2.addTag('searchable');
        const list = db.search('searchable');
        expect(JSON.stringify(list)).equals(JSON.stringify([obj1,obj2]));
    });

    it('should create and retrieve replies', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id, 'Test Reply');
        if (reply === null) throw new Error('Reply creation failed');
        expect(reply).toBeInstanceOf(NObject);
        expect(obj.replies.toArray().includes(reply.id)).toBe(true);
        expect(JSON.stringify(db.getReplies(obj.id))).toEqual(JSON.stringify([reply]));
    });

    it('should retrieve repliesTo', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id, '...');
        if (reply === null) throw new Error('Reply creation failed');
        expect(JSON.stringify(db.getRepliesTo(reply.id))).toEqual(JSON.stringify([obj]));
    });

    it('should update "updated" timestamp on transact', () => {
        const obj = db.create();
        const initialUpdated = obj.updated;
        obj.name = 'Updated Name';
        setTimeout(()=>{
            const updatedUpdated = obj.updated;
            expect(updatedUpdated).toBeGreaterThan(initialUpdated);
        }, 500); // Increased timeout to 500ms
    });

    it('should set text with string', () => {
        const obj = db.create();
        obj.setText('String text');
        expect(obj.text.toString()).toEqual('String text');
        obj.setText('Y.Text content');
        expect(obj.text.toString()).toEqual('Y.Text content');
    });

    it('should set and get object text', async () => {
        const obj = db.create();
        await new Promise<void>((resolve) => {
            obj.doc.transact(() => {
                obj.setText('Test text');
                resolve();
            });
        });
        await new Promise((resolve) => setTimeout(resolve, 500)); // Increased timeout to 500ms
        const retrievedObj = db.get(obj.id);
        if (retrievedObj === null) throw new Error('Object is null');
        expect(retrievedObj.text.toString()).toEqual('Test text');
    });

    it('should set and get object name', () => {
        const obj = db.create();
        obj.name = 'Test Name';
        expect(obj.name).toEqual('Test Name');
    });

    it('should set and get object public status', () => {
        const obj = db.create();
        obj.public = true;
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
        expect(obj1.replies.toArray().includes(obj2.id)).toBe(true);
        obj1.removeReply(obj2.id);
        expect(obj1.replies.toArray().includes(obj2.id)).toBe(false);
    });

    it('should add and remove replyTo', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj2.addReplyTo(obj1.id);
        expect(obj2.repliesTo.toArray().includes(obj1.id)).toBe(true);
        obj2.removeReplyTo(obj1.id);
        expect(obj2.repliesTo.toArray().includes(obj1.id)).toBe(false);
    });

    // New tests for error handling and edge cases
    it('should return null for non-existent object', () => {
        expect(db.get('non-existent-id')).toBeNull();
    });

    it('should handle edge cases with long names and text', () => {
        const longName = 'a'.repeat(1000);
        const longText = new Y.Text('b'.repeat(10000));
        const obj = db.create();
        obj.text; // Access text to ensure initialization
        obj.name = longName;
        obj.setText(longText.toString());
        expect(obj.name).toEqual(longName);
        expect(obj.text.toString()).toEqual(longText.toString());
    });

    describe('Provider Integration', () => {
        it('should initialize provider and sync documents', async () => {
            const provider = new IndexeddbPersistence('testdb', ydoc);
            const db = new DB('testuser', provider);

            // Verify initial state
            expect(provider.synced).toBe(false);

            await provider.whenSynced;

            // Verify sync completion
            expect(provider.synced).toBe(true);
            expect(provider.doc).toBe(ydoc);
        });

        it('should log synced event when provider completes synchronization', () => {
            const provider = new IndexeddbPersistence('testdb', ydoc);
            const db = new DB('testuser', provider);
            const consoleSpy = vi.spyOn(console, 'log');

            db.provider.emit('synced', []);

            expect(consoleSpy).toHaveBeenCalledWith('Synced');
            expect(consoleSpy).toHaveBeenCalledTimes(1);
        });
    });

    // New test for error handling in createReply
    it('should log error for invalid name in createReply', () => {
        const obj = db.create();
        const consoleSpy = vi.spyOn(console, 'error');
        const reply = db.createReply(obj.id, 123 as any);
        expect(consoleSpy).toHaveBeenCalledWith('Invalid name:', 123);
        expect(reply).toBeNull();
    });
});
