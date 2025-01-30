import { SchemaRegistry } from '../../core/schema-registry';
import { renderSchemaForm } from '../util/schema-form';

export default class TagSelector {
    private readonly rootElement: HTMLElement;
    private _schemaName: string;
    private schema: any;
    private schemaRegistry = new SchemaRegistry();
    private tags: {[key: string]: any} = {};

    constructor(parentElement: HTMLElement, schemaName: string) {
        this.rootElement = parentElement;
        this._schemaName = schemaName;
        this.loadSchema();
    }

    private async loadSchema() {
        this.schema = await this.schemaRegistry.getSchema(this._schemaName);
        this.renderUI();
    }

    private renderUI(): void {
        if (!this.schema || typeof this.schema !== 'object' || !this.schema.properties) {
            this.rootElement.innerHTML = 'Schema not found or invalid.';
            return;
        }

        const form = renderSchemaForm(this.schema as any, {}, this.updateTag.bind(this));
        this.rootElement.innerHTML = '';
        this.rootElement.appendChild(form[0]);
    }

    public setSchemaName(schemaName: string): void {
        this._schemaName = schemaName;
        this.loadSchema();
    }

    private updateTag(fieldPath: string, value: any): void {
        console.log('Tag updated:', fieldPath, value);
        this.tags[fieldPath] = value;
        console.log('Current tags:', this.tags);
    }

    public getTags(): {[key: string]: any} {
        return this.tags;
    }

    public addTag(category: string, tag: any): void {
        if (!this.tags[category]) {
            this.tags[category] = [];
        }
        this.tags[category].push(tag);
        this.updateUI();
    }

    public removeTag(category: string, tag: string): void {
        if (this.tags[category]) {
            this.tags[category] = this.tags[category].filter( (t: string) => t !== tag);
        }
        this.updateUI();
    }

    private updateUI(): void {
        this.rootElement.innerHTML = '';
        this.renderUI();
    }
    public setTags(tags: {[key: string]: any}): void {
        this.tags = tags;
        this.updateUI();
    }
}