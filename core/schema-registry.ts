export class SchemaRegistry {
    private readonly schemas: Record<string, any>;

    constructor() {
        this.schemas = {};
    }

    registerSchema(name: string, schema: any) {
        this.schemas[name] = schema;
    }

    getSchema(name: string): any | undefined {
        return this.schemas[name];
    }
}

// Example usage (for testing purposes):
const schemaRegistry = new SchemaRegistry();

// Register a schema
const mySchema = {
    type: 'object',
    properties: {
        name: { type: 'string' },
        age: { type: 'integer' }
    }
};
schemaRegistry.registerSchema('mySchema', mySchema);

// Get a schema
const retrievedSchema = schemaRegistry.getSchema('mySchema');
console.log('Retrieved schema:', retrievedSchema);

export default schemaRegistry;
