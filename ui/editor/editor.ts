import {$, App, Awareness, NObject, Tags, Y} from '../imports';
import {EditorConfig} from '../types';
import type {Doc as YDoc} from 'yjs'; // Import Doc type
import {ToolbarManager} from './toolbar-manager';
import {MetadataManager} from './metadata-manager';
import {AwarenessManager} from './awareness-manager';
import EditorCore from './editor-core';
import UIBuilder from './ui-builder';
import TagSelector from './tag-selector';
import { randomUUID } from "crypto";
import DB from '../../core/db';
export default class Editor {
    public editorCore: EditorCore;
    private readonly doc: Y.Doc;
    private readonly config: EditorConfig;
    private readonly toolbar: ToolbarManager;
    private readonly meta: MetadataManager;
    private readonly awareness: AwarenessManager;
    public readonly rootElement: HTMLElement;
    private tagSelector: TagSelector;

    public currentObject?: NObject | Y.Map<any>;
    public isPublic: boolean;

    public toggleDarkMode(): void {
        this.darkMode = !this.darkMode;
        //this.config.app.toggleDarkMode();
        this.rootElement.classList.toggle('dark-mode', this.darkMode);
    }

    private applyFormat(command: string, value: string | undefined = undefined): void {
        document.execCommand(command, false, value);
    }

    public formatText(format: string, value: any): void {
        this.editorCore.formatText(format, value);
    }

    public setBlockFormat(format: string): void {
        this.editorCore.setBlockFormat(format);
    }

    constructor(config: EditorConfig) {
        this.config = config;
        this.doc = config.ydoc; // Use ydoc from config
        // console.log('Editor.constructor: this.doc:', this.doc); // Add log
        this.rootElement = config.ele as HTMLElement; // Cast to HTMLElement
        this.isPublic = false;
        // Initialize TagSelector

        // Initialize UI and then document state
        const tagManager = config.app.tags;
        this.initUI(tagManager);
        this.initDocument();
        this.initNetwork();
        this.awareness = new AwarenessManager(this.config.getAwareness(), this.rootElement.querySelector('.content-editor') as HTMLElement);
        this.tagSelector = new TagSelector(this.rootElement, '');
        const contentEditorElement = this.rootElement.querySelector('.content-editor') as HTMLElement;
        // console.log('contentEditorElement:', contentEditorElement);
    }

    private initDocument(): void {
        this.currentObject = this.config.currentObject || this.createNewDocument();
        this.loadDocument(this.currentObject); // Load document after creation
    }

    private createNewDocument(): Y.Map<any> {
        const yMapObjects = this.config.db.doc.getMap('yMapObjects');
        const newId = randomUUID(); // Generate a unique ID

        let newDoc;
        if (!yMapObjects.has(newId)) {
            newDoc = new Y.Map();
            newDoc.set('content', new Y.Text('Start writing...'));
            newDoc.set('public', this.isPublic);
            newDoc.set('author', this.config.app.user().userId);
            newDoc.set('created', Date.now());
            newDoc.set('id', newId);
            yMapObjects.set(newId, newDoc);
        } else {
            newDoc = yMapObjects.get(newId);
        }

        return newDoc || new Y.Map();
    }

    private initializeContent(): void {
        if (!this.currentObject)
            this.currentObject = this.createNewDocument();

        this.loadDocument(this.currentObject);

        if (this.currentObject instanceof Y.Map && !this.currentObject.get('content'))
            this.currentObject.set('content', new Y.Text());
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
            if (this.currentObject && !(this.currentObject instanceof Y.Map))
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
            if (this.currentObject instanceof NObject) {
                this.currentObject.name = newTitle;
                this.config.app.store.setCurrentObject(this.currentObject);
            } else {
                this.currentObject.set('name', newTitle);
            }
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

    public saveDocument(): void {
        if (this.currentObject && this.config.db) {
            this.saveCurrentObject();
            this.meta.showToast('Document saved');
        }
    }    

    private saveCurrentObject() {
        if (this.currentObject instanceof Y.Map) {
            this.config.db.doc.transact(() => {
                const content = (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML;
                (this.currentObject as Y.Map<any>).set('content', new Y.Text(content));
                const tags = this.tagSelector.getTags();
                (this.currentObject as Y.Map<any>).set('tags', tags);
            });
        } else if (this.currentObject instanceof NObject) {
            this.currentObject.text = (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML; // Use NObject's text property
            this.currentObject.tags = this.tagSelector.getTags();
            this.config.db.persistDocument(this.currentObject);
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

    public loadDocument(object: NObject | Y.Map<any>): void {
        this.currentObject = object;
        if (object instanceof Y.Map) {
            const title = object.get('name') || 'Untitled';
            const content = object.get('content');
            const contentEditor = this.rootElement.querySelector('.content-editor') as HTMLElement;
            const titleEditor = this.rootElement.querySelector('.document-title') as HTMLInputElement;

            if (titleEditor) titleEditor.value = title;

            if (content instanceof Y.Text) {
                contentEditor.innerHTML = content.toString();
            } else if (content !== null && content !== undefined) {
                contentEditor.innerHTML = content.toString();
            } else {
                if (!object.has('content')) {
                    object.set('content', new Y.Text());
                }
                contentEditor.innerHTML = '';
            }

            if (titleEditor) titleEditor.value = title;

            if (content instanceof Y.Text) {
                contentEditor.innerHTML = content.toString();
            } else {
                if (!object.has('content')) {
                    object.set('content', new Y.Text());
                }
                contentEditor.innerHTML = '';
            }
            const tags = object.get('tags');
            if (tags) {
                this.tagSelector.setTags(tags);
            }
            this.tagSelector.setTagName(object.get('id'));
        } else if (object instanceof NObject) {
            (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = object.text.toString();
            (this.rootElement.querySelector('.document-title') as HTMLInputElement).value = object.name;
            this.meta.renderMetadataPanel(object);
        } else {
            (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = '';
            this.meta.clearMetadataPanel();
        }
        this.updatePrivacy();
    }

    public togglePrivacy(): void {
        this.isPublic = !this.isPublic;
        this.updatePrivacy();
        this.meta.updatePrivacyIndicator(this.isPublic);
    }

    private updatePrivacy() {
        if (this.currentObject instanceof Y.Map) {
            this.currentObject.set('public', this.isPublic);
        } else if (this.currentObject) {
            this.currentObject.public = this.isPublic;
        }

    }

    public clearIfCurrent(objectId: string): void {
        const currentId = this.currentObject instanceof Y.Map ?
            this.currentObject.get('id') :
            this.currentObject?.id;

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
}

// Augment EditorConfig interface with network capabilities and other missing properties
declare module '../types' {
    interface EditorConfig {
        net?: {
            bindDocument: (doc: Y.Doc) => void;
            syncAwareness: (state: Awareness) => void;
        };
        currentObject?: NObject | Y.Map<any>;
        getAwareness: () => Awareness;
        app: App;
        ydoc: YDoc;
        db: DB;
    }
}
