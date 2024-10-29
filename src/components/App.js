import DB from '/src/db.js';
import Network from '/src/net.js';
import '/style.css';

import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import {QuillBinding} from 'y-quill';
import 'quill/dist/quill.snow.css';

Quill.register('modules/cursors', QuillCursors);

class ContextMenu {
    constructor(shadowRoot, db, app) {
        this.db = db;
        this.app = app;

        this.shadowRoot = shadowRoot;
        this.ele = this.shadowRoot.querySelector('#context-menu');

        this.selectedPageId = null;

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
        // Hide context menu when clicking outside
        this.shadowRoot.addEventListener('click', e => {
            if (!this.ele.contains(e.target))
                this.hide();
        });

        // Handle context menu actions using event delegation
        this.ele.addEventListener('click', e => {
            const action = e.target.getAttribute('data-action');
            if (!action) return;

            switch (action) {
                case 'rename-page':
                    this.renamePage();
                    break;
                case 'delete-page':
                    this.deletePage();
                    break;
                default:
                    break;
            }
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
            // If the deleted page was public, remove it from the network
            const page = this.db.page(this.selectedPageId);
            if (page && page.isPublic) this.app.net.removeSharedDocument(this.selectedPageId);
        }
    }

    showContextMenu(event, pageId) {
        event.preventDefault();
        this.selectedPageId = pageId;
        const { clientX: x, clientY: y } = event;
        this.ele.style.top = `${y}px`;
        this.ele.style.left = `${x}px`;
        this.ele.style.display = 'block';
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

        // Observe changes in the pages and re-render the list accordingly
        this.db.pages.observe(() => this.updatePageList());
        this.updatePageList();
    }

    menu() {
        const m = document.createElement('div');
        m.id = 'menubar';
        m.classList.add('menubar');

        {
            const b = document.createElement('button');
            b.id = 'add-page';
            b.classList.add('menubar-button', 'add-page-button');
            b.textContent = '+';
            b.title = 'Add New Page';
            b.addEventListener('click', () => {
                const pageId = `page-${Date.now()}`;
                this.db.pageNew(pageId, 'Empty', false); // Default to Private
                this.app.editor.viewPage(pageId);
            });
            m.appendChild(b);
        }


        {
            const specialPages = [
                {id: 'profile', title: 'Me', class: MePage},
                {id: 'friends', title: 'Friends', class: FriendsPage},
                {id: 'network', title: 'Net', class: NetPage},
                {id: 'database', title: 'DB', class: DBPage},
            ];

            specialPages.forEach(page => {
                const button = document.createElement('button');
                button.classList.add('menubar-button');
                button.textContent = page.title;
                button.title = `Access ${page.title}`;
                let y;
                switch (page.id) {
                    case 'profile':
                        y = this.app.profilePage;
                        break;
                    case 'friends':
                        y = this.app.friendsListPage;
                        break;
                    case 'network':
                        y = this.app.networkPage;
                        break;
                    case 'database':
                        y = this.app.databasePage;
                        break;
                    default:
                        console.warn(`No page class defined for ${(page.id)}`);
                }
                button.addEventListener('click', () => y.render());
                m.appendChild(button);
            });
        }
        return m;
    }

    updatePageList() {
        this.pageList.innerHTML = '';

        // Iterate through the pages and create list items
        this.db.pages.forEach((value, key) => {
            const li = document.createElement('li');
            li.textContent = value.title;
            li.dataset.pageId = key;
            li.title = `Open ${value.title}`;
            li.classList.add('user-page-item');

            // Add a visual indicator for public pages
            if (value.isPublic) {
                const publicIndicator = document.createElement('span');
                publicIndicator.textContent = ' 🌐';
                publicIndicator.title = 'Public Document';
                li.appendChild(publicIndicator);
            }

            // Click to view the page
            li.addEventListener('click', () => this.app.editor.viewPage(key));

            // Right-click to open the context menu
            li.addEventListener('contextmenu', e => {
                e.preventDefault();
                this.app.contextMenu.showContextMenu(e, key);
            });

            // Double-click to toggle privacy
            li.addEventListener('dblclick', () => {
                const page = this.db.page(key);
                if (page) {
                    const newPrivacy = !page.isPublic;
                    this.db.pagePrivacy(key, newPrivacy);
                    if (newPrivacy) {
                        this.app.net.shareDocument(key);
                    } else {
                        this.app.net.unshareDocument(key);
                    }
                    this.updatePageList(); // Update the UI indicator
                }
            });

            this.pageList.appendChild(li);
        });
    }

    bindEvents() {
        // Placeholder for future event bindings
    }
}

class MePage {
    constructor(shadowRoot, getUser, getAwareness) {
        this.shadowRoot = shadowRoot;
        this.getUser = getUser;
        this.getAwareness = getAwareness;
    }

    render() {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';

        const container = document.createElement('div');
        container.classList.add('profile-page');
        editorContainer.appendChild(container);

        const user = this.getUser();

        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name: ';
        nameLabel.setAttribute('for', 'user-name');

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'user-name';
        nameInput.placeholder = 'Name';
        nameInput.value = user.name;
        nameInput.addEventListener('input', e => {
            const updatedUser = { ...user, name: e.target.value };
            this.getAwareness().setLocalStateField('user', updatedUser);
        });

        const colorLabel = document.createElement('label');
        colorLabel.textContent = 'Color: ';
        colorLabel.setAttribute('for', 'user-color');

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.id = 'user-color';
        colorInput.value = user.color;
        colorInput.addEventListener('input', e => {
            const updatedUser = { ...user, color: e.target.value };
            this.getAwareness().setLocalStateField('user', updatedUser);
        });

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('profile-field');
        nameDiv.appendChild(nameLabel);
        nameDiv.appendChild(nameInput);

        const colorDiv = document.createElement('div');
        colorDiv.classList.add('profile-field');
        colorDiv.appendChild(colorLabel);
        colorDiv.appendChild(colorInput);

        container.appendChild(nameDiv);
        container.appendChild(colorDiv);
    }
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

            // Clear existing list
            ul.innerHTML = '';

            users.forEach(user => {
                const li = document.createElement('li');
                li.textContent = user.name;
                li.style.color = user.color;
                ul.appendChild(li);
            });
        };

        // Initial render
        updateFriends();

        // Update the friends list when awareness changes
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

        if (typeof this.db.renderNetwork === 'function') {
            this.db.renderNetwork(container);
        } else {
            container.innerHTML = '<p>Network feature not implemented.</p>';
        }
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

        if (typeof this.db.renderDatabase === 'function')
            this.db.renderDatabase(container);
        else
            container.innerHTML = '<p>Database feature not implemented.</p>';
    }
}

class Editor {
    constructor(shadowRoot, db, getAwareness, app) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.getAwareness = getAwareness;
        this.app = app;
        this.binding = null;
        this.quill = null;
        this.currentPageId = null;

        this.init();
    }

    init() {
        this.editorContainer = this.shadowRoot.querySelector('#editor-container');
        // Add new styles for the control section
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
                transition: .4s;
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
                transition: .4s;
                border-radius: 50%;
            }
            input:checked + .toggle-slider {
                background-color: #2196F3;
            }
            input:checked + .toggle-slider:before {
                transform: translateX(24px);
            }
        `;
        this.shadowRoot.appendChild(styles);
    }

    createControlSection(pageId) {
        const page = this.db.page(pageId);
        const controls = document.createElement('div');
        controls.classList.add('editor-controls');

        // Title input
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.classList.add('title-input');
        titleInput.value = page.title;
        titleInput.placeholder = 'Page Title';
        titleInput.addEventListener('change', () => {
            this.db.pageTitle(pageId, titleInput.value);
        });

        // Privacy toggle
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
            if (toggleInput.checked) {
                this.app.net.shareDocument(pageId);
            } else {
                this.app.net.unshareDocument(pageId);
            }
        });

        const toggleSlider = document.createElement('span');
        toggleSlider.classList.add('toggle-slider');

        toggleSwitch.appendChild(toggleInput);
        toggleSwitch.appendChild(toggleSlider);
        privacyToggle.appendChild(toggleLabel);
        privacyToggle.appendChild(toggleSwitch);

        // Template buttons
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
            button.addEventListener('click', () => {
                // Template insertion logic would go here
                console.log(`Insert ${template} template`);
            });
            templateButtons.appendChild(button);
        });

        controls.appendChild(titleInput);
        controls.appendChild(privacyToggle);
        controls.appendChild(templateButtons);

        return controls;
    }

    quillStop() {
        if (this.binding) {
            this.binding.destroy();
            this.binding = null;
        }
        if (this.quill) {
            this.quill.off('text-change', this.handleTextChange);
            this.quill = null;
        }
        this.editorContainer.innerHTML = '';
    }

    quillStart() {
        const c = this.editorContainer;
        c.innerHTML = `<div id="editor"></div>`;

        this.quill = new Quill(c.querySelector('#editor'), {
            theme: 'snow',
            modules: {
                cursors: true,
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    ['link', 'image', 'video', 'formula'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'font': [] }],
                    [{ 'align': [] }],
                    ['clean']
                ],
                history: {
                    userOnly: true
                }
            },
            placeholder: 'Start writing here...'
        });

        this.quill.on('selection-change', (range, oldRange, source) => {
            this.currentSelection = range;
        });

        return this.quill;
    }

    handleTextChange = (delta, oldDelta, source) => {
        if (source !== 'user') return;
    };

    viewPage(pageId) {
        this.currentPageId = pageId;
        const page = this.db.pageContent(pageId);
        if (!page) {
            alert('Page not found.');
            return;
        }

        this.quillStop();


        this.binding = new QuillBinding(
            this.db.pageContent(pageId),
            this.quillStart(),
            this.getAwareness()
        );

        this.quill.on('text-change', this.handleTextChange);

        this.editorContainer.insertBefore(this.createControlSection(pageId), this.editorContainer.children[0]); //prepend

    }
}

class App extends HTMLElement {
    constructor() {
        super();

        this.channel = 'todo';

        this.db = new DB(this.channel);
        this.net = new Network(this.channel, this.db);

        // Initialize shared documents tracking
        // TODO move this to db
        this.sharedDocuments = new Set();


        const root = this.attachShadow({mode: 'open'});
        this.profilePage = new MePage(root, this.user.bind(this), this.awareness.bind(this));
        this.friendsListPage = new FriendsPage(root, this.awareness.bind(this));
        this.networkPage = new NetPage(root, this.db);
        this.databasePage = new DBPage(root, this.db);
    }

    user() {
        return this.net.user();
    }

    awareness() {
        return this.net.awareness();
    }

    async connectedCallback() {
        const cssQuill = await this.loadQuillStyles();

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    font-family: Arial, sans-serif;
                }
                     
                ${cssQuill}              

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
                
                /* Quill Editor Styling */
                .ql-container.ql-snow {
                    flex: 1;
                    overflow-y: auto;
                    border: none;
                }
                .ql-snow .ql-picker-options {
                    background-color: #333;
                }
                .ql-toolbar.ql-snow { 
                    border: 1px solid #ccc;
                    box-sizing: border-box;
                    padding: 8px;
                    position: sticky;
                    top: 0;            
                    z-index: 1;
                    background-color: #f9f9f9;
                }
                
                #editor {
                    height: 100%;
                    overflow-y: auto;
                    border: 1px solid #ccc;
                    border-top: none;
                    font-size: 16px;
                }
                
                /* List Styling */
                ul { 
                    list-style: none; 
                    padding: 0; 
                    margin: 0; 
                }
                li { 
                    padding: 8px; 
                    cursor: pointer; 
                    border-bottom: 1px solid #eee;
                }
                li:hover { 
                    background: #f5f5f5; 
                }
                
                /* Menubar Styling */
                .menubar {
                    display: flow;
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

                .menubar-button:hover {
                    background-color: #0056b3;
                }

                .add-page-button {
                    background-color: #28a745;
                }

                .add-page-button:hover {
                    background-color: #1e7e34;
                }

                /* Context Menu Styling */
                .context-menu { 
                    position: absolute; 
                    border: 1px solid #ccc; 
                    box-shadow: 2px 2px 6px rgba(30,30,30,0.2); 
                    display: none; 
                    z-index: 1000; 
                    background-color: white;
                    border-radius: 4px;
                }
                .context-menu ul { 
                    list-style: none; 
                    margin: 0; 
                    padding: 0; 
                }
                .context-menu li { 
                    padding: 8px 12px; 
                    cursor: pointer; 
                }
                .context-menu li:hover { 
                    background: #007BFF; 
                    color: white; 
                }

                /* Special Page Content Styling */
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

                /* Toggle Switch Styling */
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
                    transition: .4s;
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
                    transition: .4s;
                    border-radius: 50%;
                }

                input:checked + .slider {
                    background-color: #2196F3;
                }

                input:checked + .slider:before {
                    transform: translateX(26px);
                }

                /* Profile and Friends List Field Styling */
                .profile-field,
                .friends-list-field {
                    margin-bottom: 10px;
                }
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

        this.initComponents();
        this.initializeApp();
    }

    async loadQuillStyles() {
        try {
            const [quillSnow, quillCursors] = await Promise.all([
                fetch('https://cdn.quilljs.com/1.3.7/quill.snow.css').then(res => res.text()),
                fetch('https://cdn.jsdelivr.net/npm/quill-cursors@latest/dist/quill-cursors.css').then(res => res.text())
            ]);
            return quillSnow + '\n' + quillCursors;
        } catch (error) {
            console.error('Error loading Quill styles:', error);
            return '';
        }
    }

    initComponents() {
        // Initialize ContextMenu first as it might be used by Sidebar
        this.contextMenu = new ContextMenu(this.shadowRoot, this.db, this);

        // Initialize Editor
        this.editor = new Editor(this.shadowRoot, this.db, this.awareness.bind(this), this);

        // Initialize Sidebar
        this.sidebar = new Sidebar(this.shadowRoot, this.db, this);
    }

    initializeApp() {
        // if (this.db.pages.size === 0) {
        //     this.db.pageNew(`page-${Date.now()}`, 'Empty', false); // Default to Private
        // }
        // const firstPageId = this.db.pages.keys().next().value;
        // this.editor.viewPage(firstPageId);
    }

    shareDocument(pageId) {
        if (!this.sharedDocuments.has(pageId)) {
            this.net.shareDocument(pageId);
            this.sharedDocuments.add(pageId);
        }
    }

    unshareDocument(pageId) {
        if (this.sharedDocuments.has(pageId)) {
            this.net.unshareDocument(pageId);
            this.sharedDocuments.delete(pageId);
        }
    }
}

// Define the custom element
customElements.define('app-root', App);
export default App;
