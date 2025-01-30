import { beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import NObject from '../../core/obj';

describe('NObject', () => {
  let doc: Y.Doc;
  let obj: NObject;

  beforeEach(() => {
    doc = new Y.Doc();
    obj = new NObject(doc, 'test-id');
    obj.author = 'testuser';
  });

  it('initializes with default values', () => {
    const defaults = {
      name: '?',
      public: false,
      author: 'testuser',
      tags: [],
      replies: [],
      repliesTo: []
    };
    
    expect(Object.entries(defaults).every(([k, v]) => 
      Array.isArray(v) 
        ? obj[k].length === v.length
        : obj[k] === v
    )).toBeTruthy();
  });

  it('handles metadata properties', () => {
    const testData = {
      name: 'Test Name',
      public: true,
      author: 'anotherUser'
    };

    Object.entries(testData).forEach(([key, value]) => {
      obj[key] = value;
      expect(obj[key]).toEqual(value);
    });
  });

  it('manages text content', () => {
    const testText = 'Test text';
    obj.setText(testText);
    expect(obj.text.toString()).toBe(testText);
  });

  it('manages tags', () => {
    const tags = ['tag1', 'tag2'];
    tags.forEach(t => obj.addTag(t));
    expect(obj.tags.toArray()).toEqual(tags);
    
    obj.removeTag(tags[0]);
    expect(obj.tags.toArray()).toEqual([tags[1]]);
  });

    it('add and remove replies', () => {
        obj.addReply('reply1');
        obj.addReply('reply2');
        expect(obj.replies.toArray().includes('reply1'));
        expect(obj.replies.toArray().includes('reply2'));

        obj.removeReply('reply1');
        expect(!obj.replies.toArray().includes('reply1'));
    });

    it('add and remove repliesTo', () => {
        obj.addReplyTo('replyTo1');
        obj.addReplyTo('replyTo2');
        expect(obj.repliesTo.toArray()).toContain('replyTo1');
        expect(obj.repliesTo.toArray()).toContain('replyTo2');

        obj.removeReplyTo('replyTo1');
        expect(obj.repliesTo.toArray()).not.toContain('replyTo1');
    });

    it('convert to JSON', () => {
        obj.name = 'Test Object';
        obj.addTag('test');
        const json = obj.toJSON();
        expect(json.metadata.name).toEqual('Test Object');
        expect(json.metadata.tags).toEqual(['test']);
    });

    it('always return a Y.Map from getOrInitSubMap', () => {
        const subMap = (obj as any).getOrInitSubMap('test', [['key', 'value']]);
        expect(subMap instanceof Y.Map).toBe(true);
        expect(subMap.get('key')).toEqual('value');

        const existingValue = obj.root.get('test');
        expect(existingValue instanceof Y.Map).toBe(true);

        // Test with non-Y.Map value
        obj.root.set('test2', 'not a map');
        const subMap2 = (obj as any).getOrInitSubMap('test2', [['key2', 'value2']]);
        expect(subMap2 instanceof Y.Map).toBe(true);
        expect(subMap2.get('key2')).toEqual('value2');
    });
});
