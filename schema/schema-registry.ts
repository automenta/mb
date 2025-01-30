import * as Definitions from './definitions';

export class SchemaRegistry {
    private schemas: Record<string, any>;

    constructor() {
        this.schemas = {};
    }

    registerSchema(name: string, schema: any) {
        this.schemas[name] = schema;
    }

    getSchema(name: string) {
        return this.schemas[name];
    }

    // Example usage:
    // registerBlogPostSchema() {
    //     this.registerSchema('BlogPost', {
    //         created: { type: 'number' },
    //         updated: { type: 'number' },
    //         name: { type: 'string' },
    //         description: { type: 'string' },
    //         author: { type: 'string' },
    //         tags: { type: 'array', items: { type: 'string' } },
    //         content: { type: 'object' }, // Or a more specific type if you have a Y.Text schema
    //         format: { type: 'string' },
    //     });
    // }
}

// Create an instance of the SchemaRegistry
const schemaRegistry = new SchemaRegistry();

// Register the Timestamped schema
schemaRegistry.registerSchema('Timestamped', {
    created: { type: 'number' },
    updated: { type: 'number' },
});

// Register the Named schema
schemaRegistry.registerSchema('Named', {
    name: { type: 'string' },
});

// Register the Described schema
schemaRegistry.registerSchema('Described', {
    description: { type: 'string' },
});

// Register the Tagged schema
schemaRegistry.registerSchema('Tagged', {
    tags: { type: 'array', items: { type: 'string' } },
});

// Register the Authored schema
schemaRegistry.registerSchema('Authored', {
    author: { type: 'string' },
});

// Register the Referenced schema
schemaRegistry.registerSchema('Referenced', {
    references: { type: 'array', items: { type: 'string' } },
});

// Register the TextContent schema
schemaRegistry.registerSchema('TextContent', {
    content: { type: 'string' },
    format: { type: 'string', enum: ['plain', 'markdown'] },
});

// Register the RichTextContent schema
schemaRegistry.registerSchema('RichTextContent', {
    content: { type: 'object' },
    format: { type: 'string' },
});

// Register the BinaryContent schema
schemaRegistry.registerSchema('BinaryContent', {
    content: { type: 'Uint8Array' },
    mimeType: { type: 'string' },
});

// Register the Comment schema
schemaRegistry.registerSchema('Comment', {
    created: { type: 'number' },
    updated: { type: 'number' },
    author: { type: 'string' },
    content: { type: 'string' },
    format: { type: 'string', enum: ['plain', 'markdown'] },
    parentId: { type: 'string' },
});

// Register the Task schema
schemaRegistry.registerSchema('Task', {
    created: { type: 'number' },
    updated: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    author: { type: 'string' },
    status: { type: 'string', enum: ['todo', 'in-progress', 'done'] },
    dueDate: { type: 'number' },
    assignee: { type: 'string' },
});

// Register the Event schema
schemaRegistry.registerSchema('Event', {
    created: { type: 'number' },
    updated: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    author: { type: 'string' },
    startTime: { type: 'number' },
    endTime: { type: 'number' },
    location: { type: 'string' },
});

// Register the BlogPost schema
schemaRegistry.registerSchema('BlogPost', {
    created: { type: 'number' },
    updated: { type: 'number' },
    name: { type: 'string' },
    description: { type: 'string' },
    author: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    content: { type: 'object' },
    format: { type: 'string' },
});

export default schemaRegistry;
