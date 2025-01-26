import { $, Y, debounce } from '../imports';
import * as jsdiff from 'diff';
import type { EditorConfig } from '../types';
import { MetadataManager } from './metadata-manager';

export type UpdateCallback = () => void;

export default class EditorCore {
    private ytext: Y.Text | null;
    private editor: JQuery;
    private config: EditorConfig;
    private updateCallbacks: UpdateCallback[] = [];
    private editorInstance: any;
    private metadataManager: any; // TODO: Type this properly once MetadataManager is typed

    constructor(config: EditorConfig, editorInstance: any, isReadOnly: boolean) {
        if (!config.db) throw new Error('DB instance required');

        this.config = config;
        this.editorInstance = editorInstance;
        this.metadataManager = new MetadataManager(isReadOnly); // Initialize MetadataManager
        this.config.isReadOnly = isReadOnly; // Store isReadOnly in config
        this.editor = this.renderEditor();

        if (config.currentObject)
            this.ytext = this.getContentFromObject(this.config.currentObject);
    }

    private getContentFromObject(obj: any): Y.Text | null {
        return obj instanceof Y.Map ? obj.get('content') : obj.text;
    }

    private renderEditor(): JQuery {
        const content = this.ytext ? this.ytext.toString() : '';
        return $('<div>', {
            class: 'editor',
            contenteditable: !this.config.isReadOnly,
            spellcheck: true,
            text: content,
        })
            .on('input', debounce((e) => this.saveContent(e), 100))
            .on('keydown', e => {
                if (!this.config.isReadOnly && (e.ctrlKey || e.metaKey)) {
                    this.handleFormattingShortcuts(e);
                }
            });
    }

    private handleFormattingShortcuts(e: JQuery.KeyDownEvent) {
        if (this.config.isReadOnly) return; // Early return if read-only
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                this.editorInstance.applyFormat('bold');
                this.triggerUpdate();
                break;
            case 'i':
                e.preventDefault();
                this.editorInstance.applyFormat('italic');
                this.triggerUpdate();
                break;
            case 'u':
                e.preventDefault();
                this.editorInstance.applyFormat('underline');
                this.triggerUpdate();
                break;
        }
    }

    private saveContent(e: Event) {
        if (this.config.isReadOnly) return; // Early return if read-only
        if (!this.ytext) return;
        const content = this.editor.text();
        this.updateContent(content, true);
    }

    getEditorElement(): JQuery {
        return this.editor;
    }

    setupEditor(ytext: Y.Text): void {
        this.ytext = ytext;
        this.editor = this.renderEditor();
    }
    

    loadSnapshot(snapshot: any) {
        if (snapshot) {
            this.setContent(snapshot);
        }
    }

    setContent(content: string) {
        this.loadContent(content);
    }

    onUpdate(callback: UpdateCallback) {
        this.updateCallbacks.push(callback);
    }

    private triggerUpdate() {
        this.updateCallbacks.forEach(callback => callback());
    }

    private updateContent(content: string, saveToDb: boolean = false) {
        if (this.config.isReadOnly) return;
        this.editor.html(content);
        this.triggerUpdate();
        if (saveToDb) {
            this.saveContentToDb(content);
        }
    }


        private saveContentToDb(content: string) {
            if (!this.ytext) return;
            const oldContent = this.ytext.toString();
            const diff = jsdiff.diffChars(oldContent, content);

            this.config.db.doc.transact(() => {
                let index = 0;
                diff.forEach(part => {
                    if (part.removed) {
                        this.ytext?.delete(index, part.count);
                    } else if (part.added) {
                        this.ytext?.insert(index, part.value);
                        index += part.value.length;
                    } else {
                        index += part.count;
                    }
                });
            });
        }
    private loadContent(content: string) {
        this.updateContent(content);
    }
}