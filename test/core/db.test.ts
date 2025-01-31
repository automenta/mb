import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";
import DB from "../../core/db";
import NObject from "../../core/obj";

describe("DB", () => {
  let doc: Y.Doc;
  let indexeddbProvider: IndexeddbPersistence;
  let db: DB;

  beforeEach(async () => {
    doc = new Y.Doc();
    indexeddbProvider = new IndexeddbPersistence("testdb", doc);
    await indexeddbProvider.whenSynced;
    db = new DB("testchannel", doc, indexeddbProvider);
  });

  afterEach(() => {
    indexeddbProvider.destroy();
    doc.destroy();
  });

  it("should initialize correctly", () => {
    expect(db.index).toBeDefined();
    expect(db.provider).toBeDefined();
    expect(db.store).toBeDefined();
  });

  it("should add and retrieve an object", async () => {
    const obj = new NObject(db.doc);
    db.add(obj);
    await db.provider.whenSynced;

    const retrievedObj = db.get(obj.id);
    expect(retrievedObj).not.toBeNull();
    expect(retrievedObj!.id).toEqual(obj.id);
  });

  it("should update an object and reflect changes in index", async () => {
    const obj = new NObject(db.doc);
    db.add(obj);
    await db.provider.whenSynced;

    obj.name = "Updated Name";
    await db.provider.whenSynced;

    const retrievedObj = db.get(obj.id);
    expect(retrievedObj).not.toBeNull();
    expect(retrievedObj!.name).toEqual("Updated Name");
  });

  it("should delete an object and update index", async () => {
    const obj = new NObject(db.doc);
    db.add(obj);
    await db.provider.whenSynced;

    db.delete(obj.id);
    await db.provider.whenSynced;

    const retrievedObj = db.get(obj.id);
    expect(retrievedObj).toBeNull();
  });

  it("should handle concurrent updates", async () => {
    const obj1 = new NObject(db.doc);
    const obj2 = new NObject(db.doc);
    db.add(obj1);
    db.add(obj2);
    await db.provider.whenSynced;

    obj1.name = "Name 1";
    obj2.name = "Name 2";
    await db.provider.whenSynced;

    const retrievedObj1 = db.get(obj1.id);
    const retrievedObj2 = db.get(obj2.id);
    expect(retrievedObj1).not.toBeNull();
    expect(retrievedObj1!.name).toEqual("Name 1");
    expect(retrievedObj2).not.toBeNull();
    expect(retrievedObj2!.name).toEqual("Name 2");
  });

  it("should handle concurrent deletions", async () => {
    const obj1 = new NObject(db.doc);
    const obj2 = new NObject(db.doc);
    db.add(obj1);
    db.add(obj2);
    await db.provider.whenSynced;

    db.delete(obj1.id);
    db.delete(obj2.id);
    await db.provider.whenSynced;

    const retrievedObj1 = db.get(obj1.id);
    const retrievedObj2 = db.get(obj2.id);
    expect(retrievedObj1).toBeNull();
    expect(retrievedObj2).toBeNull();
  });

  it("should persist data across sessions", async () => {
    const obj = new NObject(db.doc);
    obj.name = "Test Object";
    db.add(obj);
    await db.provider.whenSynced;

    // Simulate a new session
    const newDoc = new Y.Doc();
    const newIndexeddbProvider = new IndexeddbPersistence("testdb", newDoc);
    await newIndexeddbProvider.whenSynced;
    const newDb = new DB("testchannel", newDoc, newIndexeddbProvider);

    const retrievedObj = newDb.get(obj.id);
    expect(retrievedObj).not.toBeNull();
    expect(retrievedObj!.name).toEqual("Test Object");

    newIndexeddbProvider.destroy();
    newDoc.destroy();
  });

  it("should handle errors gracefully", async () => {
    // Simulate an error with IndexedDB
    indexeddbProvider.destroy(); // This should cause an error on the next operation

    const obj = new NObject(db.doc);
    expect(() => db.add(obj)).toThrow();

    // You can add more specific error handling tests here
  });
  describe("Provider Integration", () => {
    it("initialize provider and sync documents", async () => {
      const provider = new IndexeddbPersistence("testdb", doc);
      const db = new DB("testuser", doc, provider);

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
      // Verify initial state
      expect(provider.synced).toBe(false);

      await provider.whenSynced;

      // Verify sync completion
      expect(provider.synced).toBe(true);
      expect(provider.doc).toBe(doc);
    });

    it("log synced event when provider completes synchronization", () => {
      const provider = new IndexeddbPersistence("testdb", doc);
      const db = new DB("testuser", doc, provider);
      const consoleSpy = vi.spyOn(console, "log");

      db.provider.emit("synced", []);

      expect(consoleSpy).toHaveBeenCalledWith("Synced");
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });
  });

  // New test for error handling in createReply
  it("log error for invalid name in createReply", () => {
    const obj = db.create();
    const consoleSpy = vi.spyOn(console, "error");
    const reply = db.createReply(obj.id, null);
    expect(consoleSpy).toHaveBeenCalledWith("Invalid name:", null);
    expect(reply).toBeNull();
  });

  it("log error for invalid name in createReply", () => {
    const obj = db.create();
    const consoleSpy = vi.spyOn(console, "error");
    const reply = db.createReply(obj.id, undefined);
    expect(consoleSpy).toHaveBeenCalledWith("Invalid name:", undefined);
    expect(reply).toBeNull();
  });
});
