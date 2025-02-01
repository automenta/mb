import { $, Y } from '../imports';
import * as jsdiff from 'diff';
import type { EditorConfig } from '../types';
import { MetadataManager } from './metadata-manager';

export type UpdateCallback = () => void;

export default class EditorCore {
    private ytext: Y.Text | null;
    private editor: JQuery;
    private config: EditorConfig;
    private metadataManager: any; // TODO: Type this properly once MetadataManager is typed
    public editorElement: JQuery; // Publicly expose editor element

    constructor(config: EditorConfig, editorInstance: any, isReadOnly: boolean) {
        if (!config.db) throw new Error('DB instance required');

        this.config = config;
        this.metadataManager = new MetadataManager(isReadOnly); // Initialize MetadataManager
        this.config.isReadOnly = isReadOnly; // Store isReadOnly in config
        this.ytext = null; // Initialize ytext to null
        if (config.currentObject) {
            this.ytext = this.getContentFromObject(config.currentObject);
        }
        this.editorElement = this.renderEditor(); // Initialize and store editor element
    }


    private getContentFromObject(obj: any): Y.Text | null {
        return obj instanceof Y.Map ? obj.get('content') : obj.text;
    }

    private renderEditor(): JQuery {
        const content = this.ytext ? this.ytext.toString() : '';
        this.editor = $('<div>', {
            class: 'content-editor', // Changed class name to 'content-editor'
            contenteditable: !this.config.isReadOnly,
            spellcheck: true,
            html: content, // Use 'html' to set content, not 'text'
        })
            .on('input', (e) => this.saveContent(e))
            .on('keydown', e => this.handleFormattingShortcuts(e));
        return this.editor;
    }

    private saveContentToDb(content: string) {
        if (!this.ytext) return;
        const oldContent = this.ytext.toString();
        const diff = jsdiff.diffChars(oldContent, content);

        this.config.db.doc.transact(() => {
            let index = 0;
            diff.forEach((part) => {
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
}
