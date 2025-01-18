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
        expect(db.get(obj.id).root).toEqual(obj.root);
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
        expect(list).toContainEqual(obj1);
        expect(list).toContainEqual(obj2);
    });

    it('should filter objects by tag', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addTag('test');
        const list = db.listByTag('test');
        const s = list.map(x=>JSON.stringify(x)).toString();
        expect(s.indexOf(obj2.id)).equals(-1); //expect(list).not.toContain(obj2);
        expect(s.indexOf(obj1.id)).not.equals(-1); //expect(list).toContain(obj1);
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
        if (reply === null) throw new Error('Reply creation failed');
        expect(reply).toBeInstanceOf(NObject);
        if (reply !== null) {
            expect(obj.replies.has(reply.id)).toBe(true);
        }
        expect(db.getReplies(obj.id)).toContain(reply);
    });

    it('should retrieve repliesTo', () => {
        const obj = db.create();
        const reply = db.createReply(obj.id);
        if (reply === null) throw new Error('Reply creation failed');
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
        const objTextValue = db.objText(obj.id);
        if (objTextValue === null) throw new Error('Object text is null');
        expect(objTextValue.toString()).toEqual('Test text');
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
        const text = new Y.Text('Test text');
        obj.setText(text);
        const objTextValue = db.objText(obj.id);
        if (objTextValue === null || objTextValue.toString().length===0) throw new Error('Object text is null');
        expect(objTextValue.toString()).toEqual('Test text');
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

    // New tests for error handling and edge cases
    it('should return null for non-existent object', () => {
        expect(db.get('non-existent-id')).toBeNull();
    });

    it('should handle invalid inputs gracefully', () => {
        expect(() => db.createReply('invalid-id')).toThrow();
        expect(() => db.objName('invalid-id', 'Name')).toThrow();
    });

    it('should handle edge cases with long names and text', () => {
        const longName = 'a'.repeat(1000);
        const longText = new Y.Text('b'.repeat(10000));
        const obj = db.create();
        db.objName(obj.id, longName);
        obj.setText(longText);
        expect(obj.name).toEqual(longName);
        expect(obj.text.toString()).toEqual(longText.toString());
    });

    // New test for filterList method
    it('should filter objects by a given predicate', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        const obj3 = db.create();
        obj1.name = 'filterTest1';
        obj2.name = 'filterTest2';
        obj3.name = 'noFilter';

        const filteredList = db.filterList(obj => obj.name.startsWith('filterTest'));
        expect(filteredList).toContain(obj1);
        expect(filteredList).toContain(obj2);
        expect(filteredList).not.toContain(obj3);
    });
});
