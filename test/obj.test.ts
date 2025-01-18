import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import NObject from '../src/obj';

describe('NObject', () => {
    let doc: Y.Doc;
    let obj: NObject;

    beforeEach(() => {
        doc = new Y.Doc();
        obj = new NObject(doc, 'test-id');
        obj.init('testuser');
    });

    it('should initialize with default values', () => {
        expect(obj.name).toEqual('?');
        expect(obj.public).toBe(false);
        expect(obj.author).toEqual('testuser');
        expect(obj.tags.length).toEqual(0);
        expect(obj.replies.size).toEqual(0);
        expect(obj.repliesTo.size).toEqual(0);
    });

    it('should set and get name', () => {
        obj.name = 'Test Name';
        expect(obj.name).toEqual('Test Name');
    });

    it('should set and get public status', () => {
        obj.public = true;
        expect(obj.public).toEqual(true);
    });

    it('should set and get author', () => {
        obj.author = 'anotherUser';
        expect(obj.author).toEqual('anotherUser');
    });

    it('should set and get text', () => {
        const text = new Y.Text('Test text');
        obj.setText(text);
        expect(obj.text.toString()).toEqual('Test text');
    });

    it('should add and remove tags', () => {
        obj.addTag('tag1');
        obj.addTag('tag2');
        expect(obj.tags).toEqual(['tag1', 'tag2']);

        obj.removeTag('tag1');
        expect(obj.tags).toEqual(['tag2']);
    });

    it('should add and remove replies', () => {
        obj.addReply('reply1');
        obj.addReply('reply2');
        expect(obj.replies.has('reply1')).toBe(true);
        expect(obj.replies.has('reply2')).toBe(true);

        obj.removeReply('reply1');
        expect(obj.replies.has('reply1')).toBe(false);
    });

    it('should add and remove repliesTo', () => {
        obj.addReplyTo('replyTo1');
        obj.addReplyTo('replyTo2');
        expect(obj.repliesTo.has('replyTo1')).toBe(true);
        expect(obj.repliesTo.has('replyTo2')).toBe(true);

        obj.removeReplyTo('replyTo1');
        expect(obj.repliesTo.has('replyTo1')).toBe(false);
    });

    it('should convert to JSON', () => {
        obj.name = 'Test Object';
        obj.addTag('test');
        const json = obj.toJSON();
        expect(json.metadata.name).toEqual('Test Object');
        expect(json.metadata.tags).toEqual(['test']);
    });
});
