import { $, Y, Awareness, NObject } from '../imports';
import { EditorConfig } from '../types';
import { ToolbarManager } from './toolbar-manager';
import { MetadataManager } from './metadata-manager';
import { AwarenessManager } from './awareness-manager';
import EditorCore from './editor-core';

export default class Editor {
    private editorCore: EditorCore;
    private readonly doc: Y.Doc;
    private readonly config: EditorConfig;
    private readonly toolbar: ToolbarManager;
    private readonly metadata: MetadataManager;
    private readonly awareness: AwarenessManager;
    private readonly rootElement: JQuery;
    private _darkMode = false;

    public currentObject?: NObject | Y.Map<any>;
    public isPublic: boolean;

    public toggleDarkMode(): void {
        this._darkMode = !this._darkMode;
        this.config.app.toggleDarkMode();
        this.rootElement.toggleClass('dark-mode', this._darkMode);
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
        this.doc = new Y.Doc();
        this.rootElement = config.ele;
        this.isPublic = false;

        if (config.currentObject instanceof Y.Map) {
            this.isPublic = config.currentObject.get('public') || false;
        } else if (config.currentObject) {
            this.isPublic = config.currentObject.public || false;
        }

        // Initialize core components
        this.toolbar = new ToolbarManager(this);
        this.metadata = new MetadataManager(this.config.isReadOnly || false);
        this.awareness = new AwarenessManager(this.config.getAwareness(), this.rootElement.find('.content-editor'));
        this.editorCore = new EditorCore(this.config, this);

        // Initialize document state
        this.initDocument();
        this.initUI();
        this.initNetwork();
    }

    private initDocument(): void {
        this.currentObject = this.config.currentObject || this.createNewDocument();
        this.initializeContent();
    }

    private createNewDocument(): Y.Map<any> {
        const newDoc = new Y.Map();
        newDoc.set('content', new Y.Text('Start writing...'));
        newDoc.set('public', this.isPublic);
        newDoc.set('author', this.config.app.user().userId);
        newDoc.set('created', Date.now());
        return newDoc;
    }

    private initializeContent(): void {
        if (this.currentObject instanceof Y.Map && !this.currentObject.get('content')) {
            this.currentObject.set('content', new Y.Text());
        }
    }

    private initUI(): void {
        this.rootElement.empty().append(this.renderUI());
    
        this.bindEditorEvents();
        this.toolbar.init(this.rootElement);
    
        // Render metadata after binding events
        if (this.currentObject) {
            this.rootElement.find('.metadata-panel').append(this.currentObject instanceof Y.Map ? $('<div>') : this.metadata.renderMetadataPanel(this.currentObject));
        }
    }

    private renderUI(): string {
        return `
            <div class="editor-container">
                ${this.toolbar.render()}
                <div class="content-editor" contenteditable="true"></div>
                <div class="metadata-panel"></div>
            </div>
        `;
    }

    private bindEditorEvents(): void {
        this.rootElement.find('.content-editor')
            .on('input', () => this.awareness.updateLocalCursor())
            .on('keydown', this.handleShortcuts.bind(this));
    }

    private initNetwork(): void {
        if (this.config.net) {
            this.config.net.bindDocument(this.doc);
            this.awareness.awareness.setLocalStateField('user', this.config.app.user());
        }
    }

    private handleShortcuts(event: JQuery.KeyDownEvent): void {
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
                const content = this.rootElement.find('.content-editor').html();
                (this.currentObject as Y.Map<any>).set('content', new Y.Text(content));
            });
        } else if (this.currentObject)
            this.config.db.persistDocument(this.currentObject);
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

    public loadSnapshot(snapshot: Uint8Array): void {
        Y.applyUpdate(this.doc, snapshot);
        this.metadata.showToast('State restored');
    }

    public onUpdate(callback: () => void): void {
        this.doc.on('update', callback);
    }
}

// Augment EditorConfig interface with network capabilities
declare module '../types' {
    interface EditorConfig {
        net?: {
            bindDocument: (doc: Y.Doc) => void;
            syncAwareness: (state: Awareness) => void;
        };
        currentObject?: NObject | Y.Map<any>;
    }
}
