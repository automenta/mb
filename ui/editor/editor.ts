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
import
        $ {
    App
,
    Awareness
,
    NObject
,
    Tags
,
    Y
,
    private readonly doc: Y.Doc;
}
from
'../imports';

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
```
```
diff
---a / ui / editor / editor.ts
+++b / ui / editor / editor.ts
@@
-21, 7 + 21, 7
@@
    public readonly
rootElement
:
HTMLElement;
private
TagSelector;

-public
currentObject ? : NObject | Y.Map<any>;
+public
currentObject ? : NObject;
public
boolean;

public
toggleDarkMode()
:
void {
    @@ -87, 11 +87, 6 @@
        this.tagSelector = new TagSelector(this.rootElement, '');
    const contentEditorElement = this.rootElement.querySelector('.content-editor') as HTMLElement;
// console.log('contentEditorElement:', contentEditorElement);
-
}
-
    -private
initDocument()
:
void {
- this.currentObject = this.config.currentObject || this.createNewDocument();
-this.loadDocument(this.currentObject); // Load document after creation
}

private
createNewDocument()
:
Y.Map < any > {
    @@ -338, 7 +333, 6 @@
};
}
}
-
    // Augment EditorConfig interface with network capabilities and other missing properties
    declare
module '../types' {
    interface EditorConfig {

        ```
```
        diff
        ---
        a
        /
        ui
        /
        editor
        /
        editor
        .
        ts
        +++
        b
        /
        ui
        /
        editor
        /
        editor
        .
        ts
        @@ -
        21,
        7
        +
        21,
        7
        @@
            public readonly rootElement: HTMLElement;
        private
        tagSelector: TagSelector;

        -
        public
        currentObject?: NObject | Y.Map<any>;
        +
        public
        currentObject?: NObject;
        public
        isPublic: boolean;

        public

        toggleDarkMode(): void

    {
    @@
        -87, 11 + 87, 6
    @@
        this.tagSelector
        = new TagSelector(this.rootElement, '');
        const contentEditorElement = this.rootElement.querySelector('.content-editor') as HTMLElement;
        // console.log('contentEditorElement:', contentEditorElement);
        -
    }
    -
        -private
    initDocument()
:
    void {
    - this.currentObject = this.config.currentObject || this.createNewDocument();
    -this.loadDocument(this.currentObject); // Load document after creation
}

private
createNewDocument()
:
Y.Map < any > {
    @@ -338, 7 +333, 6 @@
};
}
}
-
    // Augment EditorConfig interface with network capabilities and other missing properties
    declare
module '../types' {
    interface EditorConfig {
        @@ -
        346,
        7
        +
        340,
        7
        @@
            bindDocument: (doc: Y.Doc) => void;
        syncAwareness: (state: Awareness) => void;
    }
    -currentObject ? : NObject | Y.Map<any>;
    +currentObject ? : NObject;
    () => Awareness;
    App;
    YDoc;
@@
    -354, 3 + 348, 4
@@
}
}
```

**3. ui/editor/metadata-manager.ts:**

*   **Changes:**
    *   Implement methods for updating each metadata field in `
NObject`. These methods will be called by the `
Form` component when the user modifies the input fields.

ui/editor/metadata-manager.ts
```
typescript
<< <<<<< SEARCH
}

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

private
initializeContent()
:
void {
    if(!
this.currentObject
)
this.currentObject = this.createNewDocument();

this.loadDocument(this.currentObject);

if (this.currentObject instanceof Y.Map && !this.currentObject.get('content'))
    this.currentObject.set('content', new Y.Text());
}


private
initUI(tags
:
Tags
):
void {
    this.rootElement.append(new UIBuilder(this.config.isReadOnly ?? false, tags).createEditorContainer());

    this.bindEvents();
    this.toolbar.init($(this.rootElement).find('.editor-container'));

    this.renderMetadataPanel();
}

private
renderMetadataPanel()
:
void {
    const metadataPanel = this.rootElement.querySelector('.metadata-panel');
    if(!
metadataPanel
)
{
    console.error('Metadata panel not found!');
}
else
{
    metadataPanel.innerHTML = '';
    if (this.currentObject && !(this.currentObject instanceof Y.Map))
        metadataPanel.append(this.meta.renderMetadataPanel(this.currentObject)[0]);
}
}

private
bindEvents()
:
void {
    const contentEditor = this.rootElement.querySelector('.content-editor');
    contentEditor?.addEventListener('input', () => {
    this.awareness.updateLocalCursor();
    this.saveDocument();
});
contentEditor?.addEventListener('keydown', this.handleShortcuts.bind(this));

const titleEditor = this.rootElement.querySelector('.document-title');
titleEditor?.addEventListener('input', this.handleTitleChange.bind(this));
}

private
handleTitleChange(event
:
Event
):
void {
    const titleEditor = event.target as HTMLInputElement;
    const newTitle = titleEditor.value;
    if(this.currentObject
)
{
    if (this.currentObject instanceof NObject) {
        this.currentObject.name = newTitle;
    } else if (this.currentObject instanceof Y.Map) {
        this.currentObject.set('name', newTitle);
    }
    this.config.app.store.setCurrentObject(this.currentObject);
}
}

private
initNetwork()
:
void {
    if(this.config.net
)
{
    this.config.net.bindDocument(this.doc);
    this.awareness.awareness.setLocalStateField('user', this.config.app.user());
}
}

private
handleShortcuts(event
:
KeyboardEvent
):
void {
    if(event.ctrlKey || event.metaKey
)
{
    switch (event.key.toLowerCase()) {
        case 's':
            event.preventDefault();
            this.saveDocument();
            break;
    }
}
}

public
saveDocument()
:
void {
    if(this.currentObject && this.config.db
)
{
    this.saveCurrentObject();
    this.meta.showToast('Document saved');
}
}

private
saveCurrentObject()
{
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

public
loadObject(objectId
:
string
):
void {
    const obj = this.config.db.get(objectId);
    if(obj) {
        this.loadDocument(obj);
    } else {
        console.error('Failed to load object:', objectId);
    }
}

public
loadDocument(object
:
NObject | Y.Map<any>
):
void {
    this.currentObject = object;

    if(object instanceof Y.Map
)
{
    this.loadYMapDocument(object);
}
else
if (object instanceof NObject) {
    this.loadNObjectDocument(object);
} else {
    this.clearDocumentView();
}
this.updatePrivacy();
}

private
loadYMapDocument(object
:
Y.Map<any>
):
void {
    const title = object.get('name') || 'Untitled';
    const content = object.get('content');
    const contentEditor = this.rootElement.querySelector('.content-editor') as HTMLElement;
    const titleEditor = this.rootElement.querySelector('.document-title') as HTMLInputElement;

    if(titleEditor) titleEditor.value = title;

    if(content instanceof Y.Text
)
{
    contentEditor.innerHTML = content.toString();
}
else
if (content !== null && content !== undefined) {
    contentEditor.innerHTML = content.toString();
} else {
    if (!object.has('content')) {
        object.set('content', new Y.Text());
    }
    contentEditor.innerHTML = '';
}
const name = object.get('name') || 'Untitled';
if (titleEditor) titleEditor.value = name;
const tags = object.get('tags');
if (tags) {
    this.tagSelector.setTags(tags);
}
this.tagSelector.setTagName(object.get('id'));
}

private
loadNObjectDocument(object
:
NObject
):
void {
(this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = object.text.toString();
(this.rootElement.querySelector('.document-title') as HTMLInputElement).value = object.name;
this.meta.renderMetadataPanel(object);
}

private
clearDocumentView()
:
void {
(this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = '';
this.meta.clearMetadataPanel();
}

public
togglePrivacy()
:
void {
    this.isPublic = !this.isPublic;
    this.updatePrivacy();
    this.meta.updatePrivacyIndicator(this.isPublic);
}

private
updatePrivacy()
{
    if (this.currentObject instanceof Y.Map) {
        this.currentObject.set('public', this.isPublic);
    } else if (this.currentObject) {
        this.currentObject.public = this.isPublic;
    }

}

public
clearIfCurrent(objectId
:
string
):
void {
    const currentId = this.currentObject instanceof Y.Map ?
        this.currentObject.get('id') :
        this.currentObject?.id;

    if(currentId === objectId
)
{
    this.clear();
}
}

public
clear()
:
void {
    this.currentObject = undefined;
(this.rootElement.querySelector('.content-editor') as HTMLElement).innerHTML = '';
this.meta.clearMetadataPanel();
}

public
loadSnapshot(snapshot
:
Uint8Array
):
void {
    Y.applyUpdate(this.doc, snapshot);
    this.meta.showToast('State restored');
}

public
onUpdate(callback
:
() => void
):
void {
    this.doc.on('update', callback);
}

public
getTestConfig()
:
Partial < EditorConfig > {
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
