// src/db.ts
import * as Y from 'yjs';
import {IndexeddbPersistence} from 'y-indexeddb';
import NObject from './obj';
import {QueryBuilder} from './query';
import {ReplyManager} from './reply-manager';
import ConfigManager from './config-manager';
import { PersistenceManager } from './persistence-manager'; // Added import

export default class DB {
  readonly doc: Y.Doc;
  public readonly index: Y.Map<string>;
  // public readonly config: Y.Map<unknown>; // Removed
  public readonly provider: IndexeddbPersistence;
  public readonly store: Y.Doc;
  private persistenceManager: PersistenceManager; // Added
  private replyManager: ReplyManager;
  private configManager: ConfigManager; // Added
  public get config(): ConfigManager { // Added public getter for configManager
    return this.configManager;
  }

  constructor(readonly userID: string = 'anonymous', provider?: IndexeddbPersistence) {
    this.doc = new Y.Doc();
    this.store = new Y.Doc();
    this.provider = provider || new IndexeddbPersistence('main-db', this.doc);
    // this.config = this.doc.getMap('config'); // Removed
    this.index = this.doc.getMap<string>('objects');
    this.replyManager = new ReplyManager(this);
    this.configManager = new ConfigManager(this.doc); // Added
    this.persistenceManager = new PersistenceManager(this.doc); // Added

    // console.log('DB.constructor: this.doc:', this.doc);

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
    this.index.set(obj.id, obj.id); // Store object ID in index
    return obj;
  }

  /**
   * Retrieves an NObject by ID.
   * @param id The ID of the object.
   * @returns The NObject if found, otherwise null.
   */
  get(id: string): NObject | null {
    const objectId = this.index.get(id); // Get object ID from index
    return objectId ? new NObject(this.doc, objectId) : null; // Create new NObject instance
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

  // // Uncomment if observation needed
  // // observe = (fn: Observer): void => this.index.observe(fn);
  // // observeObject = (id: string, fn: Observer): void =>
  // //     this.get(id)?.observe(fn);

  /**
   * Retrieves the text of an object by its page ID.
   * @param pageId The ID of the page.
   * @returns The text of the object if found, else null.
   */
  getObjectText(pageId: string): Y.Text | null {
    const page = this.get(pageId);
    return page ? page.text : null;
  }

  // Removed objName, use object.name setter instead

  /**
   * Sets the public status of an object.
   * @param pageId The ID of the page.
   * @param isPublic The public status.
   */
  // Removed objPublic, use object.public setter instead


 /** Retrieves the history of document snapshots
  * @returns Promise resolving to array of document snapshots
  */
 async getSnapshotHistory(): Promise<Uint8Array[]> {
   return this.persistenceManager.getSnapshotHistory();
 }
};