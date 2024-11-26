import {afterEach, beforeAll, beforeEach, describe, expect, test} from 'vitest';
import DB from '../src/db';
import {v4 as uuid} from "uuid";
import {IndexeddbPersistence} from 'y-indexeddb';

// Mock IndexeddbPersistence to avoid actual database interactions during tests
vi.mock('y-indexeddb', () => ({
    IndexeddbPersistence: vi.fn().mockImplementation(() => ({
        on: vi.fn(),
        clear: vi.fn(), // Add clear method for cleanup
        load: vi.fn().mockResolvedValue({}), // Mock load method
        persist: vi.fn().mockResolvedValue(true), // Mock persist method
    })),
}));

describe('DB', () => {
    let db;
    let mockStorage;

    beforeAll(() => {
        // Ensure the mock is reset before each test suite
        vi.clearAllMocks();
    });

    beforeEach(async () => {
        db = new DB('test-user');
        mockStorage = (db.storage as any); // Get the mock instance
        // Clear the mock database before each test
        mockStorage.clear(); 
    });

    test('creates new object with correct structure', async () => {
        const obj = await db.create();
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

    test('gets existing object', async () => {
        const obj1 = await db.create();
        const obj2 = await db.get(obj1.id);
        expect(obj2).toBeDefined();
        expect(obj1.id).toBe(obj2?.id);
    });

    test('gets non-existing object', async () => {
        const obj = await db.get(uuid());
        expect(obj).toBeNull();
    });

    test('updates object title', async () => {
        const obj = await db.create();
        const newTitle = 'New Title';
        obj.name = newTitle;
        expect(obj.name).toBe(newTitle);
    });

    test('delete object', async () => {
        const obj = await db.create();
        expect(await db.delete(obj.id)).toBe(true);
        expect(await db.get(obj.id)).toBeNull();
    });

    test('delete object - handles non-existent object', async () => {
        const nonExistentId = uuid();
        await expect(db.delete(nonExistentId)).resolves.toBe(false);
    });

    test('createReply', async () => {
        const parent = await db.create();
        const reply = await db.createReply(parent.id, 'Reply Title');
        expect(reply).toBeDefined();
        expect(reply?.name).toBe('Reply Title');
        expect(parent.replies.has(reply?.id)).toBe(true);
        expect(reply?.repliesTo.has(parent.id)).toBe(true);
    });

    test('createReply - handles non-existent parent', async () => {
        const nonExistentParentId = uuid();
        await expect(db.createReply(nonExistentParentId)).resolves.toBeNull();
    });

    test('Database error handling - create', async () => {
        mockStorage.persist.mockRejectedValueOnce(new Error('Database error'));
        await expect(db.create()).rejects.toThrow('Database error');
    });

    test('Database error handling - get', async () => {
        mockStorage.load.mockRejectedValueOnce(new Error('Database error'));
        await expect(db.get(uuid())).rejects.toThrow('Database error');
    });

    test('Database error handling - delete', async () => {
        const obj = await db.create();
        mockStorage.persist.mockRejectedValueOnce(new Error('Database error'));
        await expect(db.delete(obj.id)).rejects.toThrow('Database error');
    });


    // Add more tests for error handling in other methods (get, delete, etc.)
});
