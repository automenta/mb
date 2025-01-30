import { $, NObject, SchemaRegistry } from '../imports';
import TagSelector from './tag-selector';

export default class UIBuilder {
    private isReadOnly: boolean;
    private schemaRegistry: SchemaRegistry;

    constructor(isReadOnly: boolean, schemaRegistry: SchemaRegistry) {
        this.isReadOnly = isReadOnly;
        this.schemaRegistry = schemaRegistry;
    }

    public createEditorContainer(): HTMLElement {
        const editorContainer = this.createElement('div', 'editor-container');
        editorContainer.append(
            this.createTitleEditor(),
            this.createContentEditor(),
            this.createMetadataPanel(),
            this.createTagSelectorContainer()
        );
        return editorContainer;
    }

    public createSchemaFormElement(schemaName: string): HTMLElement | null {
        const schema = this.schemaRegistry.getSchema(schemaName);
        if (!schema) {
            console.error(`Schema not found: ${schemaName}`);
            return null;
        }

        const formElement = this.createElement('div', 'schema-element');
        formElement.dataset.schemaName = schemaName;

        if (this.isReadOnly) {
            formElement.classList.add('read-only');
        }

        // Add a button to remove the schema element
        const removeButton = this.createElement('button', 'remove-schema-element');
        removeButton.textContent = 'x';
        removeButton.addEventListener('click', () => {
            formElement.remove();
        });
        formElement.append(removeButton);

        // Add form fields based on schema properties
        if (schema.properties) {
            for (const propName in schema.properties) {
                const property = schema.properties[propName];
                const label = this.createElement('label');
                label.textContent = property.title || propName;
                label.setAttribute('for', `${propName}-field`);

                let inputElement: HTMLElement;

                switch (property.type) {
                    case 'string':
                        if (property.format === 'textarea')
                            inputElement = this.createElement('textarea', null, `${propName}-field`);
                        else
                            inputElement = this.createElement('input', null, `${propName}-field`) as HTMLInputElement;
                        (inputElement as HTMLInputElement).type = 'text';
                        break;
                    case 'number':
                        inputElement = this.createElement('input', null, `${propName}-field`) as HTMLInputElement;
                        (inputElement as HTMLInputElement).type = 'number';
                        break;
                    case 'boolean':
                        inputElement = this.createElement('input', null, `${propName}-field`) as HTMLInputElement;
                        (inputElement as HTMLInputElement).type = 'checkbox';
                        break;
                    case 'array':
                        if (property.items.type === 'string' && property.items.enum) {
                            inputElement = this.createElement('select', null, `${propName}-field`);
                            property.items.enum.forEach((option: string) => {
                                const optionElement = this.createElement('option') as HTMLOptionElement;
                                optionElement.value = option;
                                optionElement.text = option;
                                (inputElement as HTMLSelectElement).add(optionElement);
                            });
                        }
                        break;
                    default:
                        inputElement = this.createElement('input', null, `${propName}-field`) as HTMLInputElement;
                        (inputElement as HTMLInputElement).type = 'text';
                        console.warn(`Unsupported schema property type: ${property.type}`);
                }

                inputElement.dataset.schemaProperty = propName;
                if (this.isReadOnly) {
                    (inputElement as HTMLInputElement).disabled = true;
                }

                formElement.append(label, inputElement);
            }
        }

        return formElement;
    }

    private createElement(tagName: string, className: string, content?: string): HTMLElement {
        const element = document.createElement(tagName);
        element.className = className;
        if (content) {
            element.textContent = content;
        }
        return element;
    }

    private createTitleEditor(): HTMLElement {
        const titleEditor = this.createElement('input', 'document-title') as HTMLInputElement;
        titleEditor.type = 'text';
        return titleEditor;
    }

    private createContentEditor(): HTMLElement {
        const contentEditor = this.createElement('div', 'content-editor');
        contentEditor.contentEditable = this.isReadOnly ? 'false' : 'true';
        return contentEditor;
    }

    private createMetadataPanel(): HTMLElement {
        return this.createElement('div', 'metadata-panel', 'Metadata Panel');
    }

    private createTagSelectorContainer(): HTMLElement {
        const tagSelectorContainer = this.createElement('div', 'tag-selector-container');
        const tagSelector = new TagSelector(tagSelectorContainer, 'page');
        tagSelector.addTag('Category 1', 'Tag A');
        tagSelector.addTag('Category 1', 'Tag B');
        tagSelector.addTag('Category 2', 'Tag C');
        return tagSelectorContainer;
    }
}
