import {beforeEach, describe, expect, test} from 'vitest';
import DB from '../src/db';
import {v4 as uuid} from "uuid";

describe('DB', () => {
    let db;

    beforeEach(() => {
        db = new DB('test-user');
    });

    test('creates new object with correct structure', () => {
        const obj = db.create();
        expect(obj).toBeDefined();
        expect(obj.id).toBeDefined();
        expect(obj.name).toBe('?');
        expect(obj.public).toBe(false);
        expect(obj.author).toBe('test-user');
        expect(obj.created).toBeDefined();
        expect(obj.updated).toBeDefined();
        expect(obj.tags).toEqual([]);
        expect(obj.text.toString()).toBe('');
        expect(obj.replies).toEqual(new Set());
        expect(obj.repliesTo).toEqual(new Set());

    });

    test('gets existing object', () => {
        const obj1 = db.create();
        const obj2 = db.get(obj1.id);
        expect(obj2).toBeDefined();
        expect(obj1.id).toBe(obj2?.id);
    });

    test('gets non-existing object', () => {
        const obj = db.get(uuid());
        expect(obj).toBeNull();
    });


    test('updates object title', () => {
        const obj = db.create();
        const newTitle = 'New Title';
        obj.name = newTitle;
        expect(obj.name).toBe(newTitle);
    });

    test('toggles object privacy', () => {
        const obj = db.create();
        obj.public = true;
        expect(obj.public).toBe(true);
        obj.public = false;
        expect(obj.public).toBe(false);
    });

    test('updates object text', () => {
        const obj = db.create();
        const newText = 'New Text';
        obj.setText(newText);
        expect(obj.text.toString()).toBe(newText);
    });

    test('adds and removes tags', () => {
        const obj = db.create();
        obj.addTag('test');
        expect(obj.tags).toContain('test');
        obj.removeTag('test');
        expect(obj.tags).not.toContain('test');
    });

    test('adds and removes replies', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReply(obj2.id);
        expect(obj1.replies).toContain(obj2.id);
        obj1.removeReply(obj2.id);
        expect(obj1.replies).not.toContain(obj2.id);
    });

    test('adds and removes repliesTo', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReplyTo(obj2.id);
        expect(obj1.repliesTo).toContain(obj2.id);
        obj1.removeReplyTo(obj2.id);
        expect(obj1.repliesTo).not.toContain(obj2.id);
    });

    test('deletes object', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addReply(obj2.id);
        obj2.addReplyTo(obj1.id);
        expect(db.delete(obj1.id)).toBe(true);
        expect(db.get(obj1.id)).toBeNull();
        expect(obj2.repliesTo).not.toContain(obj1.id);
    });

    test('deletes non-existing object', () => {
        expect(db.delete(uuid())).toBe(false);
    });

    test('lists objects', () => {
        db.create();
        db.create();
        expect(db.list().length).toBe(2);
    });

    test('lists objects by tag', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.addTag('test');
        expect(db.listByTag('test').length).toBe(1);
    });

    test('lists objects by author', () => {
        const obj1 = db.create();
        const obj2 = db.create();
        obj1.author = 'test2';
        expect(db.listByAuthor('test2').length).toBe(1);
    });

    test('searches objects', () => {
        const obj1 = db.create();
        obj1.name = 'Test Object';
        obj1.addTag('test');
        expect(db.search('test').length).toBe(1);
    });

    test('creates reply', () => {
        const obj1 = db.create();
        const obj2 = db.createReply(obj1.id, 'Reply');
        expect(obj2).toBeDefined();
        expect(obj1.replies).toContain(obj2.id);
        expect(obj2.repliesTo).toContain(obj1.id);
    });

    test('gets replies', () => {
        const obj1 = db.create();
        const obj2 = db.createReply(obj1.id);
        expect(db.getReplies(obj1.id)).toContain(obj2);
    });

    test('gets repliesTo', () => {
        const obj1 = db.create();
        const obj2 = db.createReply(obj1.id);
        expect(db.getRepliesTo(obj2.id)).toContain(obj1);
    });

    test('objText', () => {
        const obj = db.create();
        obj.setText('test');
        expect(db.objText(obj.id)).toBe('test');
    });

    test('objName', () => {
        const obj = db.create();
        db.objName(obj.id, 'test');
        expect(obj.name).toBe('test');
    });

    test('objPublic', () => {
        const obj = db.create();
        db.objPublic(obj.id, true);
        expect(obj.public).toBe(true);
    });
});
