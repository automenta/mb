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
                    const schema = JSON.parse(schemaContent);
                    this.registerSchema(schemaName, schema);
                } catch (error) {
                    console.error(`Error parsing schema file ${file}: ${error}`);
                }
            }
        });
    }
}

const schemaRegistry = new SchemaRegistry();

export default schemaRegistry;
