import { $, Y, Awareness, NObject, App } from '../imports';
import { EditorConfig } from '../types';
import type { Doc as YDoc } from 'yjs'; // Import Doc type
import { ToolbarManager } from './toolbar-manager';
import { MetadataManager } from './metadata-manager';
import { AwarenessManager } from './awareness-manager';
import EditorCore from './editor-core';

export default class Editor {
    public editorCore: EditorCore;
    private readonly doc: Y.Doc;
    private readonly config: EditorConfig;
    private readonly toolbar: ToolbarManager;
    private readonly metadata: MetadataManager;
    private readonly awareness: AwarenessManager;
    public readonly rootElement: HTMLElement;
    private _darkMode = false;

    public currentObject?: NObject | Y.Map<any>;
    public isPublic: boolean;

    public toggleDarkMode(): void {
        this._darkMode = !this._darkMode;
        this.config.app.toggleDarkMode();
        this.rootElement.classList.toggle('dark-mode', this._darkMode);
    }

    private applyFormat(command: string, value: string | null = null): void {
        document.execCommand(command, false, value);
    }

    public formatText(formatType: string): void {
        this.applyFormat(formatType);
    }

    public setBlockFormat(format: string): void {
        this.applyFormat('formatBlock', format);
    }

    constructor(config: EditorConfig) {
        this.config = config;
        this.doc = config.ydoc; // Use ydoc from config
        // console.log('Editor.constructor: this.doc:', this.doc); // Add log
        this.rootElement = config.ele as HTMLElement; // Cast to HTMLElement
        this.isPublic = false;
        // console.log('Editor.constructor: rootElement:', this.rootElement); 

        if (config.currentObject instanceof Y.Map) {
            this.isPublic = config.currentObject.get('public') || false;
        } else if (config.currentObject) {
            this.isPublic = config.currentObject.public || false;
        }

        // Initialize core components
        this.toolbar = new ToolbarManager(this);
        this.metadata = new MetadataManager(this.config.isReadOnly || false);
        this.editorCore = new EditorCore(this.config, this, this.config.isReadOnly);

        // Initialize UI and then document state
        this.initUI();
        this.initDocument();
        this.initNetwork();
        this.awareness = new AwarenessManager(this.config.getAwareness(), this.rootElement.querySelector('.content-editor') as HTMLElement);
        const contentEditorElement = this.rootElement.querySelector('.content-editor') as HTMLElement;
        // console.log('contentEditorElement:', contentEditorElement); 
    }

    private initDocument(): void {
        this.currentObject = this.config.currentObject || this.createNewDocument();
        this.loadDocument(this.currentObject); // Load document after creation
    }

    private createNewDocument(): Y.Map<any> {
        const yMapObjects = this.config.db.doc.getMap('yMapObjects');
        const newId = Date.now().toString(); // Generate a unique ID
    
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
    
        return newDoc;
    }

    private initializeContent(): void {
        if (!this.currentObject) {
            this.currentObject = this.createNewDocument();
        }
        this.loadDocument(this.currentObject);
        if (this.currentObject instanceof Y.Map && !this.currentObject.get('content')) {
            this.currentObject.set('content', new Y.Text());
        }
    }

    
        private initUI(): void {
            // this.rootElement.innerHTML = ''; // Replace empty() with innerHTML = '' - REMOVE THIS LINE
            // console.log('Editor.initUI: rootElement:', this.rootElement); 
            this.rootElement.append(this.renderUI());
            // console.log('Editor.initUI: rootElement.innerHTML after append:', this.rootElement.innerHTML); 
            // console.log('Editor.initUI: contentEditorElement:', this.rootElement.querySelector('.content-editor')); 

        this.bindEditorEvents();
        this.toolbar.init($(this.rootElement).find('.editor-container')); //toolbar.init expects JQuery element

        // Render metadata after binding events
        if (this.currentObject) {
            // console.log('metadataPanel:', this.rootElement.querySelector('.metadata-panel')); // Debug log - THIS LINE IS NOW REDUNDANT
            const metadataPanel = this.rootElement.querySelector('.metadata-panel');
            if (!metadataPanel) {
                console.error('Metadata panel not found!');
                return; // Exit if metadataPanel is not found
            }
            metadataPanel.innerHTML = ''; // Clear existing content
            metadataPanel.append(this.currentObject instanceof Y.Map ? document.createElement('div') : this.metadata.renderMetadataPanel(this.currentObject)[0]); // Append metadata content
        }
    }
    private renderUI(): HTMLElement {
        const editorContainer = document.createElement('div');
        editorContainer.className = 'editor-container';

        const titleEditor = document.createElement('input');
        titleEditor.type = 'text';
        titleEditor.className = 'document-title';
        editorContainer.append(titleEditor);

        const contentEditor = document.createElement('div');
        contentEditor.className = 'content-editor';
        contentEditor.contentEditable = 'true';
        editorContainer.append(contentEditor);

        const metadataPanel = document.createElement('div');
        metadataPanel.className = 'metadata-panel';
        metadataPanel.textContent = 'Metadata Panel Test';
        editorContainer.append(metadataPanel);

        return editorContainer;
    }

    private bindEditorEvents(): void {
        const contentEditor = this.rootElement.querySelector('.content-editor');
        contentEditor?.addEventListener('input', () => {
            this.awareness.updateLocalCursor();
            this.saveDocument(); // Call saveDocument on input event
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
               this.config.db.persistDocument(this.currentObject);
               this.config.app.store.setCurrentObject(this.currentObject);
           } else if (this.currentObject instanceof Y.Map) {
               this.currentObject.set('name', newTitle);
               // Find and update the corresponding object in the store's objects array
               const objects = this.config.app.store.getState().objects;
               const updatedObjects = objects.map(obj => {
                   if (this.currentObject instanceof Y.Map && obj.id === this.currentObject.get('id')) {
                       return this.config.db.get(obj.id); // Fetch updated object from db
                   }
                   return obj;
               });
               this.config.app.store.update(state => ({ ...state, objects: updatedObjects }));
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
            this.metadata.showToast('Document saved');
        }
    }

    private saveCurrentObject() {
        if (this.currentObject instanceof Y.Map) {
            this.config.db.doc.transact(() => {
                const content = (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML;
                (this.currentObject as Y.Map<any>).set('content', new Y.Text(content));
            });
        } else if (this.currentObject instanceof NObject) {
            const content = (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML;
            this.currentObject.text = content;
            this.config.db.persistDocument(this.currentObject);
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
            } else {
                if (!object.has('content')) {
                    object.set('content', new Y.Text());
                }
                contentEditor.innerHTML = '';
            }
        } else if (object instanceof NObject) {
            (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = object.text.toString();
            (this.rootElement.querySelector('.document-title') as HTMLInputElement).value = object.name;
            this.metadata.renderMetadataPanel(object);
        } else {
            (this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = '';
            this.metadata.clearMetadataPanel();
        }
        this.updatePrivacy();
    }

    public togglePrivacy(): void {
        this.isPublic = !this.isPublic;
        this.updatePrivacy();
        this.metadata.updatePrivacyIndicator(this.isPublic);
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
        this.metadata.clearMetadataPanel();
    }

    public loadSnapshot(snapshot: Uint8Array): void {
        Y.applyUpdate(this.doc, snapshot);
        this.metadata.showToast('State restored');
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
            currentObject: this.currentObject
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
    }
}
