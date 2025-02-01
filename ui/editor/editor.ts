import {$, App, Awareness, NObject, Tags, Y} from '../imports';
import {EditorConfig} from '../types';
import type {Doc as YDoc} from 'yjs'; // Import Doc type // Import Doc type
import {ToolbarManager} from './toolbar-manager';
import {MetadataManager} from './metadata-manager';
import {AwarenessManager} from './awareness-manager';
import EditorCore from './editor-core';
import UIBuilder from './ui-builder';
import TagSelector from './tag-selector';
import DB from '../../core/db';

export default class Editor {
    public editorCore: EditorCore;
    public readonly rootElement: HTMLElement;
    public currentObject?: NObject;
    public isPublic: boolean;
    private readonly doc: Y.Doc;
    private readonly config: EditorConfig;
    private readonly toolbar: ToolbarManager;
    private readonly meta: MetadataManager;
    private readonly awareness: AwarenessManager;
    private tagSelector: TagSelector;
    darkMode: boolean;

    constructor(config: EditorConfig, editorInstance: any, isReadOnly: boolean) {
        this.config = config;
        this.doc = config.ydoc;
        this.rootElement = config.ele as HTMLElement;
        this.isPublic = false;

        // Initialize UI and then document state
        const tagManager = config.app.tags;
        this.toolbar = new ToolbarManager(this);
        this.meta = new MetadataManager(isReadOnly);
        this.initUI(tagManager);
        this.initDocument();
        this.initNetwork();
        this.awareness = new AwarenessManager(this.config.getAwareness(), this.rootElement.querySelector('.content-editor') as HTMLElement);
        this.tagSelector = new TagSelector(this.rootElement, '');
        const contentEditorElement = this.rootElement.querySelector('.content-editor') as HTMLElement;
    }

    public toggleDarkMode(): void {
        this.darkMode = !this.darkMode;
        //this.config.app.toggleDarkMode();
        this.rootElement.classList.toggle('dark-mode', this.darkMode);
    }

    public formatText(format: string, value: any): void {
        this.editorCore.formatText(format, value);
    }

    public setBlockFormat(format: string): void {
        switch (format) {
            case 'heading':
                document.execCommand('formatBlock', false, '<h1>'); // Default to H1 for heading
                break;
            case 'pre':
                document.execCommand('formatBlock', false, '<pre>');
                break;
            case 'ordered-list':
                document.execCommand('insertOrderedList', false);
                break;
            case 'bulleted-list':
                document.execCommand('insertUnorderedList', false);
                break;
            case 'blockquote':
                document.execCommand('formatBlock', false, '<blockquote>');
                break;
            default:
                if (format.startsWith('<h') && format.endsWith('>')) {
                    document.execCommand('formatBlock', false, format);
                } else {
                    document.execCommand('formatBlock', false, format);
                }
                break;
        }
    }

    public saveDocument(): void {
        if (this.currentObject && this.config.db) {
            this.saveCurrentObject();
            this.meta.showToast('Document saved');
        }
    }

    public loadObject(objectId: string): void {
        const obj = this.config.db.get(objectId);
        if (obj) {
            this.loadDocument(obj);
        } else {
            console.error('Failed to load object:', objectId);
        }
    }

    public loadDocument(object: NObject): void {
        this.currentObject = object;

        this.loadNObjectDocument(object);
        this.updatePrivacy();
    }

    public togglePrivacy(): void {
        this.isPublic = !this.isPublic;
        this.updatePrivacy();
        this.meta.updatePrivacyIndicator(this.isPublic);
    }

    public clearIfCurrent(objectId: string): void {
        const currentId = this.currentObject?.id;

        if (currentId === objectId) {
            this.clear();
        }
    }

    public clear(): void {
        this.currentObject = undefined;
        (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = '';
        this.meta.clearMetadataPanel();
    }

    public loadSnapshot(snapshot: Uint8Array): void {
        Y.applyUpdate(this.doc, snapshot);
        this.meta.showToast('State restored');
    }

    public onUpdate(callback: () => void): void {
        this.doc.on('update', callback);
    }

    public getTestConfig(): Partial<EditorConfig> {
        return {
            db: this.config.db,
            networkStatusCallback: this.config.networkStatusCallback,
            getAwareness: () => this.config.getAwareness(),
            app: this.config.app,
            ydoc: YDoc;
            db: DB;
        };
    }

    private applyFormat(command: string, value: string | undefined = undefined): void {
        document.execCommand(command, false, value);
    }

    private initDocument(): void {
        this.currentObject = this.config.currentObject || this.createNewDocument();
        this.loadDocument(this.currentObject);
    }

    private createNewDocument(): NObject {
        return new NObject(this.doc);
    }

    private initializeContent(): void {
        if (!this.currentObject)
            this.currentObject = this.createNewDocument();

        this.loadDocument(this.currentObject);

        if (!this.currentObject.text)
            this.currentObject.text = new Y.Text();
    }

    private initUI(tags: Tags): void {
        this.rootElement.append(new UIBuilder(this.config.isReadOnly ?? false, tags).createEditorContainer());

        this.bindEvents();
        this.toolbar.init($(this.rootElement).find('.editor-container'));

        this.renderMetadataPanel();
    }

    private renderMetadataPanel(): void {
        const metadataPanel = this.rootElement.querySelector('.metadata-panel');
        if (!metadataPanel) {
            console.error('Metadata panel not found!');
        } else {
            metadataPanel.innerHTML = '';
            if (this.currentObject)
                metadataPanel.append(this.meta.renderMetadataPanel(this.currentObject)[0]);
        }
    }

    private bindEvents(): void {
        const contentEditor = this.rootElement.querySelector('.content-editor');
        contentEditor?.addEventListener('input', () => {
            this.awareness.updateLocalCursor();
            this.saveDocument();
        });
        contentEditor?.addEventListener('keydown', this.handleShortcuts.bind(this));

        const titleEditor = this.rootElement.querySelector('.document-title');
        titleEditor?.addEventListener('input', this.handleTitleChange.bind(this));
    }

    private handleTitleChange(event: Event): void {
        const titleEditor = event.target as HTMLInputElement;
        const newTitle = titleEditor.value;
        if (this.currentObject) {
            this.currentObject.name = newTitle;
            this.config.app.store.setCurrentObject(this.currentObject);
        }
    }

    private initNetwork(): void {
        if (this.config.net) {
            this.config.net.bindDocument(this.doc);
            this.awareness.awareness.setLocalStateField('user', this.config.app.user());
        }
    }

    private handleShortcuts(event: KeyboardEvent): void {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    this.saveDocument();
                    break;
            }
        }
    }

    private saveCurrentObject() {
        if (this.currentObject) {
            this.currentObject.text = (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML; // Use NObject's text property
            this.currentObject.tags = this.tagSelector.getTags();
            this.config.db.add(this.currentObject);
        }
    }

    private loadYMapDocument(object: Y.Map<any>): void {
        // This method is no longer needed for NObjects
    }

    private loadNObjectDocument(object: NObject): void {
        (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = object.text.toString();
        (this.rootElement.querySelector('.document-title') as HTMLInputElement).value = object.name;
        this.meta.renderMetadataPanel(object);
    }

    private clearDocumentView(): void {
        (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = '';
        this.meta.clearMetadataPanel();
    }

    // TODO: Implement cursor position synchronization using Awareness
    // - In initNetwork():
    //   - Subscribe to awareness changes
    //   - Send local cursor position updates
    // - Add methods:
    //   - updateCursorPosition(selection: Selection)
    //   - renderRemoteCursors(awarenessStates: Map<number, any>)

    private updatePrivacy() {
        if (this.currentObject) {
            this.currentObject.public = this.isPublic;
        }
    }
}

// Augment EditorConfig interface with network capabilities and other missing properties
declare module '../types' {
    interface EditorConfig {
        net?: {
            bindDocument: (doc: Y.Doc) => void;
            syncAwareness: (state: Awareness) => void;
        };
        currentObject?: NObject;
        getAwareness: () => Awareness;
        app: App;
        ydoc: YDoc;
        db: DB;
    }
}
