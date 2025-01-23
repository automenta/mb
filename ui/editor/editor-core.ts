import { $, Y, Awareness, DB, NObject, debounce } from '../imports';
import type { EditorConfig } from '../types';
import type { JSONContent } from '@tiptap/core';

export type UpdateCallback = () => void;

export default class EditorCore {
    private ytext: Y.Text | null;
    private editor: JQuery;
    private config: EditorConfig;
    private updateCallbacks: UpdateCallback[] = [];
    private editorInstance: any;

    constructor(config: EditorConfig, editorInstance: any) {
        if (!config.db) throw new Error('DB instance required');
        
        this.config = config;
        this.editorInstance = editorInstance;
        this.editor = this.renderEditor();

        if (config.currentObject)
            this.ytext = this.config.currentObject instanceof Y.Map ? this.config.currentObject.get('content') : this.config.currentObject.text;
    }

    private renderEditor(): JQuery {
        const content = this.ytext ? this.ytext.toString() : '';
        return $('<div>', {
            class: 'editor',
            contenteditable: !this.config.isReadOnly,
            spellcheck: true,
            html: content,
        })
            .on('input', debounce(() => this.saveContent(), 100))
            .on('keydown', e => {
                if (!this.config.isReadOnly && (e.ctrlKey || e.metaKey)) {
                    this.handleFormattingShortcuts(e);
                }
            });
    }

    private handleFormattingShortcuts(e: JQuery.KeyDownEvent) {
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

    private saveContent() {
        if (!this.ytext || this.config.isReadOnly) return;
        const content = this.editor.html();
        this.updateContent(content, true);
    }

    getEditorElement(): JQuery {
        return this.editor;
    }

    setupEditor(ytext: Y.Text): void {
        this.ytext = ytext;
        this.editor = this.renderEditor();
    }

    view(obj: any) {
        this.config.currentObject = obj;
        this.editor.html(obj.text.toString());
        this.triggerUpdate();
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
        this.config.db.doc.transact(() => {
            this.ytext?.delete(0, this.ytext.length);
            this.ytext?.insert(0, content);
        });
    }

    private loadContent(content: string) {
        this.updateContent(content);
    }
}