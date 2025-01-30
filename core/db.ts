import * as Y from 'yjs';
import {IndexeddbPersistence} from 'y-indexeddb';
import NObject from './obj';
import {QueryBuilder} from './query';
import {ReplyManager} from './reply-manager';
import ConfigManager from './config-manager';
import { PersistenceManager } from './persistence-manager';
import Network from './net';
import { events } from './events'; // Import events

export default class DB {
  readonly doc: Y.Doc;
  public readonly index: Y.Map<string>;
  public readonly provider: IndexeddbPersistence & { awareness?: any };
  public readonly store: Y.Doc;
  private persistenceManager: PersistenceManager;
  private replyManager: ReplyManager;
  private readonly configManager: ConfigManager;
  private net?: Network; // Add network reference
  public get config(): ConfigManager { // Added public getter for configManager
    return this.configManager;
  }

  constructor(readonly userID: string = 'anonymous', provider?: IndexeddbPersistence) {
    this.doc = new Y.Doc();
    this.store = new Y.Doc();
    this.provider = provider || new IndexeddbPersistence('main-db', this.doc);
    this.index = this.doc.getMap<string>('objects');
    this.replyManager = new ReplyManager(this);
    this.configManager = new ConfigManager(this.doc); // Added
    this.persistenceManager = new PersistenceManager(this.doc); // Added

    this.provider.on('synced', () => { // Listen for 'synced' event
      console.log('Synced');
      events.emit('db-synced'); // Emit a 'db-synced' event
    });


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
        const objectId = this.index.get(id);
        if (!objectId) return null;

        const obj = new NObject(this.doc, objectId);
        obj.loadContent(); // Ensure content is loaded
        return obj;
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
      // Cleanup metadata and references
      const metadataKeys = obj.getMetadataKeys();
      metadataKeys.forEach(key => obj.setMetadata(key, null));

      // Cleanup awareness state if exists
      if (this.provider.awareness) {
        this.provider.awareness.setLocalState(null);
      }

      // Cleanup any related network connections
      if (this.net) {
        this.net.unshareObject(id);
      }
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
  createReply = (parentId: string, name: string | null | undefined): NObject | null => { // Updated type definition
    if (name?.trim() === '') { // Validate name
      console.error('Invalid name:', name);
      return null;
    }
    return this.replyManager.createReply(parentId, name);
  }


  getReplies = (parentId: string): string[] => { // Updated to return string[]
        const parent = this.get(parentId);
        if (!parent) {
            console.warn(`Parent object with id ${parentId} not found.`);
            return [];
        }
        return parent.replies.toArray();
    }

    getRepliesTo = (replyId: string): string[] => { // Updated to return string[]
        const reply = this.get(replyId);
        return reply?.repliesTo.toArray() || [];
    }


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
