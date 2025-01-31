import { Tags } from '../../core/tags';
import { renderTagForm } from '../util/form';

export default class TagSelector {
    private readonly rootElement: HTMLElement;
    private _tagName: string;
    private tag: any;
    private tagManager = new Tags();
    private tags: {[key: string]: any} = {};

    constructor(parentElement: HTMLElement, tagName: string) {
        this.rootElement = parentElement;
        this._tagName = tagName;
        this.load();
    }

    private async load() {
        this.tag = await this.tagManager.get(this._tagName);
        this.renderUI();
    }

    private renderUI(): void {
        if (!this.tag || typeof this.tag !== 'object' || !this.tag.properties) {
            this.rootElement.innerHTML = 'Tag not found or invalid.';
            return;
        }

        const form = renderTagForm(this.tag as any, {}, this.updateTag.bind(this));
        this.rootElement.innerHTML = '';
        this.rootElement.appendChild(form[0]);
    }

    public setTagName(tagName: string): void {
        this._tagName = tagName;
        this.load();
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