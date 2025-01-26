import NObject from './obj';
import DB from './db';
import { Array as YArray } from 'yjs';

export class ReplyManager {
    constructor(private readonly db: DB) {}

    /**
     * Creates a reply to an existing NObject.
     * @param parentId The ID of the parent object.
     * @param name Optional name for the reply.
     * @returns The created reply NObject if successful, else null.
     */
    createReply(parentId: string, name: string): NObject | null {
        const parent = this.db.get(parentId);
        if (!parent) return null;

        const reply = this.db.create();
        reply.name = name;
        reply.addReplyTo(parentId);
        parent.addReply(reply.id);
        return reply;
    }

    /**
     * Gets all replies to a specific object.
     * @returns Array of reply NObjects.
     */
    private getObjectsFromIds(ids: YArray<string>): NObject[] {
        return Array.from(ids.toArray())
            .map(id => this.db.get(id))
            .filter((obj): obj is NObject => obj !== null);
    }

    /**
     * Gets all replies to a specific object.
     * @param id The ID of the parent object.
     * @returns Array of reply NObjects.
     */
    getReplies(id: string): NObject[] {
        const parent = this.db.get(id);
        return parent ? this.getObjectsFromIds(parent.replies) : [];
    }

    /**
     * Gets all objects that this object is replying to.
     * @param id The ID of the object.
     * @returns Array of parent NObjects.
     */
    getRepliesTo(id: string): NObject[] {
        const obj = this.db.get(id);
        return obj ? this.getObjectsFromIds(obj.repliesTo) : [];
    }
}