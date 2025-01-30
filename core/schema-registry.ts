import * as fs from 'fs';
import * as path from 'path';

export class SchemaRegistry {
    private schemas: Record<string, any>;

    constructor() {
        this.schemas = {};
        this.load();
    }

    registerSchema(name: string, schema: any) {
        this.schemas[name] = schema;
    }

    getSchema(name: string) {
        return this.schemas[name];
    }

    private load() {
        const schemaDir = path.join(__dirname, '..', 'schema');
        const files = fs.readdirSync(schemaDir);

        files.forEach(file => {
            if (path.extname(file) === '.json') {
                const schemaName = path.basename(file, '.json');
                const filePath = path.join(schemaDir, file);
                const schemaContent = fs.readFileSync(filePath, 'utf-8');
                try {
                    let schema = JSON.parse(schemaContent);
                    schema = this.transformSchema(schema);
                    this.registerSchema(schemaName, schema);
                } catch (error) {
                    console.error(`Error parsing schema file ${file}: ${error}`);
                }
            }
        });
    }

    private transformSchema(schema: any): any {
        if (!schema.$schema) {
            schema.$schema = "http://json-schema.org/draft-07/schema#";
        }

        if (!schema.properties) {
            // If 'properties' is missing, assume the entire schema represents the properties
            schema = {
                "$schema": schema.$schema,
                "properties": schema
            };
        } else if (schema.properties && !schema.type) {
            schema.type = "object";
        }

        if (schema.type === "object" && schema.properties) {
            delete schema.type;
        }

        return schema;
    }
}

const schemaRegistry = new SchemaRegistry();

export default schemaRegistry;
