import { TagManager } from '../imports';
import TagSelector from './tag-selector';

export default class UIBuilder {
    private readonly isReadOnly: boolean;
    private tags: TagManager;

    constructor(isReadOnly: boolean, tags: TagManager) {
        this.isReadOnly = isReadOnly;
        this.tags = tags;
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

    public createTagFormElement(tagName: string): HTMLElement | null {
        const tag = this.tags.get(tagName);
        if (!tag) {
            console.error(`Tag not found: ${tagName}`);
            return null;
        }

        const formElement = this.createElement('div', 'tag-element');
        formElement.dataset.schemaName = tagName;

        if (this.isReadOnly)
            formElement.classList.add('read-only');

        // Add a button to remove the tag element
        const removeButton = this.createElement('button', 'remove-tag-element');
        removeButton.textContent = 'x';
        removeButton.addEventListener('click', () => formElement.remove());
        formElement.append(removeButton);

        // Add form fields based on tag properties
        if (tag.properties) {
            for (const propName in tag.properties) {
                const property = tag.properties[propName];
                const label = this.createElement('label');
                label.textContent = property.title || propName;
                label.setAttribute('for', `${propName}-field`);

                let inputElement: HTMLElement;

                switch (property.type) {
                    case 'string':
                        inputElement = property.format === 'textarea' ? this.createElement('textarea', null, `${propName}-field`) : this.createElement('input', null, `${propName}-field`) as HTMLInputElement;
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
                        console.warn(`Unsupported tag property type: ${property.type}`);
                }

                inputElement.dataset.schemaProperty = propName;
                if (this.isReadOnly)
                    (inputElement as HTMLInputElement).disabled = true;

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
        const s = new TagSelector(tagSelectorContainer, 'page');
        s.addTag('Category 1', 'Tag A');
        s.addTag('Category 1', 'Tag B');
        s.addTag('Category 2', 'Tag C');
        return tagSelectorContainer;
    }
}
