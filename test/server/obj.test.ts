import {beforeEach, describe, expect, it} from 'vitest';
import * as Y from 'yjs';
import NObject from '../../src/obj';

describe('NObject', () => {
    let doc: Y.Doc;
    let obj: NObject;

    beforeEach(() => {
        doc = new Y.Doc();
        obj = new NObject(doc, 'test-id');
        obj.author = 'testuser';
    });

    it('should initialize with default values', () => {
        expect(obj.name).toEqual('?');
        expect(obj.public).toBe(false);
        expect(obj.author).toEqual('testuser');
        expect(obj.tags.length).toEqual(0);
        expect(obj.replies.length).toEqual(0);
        expect(obj.repliesTo.length).toEqual(0);
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
        obj.setText('Test text');
        expect(obj.text.toString()).toEqual('Test text');
    });

    it('should add and remove tags', () => {
        obj.addTag('tag1');
        obj.addTag('tag2');
        expect(obj.tags.toArray()).toEqual(['tag1', 'tag2']);

        obj.removeTag('tag1');
        expect(obj.tags.toArray()).toEqual(['tag2']);
    });

    it('should add and remove replies', () => {
        obj.addReply('reply1');
        obj.addReply('reply2');
        expect(obj.replies.toArray().includes('reply1'));
        expect(obj.replies.toArray().includes('reply2'));

        obj.removeReply('reply1');
        expect(!obj.replies.toArray().includes('reply1'));
    });

    it('should add and remove repliesTo', () => {
        obj.addReplyTo('replyTo1');
        obj.addReplyTo('replyTo2');
        expect(obj.repliesTo.toArray()).toContain('replyTo1');
        expect(obj.repliesTo.toArray()).toContain('replyTo2');

        obj.removeReplyTo('replyTo1');
        expect(obj.repliesTo.toArray()).not.toContain('replyTo1');
    });

    it('should convert to JSON', () => {
        obj.name = 'Test Object';
        obj.addTag('test');
        const json = obj.toJSON();
        expect(json.metadata.name).toEqual('Test Object');
        expect(json.metadata.tags).toEqual(['test']);
    });
});
