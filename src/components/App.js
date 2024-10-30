import '/style.css';
import DB from '/src/db.js';
import Network from '/src/net.js';
import MePage from './Me.js';

import * as Y from 'yjs';
import {WebrtcProvider} from 'y-webrtc';

class PageContextMenu {
    constructor(shadowRoot, db, app) {
        this.db = db;
        this.app = app;
        this.shadowRoot = shadowRoot;
        this.selectedPageId = null;
        this.ele = this.shadowRoot.querySelector('#context-menu');
        this.renderContextMenu();
        this.bindEvents();
    }

    renderContextMenu() {
        this.ele.innerHTML = `
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">Delete</li>
            </ul>
        `;
    }

    bindEvents() {
        this.shadowRoot.addEventListener('click', e => {
            if (!this.ele.contains(e.target)) this.hide();
        });
        this.ele.addEventListener('click', e => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;
            if (action === 'rename-page') this.renamePage();
            else if (action === 'delete-page') this.deletePage();
            this.hide();
        });
    }

    renamePage() {
        if (this.selectedPageId) {
            const newName = prompt('Enter new page name:');
            if (newName) this.db.pageTitle(this.selectedPageId, newName);
        }
    }

    deletePage() {
        if (this.selectedPageId && confirm('Are you sure you want to delete this page?')) {
            this.db.pages.delete(this.selectedPageId);
            const page = this.db.page(this.selectedPageId);
            if (page && page.isPublic) this.app.net.removeSharedDocument(this.selectedPageId);
        }
    }

    showContextMenu(event, pageId) {
        event.preventDefault();
        this.selectedPageId = pageId;
        const { clientX: x, clientY: y } = event;
        Object.assign(this.ele.style, {
            top: `${y}px`,
            left: `${x}px`,
            display: 'block'
        });
    }

    hide() {
        this.ele.style.display = 'none';
    }
}

class Sidebar {
    constructor(shadowRoot, db, app) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.app = app;
        this.init();
    }

    init() {
        this.element = this.shadowRoot.querySelector('#sidebar');
        this.renderSidebar();
        this.bindEvents();
    }

    renderSidebar() {
        this.element.appendChild(this.menu());
        this.renderPageList();
    }

    renderPageList() {
        this.pageList = document.createElement('ul');
        this.pageList.id = 'page-list';
        this.element.appendChild(this.pageList);
        this.db.pages.observe(() => this.updatePageList());
        this.updatePageList();
    }

    menu() {
        const menuBar = document.createElement('div');
        menuBar.id = 'menubar';
        menuBar.classList.add('menubar');

        const addPageButton = document.createElement('button');
        addPageButton.id = 'add-page';
        addPageButton.classList.add('menubar-button', 'add-page-button');
        addPageButton.textContent = '+';
        addPageButton.title = 'Add New Page';
        addPageButton.addEventListener('click', () => {
            const pageId = `page-${Date.now()}`;
            this.db.pageNew(pageId, 'Empty', false);
            this.app.editor.viewPage(pageId);
        });
        menuBar.appendChild(addPageButton);

        const specialPages = [
            { id: 'profile', title: 'Me', class: MePage },
            { id: 'friends', title: 'Friends', class: FriendsPage },
            { id: 'network', title: 'Net', class: NetPage },
            { id: 'database', title: 'DB', class: DBPage },
        ];

        specialPages.forEach(page => {
            const button = document.createElement('button');
            button.classList.add('menubar-button');
            button.textContent = page.title;
            button.title = `Access ${page.title}`;
            let pageInstance;
            switch (page.id) {
                case 'profile': pageInstance = this.app.profilePage; break;
                case 'friends': pageInstance = this.app.friendsListPage; break;
                case 'network': pageInstance = this.app.networkPage; break;
                case 'database': pageInstance = this.app.databasePage; break;
                default: console.warn(`No page class defined for ${page.id}`);
            }
            button.addEventListener('click', () => pageInstance.render());
            menuBar.appendChild(button);
        });

        return menuBar;
    }

    updatePageList() {
        this.pageList.innerHTML = '';
        this.db.pages.forEach((value, key) => {
            const li = document.createElement('li');
            li.textContent = value.title;
            li.dataset.pageId = key;
            li.title = `Open ${value.title}`;
            li.classList.add('user-page-item');
            if (value.isPublic) {
                const span = document.createElement('span');
                span.textContent = ' 🌐';
                span.title = 'Public Document';
                li.appendChild(span);
            }
            li.addEventListener('click', () => this.app.editor.viewPage(key));
            li.addEventListener('contextmenu', e => {
                e.preventDefault();
                this.app.contextMenu.showContextMenu(e, key);
            });
            li.addEventListener('dblclick', () => {
                const page = this.db.page(key);
                if (page) {
                    const newPrivacy = !page.isPublic;
                    this.db.pagePrivacy(key, newPrivacy);
                    if (newPrivacy) this.app.net.shareDocument(key);
                    else this.app.net.unshareDocument(key);
                    this.updatePageList();
                }
            });
            this.pageList.appendChild(li);
        });
    }

    bindEvents() {}
}

class FriendsPage {
    constructor(shadowRoot, getAwareness) {
        this.shadowRoot = shadowRoot;
        this.getAwareness = getAwareness;
    }

    render() {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';
        const container = document.createElement('div');
        container.classList.add('friends-list-page');
        editorContainer.appendChild(container);
        const header = document.createElement('h3');
        header.textContent = 'Friends';
        container.appendChild(header);
        const ul = document.createElement('ul');
        container.appendChild(ul);

        const updateFriends = () => {
            const users = [];
            this.getAwareness().getStates().forEach(state => {
                if (state.user) users.push(state.user);
            });
            ul.innerHTML = '';
            users.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.name;
                li.style.color = user.color;
                ul.appendChild(li);
            });
        };

        updateFriends();
        this.getAwareness().on('change', updateFriends);
    }
}

class NetPage {
    constructor(shadowRoot, db) {
        this.shadowRoot = shadowRoot;
        this.db = db;
    }

    render() {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';
        const container = document.createElement('div');
        container.classList.add('network-page');
        editorContainer.appendChild(container);
        if (typeof this.db.renderNetwork === 'function') this.db.renderNetwork(container);
        else container.innerHTML = '<p>Network feature not implemented.</p>';
    }
}

class DBPage {
    constructor(shadowRoot, db) {
        this.shadowRoot = shadowRoot;
        this.db = db;
    }

    render() {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';
        const container = document.createElement('div');
        container.classList.add('database-page');
        editorContainer.appendChild(container);
        if (typeof this.db.renderDatabase === 'function') this.db.renderDatabase(container);
        else container.innerHTML = '<p>Database feature not implemented.</p>';
    }
}

class Editor {
    constructor(shadowRoot, db, getAwareness, app) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.app = app;
        this.getAwareness = getAwareness;
        this.currentPageId = null;
        this.ydoc = null;
        this.provider = null;
        this.ytext = null;
        this.editorContainer = this.shadowRoot.querySelector('#editor-container');
        this.renderStyles();
    }

    bindYjs() {
        if (!this.editor || !this.ytext) return;

        const observer = new MutationObserver(() => {
            const content = this.editor.innerHTML;
            this.ytext.doc.transact(() => {
                this.ytext.delete(0, this.ytext.length);
                this.ytext.insert(0, content);
            });
        });

        observer.observe(this.editor, {
            characterData: true,
            childList: true,
            subtree: true,
            attributes: true
        });

        this.ytext.observe(event => {
            const currentContent = this.editor.innerHTML;
            const yContent = this.ytext.toString();
            if (currentContent !== yContent) {
                this.editor.innerHTML = yContent;
            }
        });
    }

    saveContent() {
        if (!this.currentPageId || !this.ytext) return;
        const content = this.editor.innerHTML;
        this.db.doc.transact(() => {
            const page = this.db.page(this.currentPageId);
            if (page) {
                const ytext = this.db.pageContent(this.currentPageId);
                ytext.delete(0, ytext.length);
                ytext.insert(0, content);
            }
        });
    }

    viewPage(pageId) {
        if (this.currentPageId === pageId) return;
        this.editorStop();

        this.currentPageId = pageId;
        const page = this.db.page(pageId);
        if (!page) return;

        const controls = this.controlSection(pageId);
        this.editorContainer.appendChild(controls);

        this.ydoc = this.db.doc;
        this.ytext = this.db.pageContent(pageId);

        const content = this.ytext ? this.ytext.toString() : '';
        this.editorStart(content);

        const awareness = this.getAwareness();
        awareness.setLocalStateField('cursor', null);

        this.editor.addEventListener('select', () => {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                awareness.setLocalStateField('cursor', {
                    anchor: range.startOffset,
                    head: range.endOffset
                });
            }
        });
    }

    editorStop() {
        if (this.provider) {
            this.provider.destroy();
            this.provider = null;
        }
        this.ydoc = null;
        this.ytext = null;
        this.editorContainer.innerHTML = '';
    }

    editorStart(content) {
        const container = document.createElement('div');
        container.classList.add('editor-wrapper');
        container.appendChild(this.renderToolbar());

        const editor = this.editorSection();
        editor.innerHTML = content;
        container.appendChild(editor);

        this.editorContainer.appendChild(container);
        this.editor = editor;
        this.bindYjs();
    }

    renderStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .editor-controls {
                padding: 12px;
                border-bottom: 1px solid #ddd;
                background: #f8f9fa;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .title-input {
                flex: 1;
                padding: 8px;
                font-size: 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                margin-right: 12px;
            }
            .privacy-toggle {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .template-buttons {
                display: flex;
                gap: 8px;
            }
            .template-button {
                padding: 8px 12px;
                background: #fff;
                border: 1px solid #ddd;
                border-radius: 4px;
                cursor: pointer;
                font-size: 16px;
                transition: background-color 0.2s;
            }
            .template-button:hover {
                background: #f0f0f0;
            }
            .toggle-switch {
                position: relative;
                display: inline-block;
                width: 48px;
                height: 24px;
            }
            .toggle-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: 0.4s;
                border-radius: 24px;
            }
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 3px;
                bottom: 3px;
                background-color: white;
                transition: 0.4s;
                border-radius: 50%;
            }
            input:checked + .toggle-slider {
                background-color: #2196F3;
            }
            input:checked + .toggle-slider:before {
                transform: translateX(24px);
            }
            .toolbar {
                display: flex;
                gap: 8px;
                padding: 8px;
                background: #f1f1f1;
                border-bottom: 1px solid #ccc;
            }
            .toolbar button {
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                font-size: 16px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            .toolbar button:hover {
                background-color: #e0e0e0;
            }
            .editor {
                flex: 1;
                padding: 16px;
                outline: none;
                overflow-y: auto;
                min-height: 300px;
            }
        `;
        this.shadowRoot.appendChild(styles);
    }

    controlSection(pageId) {
        const page = this.db.page(pageId);
        const controls = document.createElement('div');
        controls.classList.add('editor-controls');

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.classList.add('title-input');
        titleInput.value = page.title;
        titleInput.placeholder = 'Page Title';
        titleInput.addEventListener('change', () => this.db.pageTitle(pageId, titleInput.value));

        const privacyToggle = document.createElement('div');
        privacyToggle.classList.add('privacy-toggle');

        const toggleLabel = document.createElement('span');
        toggleLabel.textContent = 'Public';

        const toggleSwitch = document.createElement('label');
        toggleSwitch.classList.add('toggle-switch');

        const toggleInput = document.createElement('input');
        toggleInput.type = 'checkbox';
        toggleInput.checked = page.isPublic;
        toggleInput.addEventListener('change', () => {
            this.db.pagePrivacy(pageId, toggleInput.checked);
            toggleInput.checked ? this.app.net.shareDocument(pageId) : this.app.net.unshareDocument(pageId);
        });

        const toggleSlider = document.createElement('span');
        toggleSlider.classList.add('toggle-slider');

        toggleSwitch.appendChild(toggleInput);
        toggleSwitch.appendChild(toggleSlider);
        privacyToggle.appendChild(toggleLabel);
        privacyToggle.appendChild(toggleSwitch);

        const templateButtons = document.createElement('div');
        templateButtons.classList.add('template-buttons');

        const templates = [
            { icon: '📝', title: 'Note Template', template: 'note' },
            { icon: '📅', title: 'Meeting Template', template: 'meeting' },
            { icon: '✅', title: 'Todo Template', template: 'todo' },
            { icon: '📊', title: 'Report Template', template: 'report' }
        ];

        templates.forEach(({ icon, title, template }) => {
            const button = document.createElement('button');
            button.classList.add('template-button');
            button.textContent = icon;
            button.title = title;
            button.addEventListener('click', () => this.insertTemplate(template));
            templateButtons.appendChild(button);
        });

        controls.appendChild(titleInput);
        controls.appendChild(privacyToggle);
        controls.appendChild(templateButtons);

        return controls;
    }

    insertTemplate(template) {
        let html = '';
        switch (template) {
            case 'note':
                html = '<h2>Note</h2><p></p>';
                break;
            case 'meeting':
                html = '<h2>Meeting Notes</h2><ul><li>Agenda Item 1</li><li>Agenda Item 2</li></ul>';
                break;
            case 'todo':
                html = '<h2>Todo List</h2><ul><li><input type="checkbox"> Task 1</li><li><input type="checkbox"> Task 2</li></ul>';
                break;
            case 'report':
                html = '<h2>Report</h2><h3>Introduction</h3><p></p><h3>Conclusion</h3><p></p>';
                break;
            default:
                break;
        }
        document.execCommand('insertHTML', false, html);
    }

    renderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.classList.add('toolbar');

        const buttons = [
            { command: 'bold', icon: '𝐁', title: 'Bold' },
            { command: 'italic', icon: '𝐼', title: 'Italic' },
            { command: 'underline', icon: 'U', title: 'Underline' },
            { command: 'strikeThrough', icon: 'S', title: 'Strikethrough' },
            { command: 'insertOrderedList', icon: '1.', title: 'Ordered List' },
            { command: 'insertUnorderedList', icon: '•', title: 'Unordered List' },
            { command: 'insertLink', icon: '🔗', title: 'Insert Link' },
            { command: 'insertImage', icon: '🖼️', title: 'Insert Image' },
            { command: 'undo', icon: '↩️', title: 'Undo' },
            { command: 'redo', icon: '↪️', title: 'Redo' },
        ];

        buttons.forEach(({ command, icon, title }) => {
            const button = document.createElement('button');
            button.innerHTML = icon;
            button.title = title;
            button.addEventListener('click', e => {
                e.preventDefault();
                if (command === 'insertLink') {
                    const url = prompt('Enter the URL');
                    if (url)
                        document.execCommand(command, false, url);

                } else if (command === 'insertImage') {
                    const url = prompt('Enter the image URL');
                    if (url)
                        document.execCommand(command, false, url);

                } else {
                    document.execCommand(command, false, null);
                }
            });
            toolbar.appendChild(button);
        });

        return toolbar;
    }

    editorSection() {
        const editor = document.createElement('div');
        editor.classList.add('editor');
        editor.contentEditable = true;
        editor.spellcheck = true;
        editor.addEventListener('input', () => this.saveContent());
        editor.addEventListener('keydown', e => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        document.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        document.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        document.execCommand('underline');
                        break;
                    default:
                        break;
                }
            }
        });
        return editor;
    }

}

class App extends HTMLElement {
    constructor() {
        super();
        this.channel = 'todo';
        this.db = new DB(this.channel);
        this.net = new Network(this.channel, this.db);
        this.sharedDocuments = new Set();
        const root = this.attachShadow({ mode: 'open' });
        this.profilePage = new MePage(root, this.user.bind(this), this.awareness.bind(this));
        this.friendsListPage = new FriendsPage(root, this.awareness.bind(this));
        this.networkPage = new NetPage(root, this.db);
        this.databasePage = new DBPage(root, this.db);
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }

    connectedCallback() {

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    font-family: Arial, sans-serif;
                }
                #container {
                    display: flex;
                    height: 100vh;
                    background-color: #f0f0f0;
                }
                #sidebar {
                    width: 250px;
                    overflow-y: auto;
                    padding: 10px;
                    background-color: #fff;
                    border-right: 1px solid #ddd;
                }
                #main-view {
                    flex: 1;
                    padding: 10px;
                    display: flex;
                }
                #editor-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                    background-color: #fff;
                    border-radius: 4px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                ul { list-style: none; padding: 0; margin: 0; }
                li { padding: 8px; cursor: pointer; border-bottom: 1px solid #eee; }
                li:hover { background: #f5f5f5; }
                .menubar {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .menubar-button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    cursor: pointer;
                    font-size: 14px;
                    border-radius: 4px;
                    transition: background-color 0.3s;
                }
                .menubar-button:hover { background-color: #0056b3; }
                .add-page-button { background-color: #28a745; }
                .add-page-button:hover { background-color: #1e7e34; }
                .context-menu {
                    position: absolute;
                    border: 1px solid #ccc;
                    box-shadow: 2px 2px 6px rgba(30,30,30,0.2);
                    display: none;
                    z-index: 1000;
                    background-color: white;
                    border-radius: 4px;
                }
                .context-menu ul { list-style: none; margin: 0; padding: 0; }
                .context-menu li { padding: 8px 12px; cursor: pointer; }
                .context-menu li:hover { background: #007BFF; color: white; }
                .profile-page label,
                .friends-list-page label,
                .network-page label,
                .database-page label {
                    display: inline-block;
                    width: 80px;
                    margin-right: 10px;
                }
                .profile-page input[type="text"],
                .profile-page input[type="color"],
                .friends-list-page input,
                .network-page input,
                .database-page input {
                    padding: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                .profile-page h3,
                .friends-list-page h3,
                .network-page h3,
                .database-page h3 {
                    margin-top: 0;
                }
                .toggle-switch {
                    position: relative;
                    display: inline-block;
                    width: 60px;
                    height: 34px;
                    margin-left: 10px;
                }
                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    transition: 0.4s;
                    border-radius: 34px;
                }
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 26px;
                    width: 26px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: 0.4s;
                    border-radius: 50%;
                }
                input:checked + .slider { background-color: #2196F3; }
                input:checked + .slider:before { transform: translateX(26px); }
                .profile-field, .friends-list-field { margin-bottom: 10px; }
                
                
            </style>
            <div id="container">
                <div id="sidebar"></div>
                <div id="main-view">
                    <div id="editor-container"></div>
                </div>
            </div>
            <div id="context-menu" class="context-menu">
                <ul>
                    <li data-action="rename-page">Rename</li>
                    <li data-action="delete-page">Delete</li>
                </ul>
            </div>
        `;
        this.contextMenu = new PageContextMenu(this.shadowRoot, this.db, this);
        this.editor = new Editor(this.shadowRoot, this.db, this.awareness.bind(this), this);
        this.sidebar = new Sidebar(this.shadowRoot, this.db, this);
    }
}

customElements.define('app-root', App);
export default App;
