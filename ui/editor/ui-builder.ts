import { $, NObject } from '../imports';
import TagSelector from './tag-selector';

export default class UIBuilder {
    private isReadOnly: boolean;

    constructor(isReadOnly: boolean) {
        this.isReadOnly = isReadOnly;
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
