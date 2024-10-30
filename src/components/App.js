import $ from 'jquery';

import DB from '/src/db.js';
import Network from '/src/net.js';
import MePage from './Me.js';

import '/style.css';

function debounce(callback, delay) {
    let timeout = null;
    return function(...args) {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => callback.apply(this, args), delay);
    };
}

class PageContextMenu {
    constructor(shadowRoot, db, app) {
        this.db = db;
        this.app = app;
        this.shadowRoot = shadowRoot;
        this.selectedPageId = null;
        this.$ele = $(this.shadowRoot).find('#context-menu');
        this.renderContextMenu();
        this.bindEvents();
    }

    renderContextMenu() {
        this.$ele.html(`
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">Delete</li>
            </ul>
        `);
    }

    bindEvents() {
        $(this.shadowRoot).click(e => {
            if (!this.$ele.has(e.target).length) this.hide();
        });

        this.$ele.on('click', 'li', e => {
            const action = $(e.target).data('action');
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
            if (this.db.page(this.selectedPageId)?.isPublic) this.app.net.removeSharedDocument(this.selectedPageId);
        }
    }

    showContextMenu(event, pageId) {
        event.preventDefault();
        this.selectedPageId = pageId;
        this.$ele.css({
            top: event.clientY,
            left: event.clientX,
            display: 'block'
        });
    }

    hide() {
        this.$ele.hide();
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
        this.$element = $(this.shadowRoot).find('#sidebar');
        this.renderSidebar();
    }

    renderSidebar() {
        this.$element.append(this.menu());
        this.renderPageList();
    }

    renderPageList() {
        if (this.observer) {
            this.db.pages.unobserve(this.observer);
            this.observer = undefined;
        }
        this.$element.append(this.$pageList = $('<ul>', { id: 'page-list' }));
        this.observer = this.db.pages.observe(() => this.updatePageList());
        this.updatePageList();
    }

    menu() {
        const $addPageButton = $('<button>', {
            id: 'add-page',
            class: 'menubar-button add-page-button',
            text: '+',
            title: 'Add New Page'
        }).on('click', () => {
            const pageId = `page-${Date.now()}`;
            this.db.pageNew(pageId, 'Empty', false);
            this.app.editor.viewPage(pageId);
        });

        const $menuBar = $('<div>', {
            id: 'menubar',
            class: 'menubar'
        });
        $menuBar.append($addPageButton);

        [
            {id: 'profile', title: 'Me', class: MePage},
            {id: 'friends', title: 'Friends', class: FriendsPage},
            {id: 'network', title: 'Net', class: NetPage},
            {id: 'database', title: 'DB', class: DBPage},
        ].forEach(page => {
            let pageInstance;
            switch (page.id) {
                case 'profile': pageInstance = this.app.profilePage; break;
                case 'friends': pageInstance = this.app.friendsListPage; break;
                case 'network': pageInstance = this.app.networkPage; break;
                case 'database': pageInstance = this.app.databasePage; break;
                default: console.warn(`No page class defined for ${page.id}`);
            }

            $menuBar.append($('<button>', {
                    class: 'menubar-button',
                    text: page.title,
                    title: page.title
                }).click(() => pageInstance.render()));

        });

        return $menuBar;
    }

    updatePageList() {
        this.$pageList.empty();
        this.db.pages.forEach((value, key) => {
            const $li = $('<li>', {
                text: value.title,
                'data-page-id': key,
                title: `Open ${value.title}`,
                class: 'user-page-item'
            });

            if (value.isPublic)
                $li.append($('<span>', {text: ' 🌐',  title: 'Public Document'}));

            $li.on({
                click: () => this.app.editor.viewPage(key),
                contextmenu: e => {
                    e.preventDefault();
                    this.app.contextMenu.showContextMenu(e, key);
                }
                // dblclick: () => {
                //     const page = this.db.page(key);
                //     if (page) {
                //         const newPrivacy = !page.isPublic;
                //         this.db.pagePrivacy(key, newPrivacy);
                //         if (newPrivacy) this.app.net.shareDocument(key);
                //         else this.app.net.unshareDocument(key);
                //         this.updatePageList();
                //     }
                // }
            });

            this.$pageList.append($li);
        });
    }
}

class FriendsPage {
    constructor(shadowRoot, getAwareness) {
        this.shadowRoot = shadowRoot;
        this.getAwareness = getAwareness;
        this.$container = $('<div>').addClass('friends-list-page');
    }

    render() {
        $(this.shadowRoot).find('#editor-container').empty().append(this.$container);

        this.$container.html(`
            <h3>Friends</h3>
            <ul></ul>
        `);

        const updateFriends = () => {
            const users = [];
            this.getAwareness().getStates().forEach(state => {
                if (state.user) users.push(state.user);
            });

            const $ul = this.$container.find('ul').empty();
            users.forEach(user => {
                $('<li>')
                    .text(user.name)
                    .css('color', user.color)
                    .appendTo($ul);
            });
        };

        updateFriends();
        this.getAwareness().on('change', updateFriends);
    }
}

class NetPage {
    constructor(shadowRoot, net) {
        this.shadowRoot = shadowRoot;
        this.net = net;
        this.$container = $('<div>').addClass('network-page');
    }

    render() {
        $(this.shadowRoot).find('#editor-container').empty().append(this.$container);
        this.net.renderNetwork(this.$container);
    }
}

class DBPage {
    constructor(shadowRoot, db) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.$container = $('<div>').addClass('database-page');
    }

    render() {
        $(this.shadowRoot).find('#editor-container').empty().append(this.$container);
        this.db.renderDatabase(this.$container[0]);
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
        this.updatePeriodMS = 100;
        this.$editorContainer = $(this.shadowRoot).find('#editor-container');
        this.renderStyles();
    }

    bindYjs() {
        if (!this.$editor || !this.ytext) return;

        new MutationObserver(() => {
            const content = this.$editor.html();
            this.ytext.doc.transact(() => {
                this.ytext.delete(0, this.ytext.length);
                this.ytext.insert(0, content);
            });
        }).observe(this.$editor[0], {
            characterData: true,
            childList: true,
            subtree: true,
            attributes: true
        });

        this.ytext.observe(event => {
            const currentContent = this.$editor.html();
            const yContent = this.ytext.toString();
            if (currentContent !== yContent)
                this.$editor.html(yContent);
        });
    }

    saveContent() {
        if (!this.currentPageId || !this.ytext) return;
        const content = this.$editor.html();
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

        const $controls = this.controlSection(pageId);
        this.$editorContainer.append($controls);

        this.ydoc = this.db.doc;
        this.ytext = this.db.pageContent(pageId);

        this.editorStart(this.ytext ? this.ytext.toString() : '');

        const awareness = this.getAwareness();
        awareness.setLocalStateField('cursor', null);

        this.$editor.on('select', () => {
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
        this.$editorContainer.empty();
    }

    editorStart(content) {
        const $container = $('<div>', { class: 'editor-wrapper' });
        $container.append(this.renderToolbar());

        this.$editor = $('<div>', {
            class: 'editor',
            contenteditable: true,
            spellcheck: true,
            html: content
        });

        this.$editor.on('input', debounce(() => this.saveContent(), this.updatePeriodMS));
        this.$editor.on('keydown', e => {
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
                }
            }
        });

        $container.append(this.$editor);
        this.$editorContainer.append($container);
        this.bindYjs();
    }

    renderToolbar() {
        const $toolbar = $('<div>', { class: 'toolbar' });

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
            $('<button>', {
                html: icon,
                title: title
            }).on('click', e => {
                e.preventDefault();
                if (command === 'insertLink') {
                    const url = prompt('Enter the URL');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'insertImage') {
                    const url = prompt('Enter the image URL');
                    if (url) document.execCommand(command, false, url);
                } else {
                    document.execCommand(command, false, null);
                }
            }).appendTo($toolbar);
        });

        return $toolbar;
    }

    controlSection(pageId) {
        const page = this.db.page(pageId);

        const $titleInput = $('<input>', {
            type: 'text',
            class: 'title-input',
            value: page.title,
            placeholder: 'Page Title'
        }).on('change', () => this.db.pageTitle(pageId, $titleInput.val()));

        const $privacyToggle = $('<div>', { class: 'privacy-toggle' }).append(
                $('<span>').text('Public'),
                $('<label>', { class: 'toggle-switch' }).append(
                    $('<input>', {
                        type: 'checkbox',
                        checked: page.isPublic
                    }).on('change', e => {
                        this.db.pagePrivacy(pageId, e.target.checked);
                        e.target.checked ?
                            this.app.net.shareDocument(pageId) :
                            this.app.net.unshareDocument(pageId);
                    }),
                    $('<span>', { class: 'toggle-slider' })
                )
            );

        const $templateButtons = $('<div>', { class: 'template-buttons' });
        [
            { icon: '📝', title: 'Note Template', template: 'note' },
            { icon: '📅', title: 'Meeting Template', template: 'meeting' },
            { icon: '✅', title: 'Todo Template', template: 'todo' },
            { icon: '📊', title: 'Report Template', template: 'report' }
        ].forEach(({ icon, title, template }) => {
            $('<button>', {
                class: 'template-button',
                text: icon,
                title: title
            }).on('click', () => this.insertTemplate(template))
                .appendTo($templateButtons);
        });

        return $('<div>', { class: 'editor-controls' }).append($titleInput, $privacyToggle, $templateButtons);
    }

    insertTemplate(template) {
        let html = '<TEMPLATE>';
        document.execCommand('insertHTML', false, html);
    }

    renderStyles() {
        $(this.shadowRoot).append($('<style>').text(`
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
        `));
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
        let thisAwareness = this.awareness.bind(this);
        this.profilePage = new MePage(root, this.user.bind(this), thisAwareness);
        this.friendsListPage = new FriendsPage(root, thisAwareness);
        this.networkPage = new NetPage(root, this.net);
        this.databasePage = new DBPage(root, this.db);
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }

    connectedCallback() {
        const style = this.style();
        this.shadowRoot.innerHTML = `
            <style>
                ${style}
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

        $(document).on('click', (e) => {
            if (!$(e.target).closest('#context-menu').length) {
                this.contextMenu.hide();
            }
        });
    }

    style() {
                return `
                :root {
                    --primary-color: #007BFF;
                    --background-color: #f0f0f0;
                }
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    font-family: Arial, sans-serif;
                }
                #container {
                    display: flex;
                    height: 100vh;
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
                .context-menu li:hover { background: var(--primary-color); color: white; }
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
        `;
    }
}

customElements.define('app-root', App);
export default App;
