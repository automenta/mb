// src/db.ts
import * as Y from 'yjs';
import {IndexeddbPersistence} from 'y-indexeddb';
import NObject from './obj';
import {QueryBuilder} from './query';
import {ReplyManager} from './reply-manager';

class DB {
  readonly doc: Y.Doc;
  public readonly index: Y.Map<NObject>;
  public readonly config: Y.Map<unknown>;
  public readonly provider: IndexeddbPersistence;
  public readonly store: Y.Doc;

  private replyManager: ReplyManager;

  constructor(readonly userID: string = 'anonymous', provider?: IndexeddbPersistence) {
    this.doc = new Y.Doc();
    this.store = new Y.Doc();
    this.provider = provider || new IndexeddbPersistence('main-db', this.doc);
    this.config = this.doc.getMap('config');
    this.index = this.doc.getMap<NObject>('objects');
    this.replyManager = new ReplyManager(this);

    // Initialize Yjs types
    const yarray = this.doc.getArray('yarray-initializer');
    const ytext = this.doc.getText('ytext-initializer');

    // Y.js will automatically persist through the provider
  }

  /**
   * Creates a new NObject and adds it to the index.
   * @returns The created NObject.
   */
  create(id?: string): NObject {
    //if (!id) id = randomUUID();
    const obj = new NObject(this.doc, id);
    obj.author = this.userID;
    this.index.set(obj.id, obj.toJSON());
    return obj;
  }

  /**
   * Retrieves an NObject by ID.
   * @param id The ID of the object.
   * @returns The NObject if found, otherwise null.
   */
  get(id: string): NObject | null {
    const indexed = this.index.get(id);
    return indexed ? new NObject(this.doc, id) : null;
  }

  /**
   * Deletes an NObject by ID.
   * @param id The ID of the object to delete.
   * @returns True if deletion was successful, else false.
   */
  delete(id: string): boolean {
    const obj = this.get(id);
    if (!obj) return false;

    this.doc.transact(() => {
      // Cleanup references in other objects
      this.list().forEach(other => {
        if (other.replies.toArray().includes(id)) other.removeReply(id);
        if (other.repliesTo.toArray().includes(id)) other.removeReplyTo(id);
      });

      // Delete the object itself
      this.index.delete(id);
      this.doc.share.delete(id);
      // TODO any other cleanup?
    });
    return true;
  }

  /**
   /**
    * Creates a new QueryBuilder instance for querying objects.
    * @returns A new QueryBuilder instance
    */
  query(): QueryBuilder {
    return new QueryBuilder(this);
  }

  list = (): NObject[] => this.query().execute();

  listByTag = (tag: string): NObject[] =>
    this.query()
      .where(obj => obj.tags.toArray().includes(tag))
      .execute();

  listByAuthor = (author: string): NObject[] =>
    this.query()
      .where(obj => obj.author === author)
      .execute();

  /**
   * Searches for NObjects matching the query.
   * @param query The search query string.
   * @returns An array of matching NObjects.
   */
  search(query: string): NObject[] {
    const q = query.toLowerCase();
    return this.query()
      .where(obj =>
        obj.name.toLowerCase().includes(q) ||
        obj.tags.toArray().some(tag => tag.toLowerCase().includes(q))
      )
      .execute();
  }

  /**
   * Creates a reply to an existing NObject.
   * @param parentId The ID of the parent object.
   * @param name Optional name for the reply.
   * @returns The created reply NObject if successful, else null.
   */
  createReply = (parentId: string, name: string): NObject | null =>
    this.replyManager.createReply(parentId, name);

  getReplies = (id: string): NObject[] => this.replyManager.getReplies(id);

  getRepliesTo = (id: string): NObject[] => this.replyManager.getRepliesTo(id);

  // Uncomment if observation needed
  // observe = (fn: Observer): void => this.index.observe(fn);
  // observeObject = (id: string, fn: Observer): void =>
  //     this.get(id)?.observe(fn);

  /**
   * Retrieves the text of an object by its page ID.
   * @param pageId The ID of the page.
   * @returns The text of the object if found, else null.
   */
  objText(pageId: string): Y.Text | null {
    const page = this.get(pageId);
    return page ? page.text : null;
  }

  /**
   * Sets the name of an object.
   * @param pageId The ID of the page.
   * @param title The new title.
   */
  objName(pageId: string, title: string): void {
    const page = this.get(pageId);
    if (page) page.name = title;
  }

  /**
   * Sets the public status of an object.
   * @param pageId The ID of the page.
   * @param isPublic The public status.
   */
  objPublic(pageId: string, isPublic: boolean): void {
    const page = this.get(pageId);
    if (page) page.public = isPublic;
  }

  getSignalingServers(): string[] {
    return this.config.get('signalingServers') as string[] || [];
  }

  setSignalingServers(servers: string[]): void {
    this.config.set('signalingServers', servers);
  }

  persistDocument(obj: NObject | Y.Map<any>): void {
    if (obj instanceof NObject) {
      this.index.set(obj.id, obj);
    } /*else if (obj instanceof Y.Map) {
      const objId = obj.get('id');
      if (typeof objId === 'string') {
        this.index.set(objId, obj);
      } else {
        console.error('Object ID is not a string:', objId);
      }
    } */ else {
      console.error('Unknown object type:', obj);
    }
  }

}

export default DB;