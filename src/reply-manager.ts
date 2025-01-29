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
        const parentObject = this.db.get(parentId);
        if (!parentObject) {
            console.warn(`Parent object with ID ${parentId} not found.`);
            return null;
        }

        const replyObject = this.db.create();
        if (!replyObject) {
            console.error("Failed to create reply NObject.");
            return null;
        }

        replyObject.name = name || `Reply to ${parentObject.name}`;
        replyObject.addReplyTo(parentId);
        parentObject.addReply(replyObject.id);
        replyObject.setMetadata('read', false); // Initialize 'read' to false

        return replyObject;
    }
}
