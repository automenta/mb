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

    public formatText(format: string, value: any): void {
        const selection = this.editorInstance.getSelection();
        if (selection) {
            this.editorInstance.formatText(selection.index, selection.length, format, value, 'user');
        }
    }

    public setBlockFormat(format: string): void {
        const selection = this.editorInstance.getSelection();
        if (selection) {
            this.editorInstance.formatLine(selection.index, selection.length, format, true, 'user');
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
