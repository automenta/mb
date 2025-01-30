export interface Timestamped {
    created: number; // Unix timestamp
    updated: number; // Unix timestamp
}

export interface Named {
    name: string;
}

export interface Described {
    description: string;
}

export interface Tagged {
    tags: string[];
}

export interface Authored {
    author: string; // ID of the author (e.g., user ID)
}

export interface Referenced {
    references: string[]; // Array of IDs of other NObjects
}

export interface TextContent {
    content: string; // Plain text or markdown
    format: 'plain' | 'markdown';
}

export interface RichTextContent {
    content: any; //  Could be a Y.Text structure or a serialized rich text format (e.g., Prosemirror, Quill)
    format: string; // Identifier for the rich text format used
}

export interface BinaryContent {
    content: Uint8Array; // Binary data
    mimeType: string; // MIME type of the data
}

export interface Comment extends Timestamped, Authored, TextContent {
    parentId: string; // ID of the NObject being commented on
}

export interface Task extends Timestamped, Named, Described, Authored {
    status: 'todo' | 'in-progress' | 'done';
    dueDate?: number; // Optional due date (Unix timestamp)
    assignee?: string; // Optional ID of the assigned user
}

export interface Event extends Timestamped, Named, Described, Authored {
    startTime: number; // Unix timestamp
    endTime: number; // Unix timestamp
    location?: string;
}

export interface BlogPost extends Timestamped, Named, Described, Authored, Tagged, RichTextContent {}
