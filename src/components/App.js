import DB from '/src/db.js';
import Network from '/src/net.js';
import '/style.css';

import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import { QuillBinding } from 'y-quill';
import 'quill/dist/quill.snow.css';

// Register Quill Cursors module
Quill.register('modules/cursors', QuillCursors);

/**
 * ContextMenu Class
 * Manages the context menu for page operations like rename and delete.
 */
class ContextMenu {
    constructor(shadowRoot, db, app) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.app = app;

        this.contextMenuElement = this.shadowRoot.querySelector('#context-menu');
        this.selectedPageId = null;

        this.init();
    }

    /**
     * Initialize the context menu by rendering and binding events.
     */
    init() {
        this.renderContextMenu();
        this.bindEvents();
    }

    /**
     * Render the context menu HTML structure.
     */
    renderContextMenu() {
        this.contextMenuElement.innerHTML = `
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">Delete</li>
            </ul>
        `;
    }

    /**
     * Bind necessary event listeners for the context menu.
     */
    bindEvents() {
        // Hide context menu when clicking outside
        this.shadowRoot.addEventListener('click', (event) => {
            if (!this.contextMenuElement.contains(event.target)) {
                this.hide();
            }
        });

        // Handle context menu actions using event delegation
        this.contextMenuElement.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-action');
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

    /**
     * Prompt the user to rename the selected page.
     */
    renamePage() {
        if (this.selectedPageId) {
            const newName = prompt('Enter new page name:');
            if (newName) {
                this.db.pageTitle(this.selectedPageId, newName);
            }
        }
    }

    /**
     * Confirm and delete the selected page.
     */
    deletePage() {
        if (this.selectedPageId && confirm('Are you sure you want to delete this page?')) {
            this.db.pages.delete(this.selectedPageId);
        }
    }

    /**
     * Display the context menu at the cursor position.
     * @param {MouseEvent} event - The contextmenu event.
     * @param {string} pageId - The ID of the selected page.
     */
    showContextMenu(event, pageId) {
        event.preventDefault();
        this.selectedPageId = pageId;
        const { clientX: x, clientY: y } = event;
        this.contextMenuElement.style.top = `${y}px`;
        this.contextMenuElement.style.left = `${x}px`;
        this.contextMenuElement.style.display = 'block';
    }

    /**
     * Hide the context menu.
     */
    hide() {
        this.contextMenuElement.style.display = 'none';
    }
}

/**
 * Sidebar Class
 * Manages the sidebar, including the list of pages and special pages.
 */
class Sidebar {
    constructor(shadowRoot, db, app) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.app = app;

        this.init();
    }

    /**
     * Initialize the sidebar by rendering its content and binding events.
     */
    init() {
        this.sidebarElement = this.shadowRoot.querySelector('#sidebar');
        this.renderSidebar();
        this.bindEvents();
    }

    /**
     * Render the sidebar content including special pages and the list of user pages.
     */
    renderSidebar() {
        const specialPages = [
            { id: 'profile', title: 'User Profile' },
            { id: 'friends', title: 'Friends List' },
            { id: 'network', title: 'Network' },
            { id: 'database', title: 'Database' },
        ];

        // Create and append the Add Page button
        const addButton = document.createElement('button');
        addButton.id = 'add-page';
        addButton.textContent = '+';
        addButton.title = 'Add New Page';
        addButton.addEventListener('click', () => {
            const pageId = `page-${Date.now()}`;
            this.db.pageNew(pageId, 'Empty');
        });
        this.sidebarElement.appendChild(addButton);

        // Create and append the user pages list
        this.pageList = document.createElement('ul');
        this.pageList.id = 'page-list';
        this.sidebarElement.appendChild(this.pageList);

        // Observe changes in the pages and re-render the list accordingly
        this.db.pages.observe(() => this.renderPageList());
        this.renderPageList();

        // Create and append the special pages list
        const specialList = document.createElement('ul');
        specialList.id = 'special-pages';
        this.sidebarElement.appendChild(specialList);

        specialPages.forEach(page => {
            const li = document.createElement('li');
            li.textContent = page.title;
            li.classList.add('special-page-item');
            li.title = `View ${page.title}`;
            li.addEventListener('click', () => this.app.editor.viewSpecial(page.id));
            specialList.appendChild(li);
        });
    }

    /**
     * Render the list of user-created pages.
     */
    renderPageList() {
        // Clear the existing list
        this.pageList.innerHTML = '';

        // Iterate through the pages and create list items
        this.db.pages.forEach((value, key) => {
            const li = document.createElement('li');
            li.textContent = value.title;
            li.dataset.pageId = key;
            li.title = `Open ${value.title}`;
            li.classList.add('user-page-item');

            // Click to view the page
            li.addEventListener('click', () => this.app.editor.viewPage(key));

            // Right-click to open the context menu
            li.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.app.contextMenu.showContextMenu(e, key);
            });

            this.pageList.appendChild(li);
        });
    }

    /**
     * Bind any additional events if necessary.
     */
    bindEvents() {
        // Placeholder for future event bindings
    }
}

/**
 * Editor Class
 * Handles the Quill editor initialization, binding, and operations.
 */
class Editor {
    constructor(shadowRoot, db, getAwareness, app) {
        this.shadowRoot = shadowRoot;
        this.db = db;
        this.getAwareness = getAwareness;
        this.app = app;
        this.currentBinding = null;
        this.quill = null;

        this.init();
    }

    /**
     * Initialize the editor container.
     */
    init() {
        this.editorContainer = this.shadowRoot.querySelector('#editor-container');
    }

    /**
     * Stop the current Quill editor instance and clean up bindings.
     */
    quillStop() {
        if (this.currentBinding) {
            this.currentBinding.destroy();
            this.currentBinding = null;
        }
        if (this.quill) {
            this.quill = null;
        }
        this.editorContainer.innerHTML = '';
    }

    /**
     * Start a new Quill editor instance.
     * @returns {Quill} The initialized Quill instance.
     */
    quillStart() {
        const container = this.editorContainer;
        container.innerHTML = `<div id="editor"></div>`;

        this.quill = new Quill(container.querySelector('#editor'), {
            theme: 'snow',
            modules: {
                cursors: true,
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
                    ['blockquote', 'code-block'],
                    ['link', 'image', 'video', 'formula'],

                    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
                    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
                    [{ 'direction': 'rtl' }],                         // text direction

                    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

                    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                    [{ 'font': [] }],
                    [{ 'align': [] }],

                    ['clean']                                         // remove formatting button
                ],
                history: {
                    userOnly: true
                }
            },
            placeholder: 'Start writing here...'
        });

        return this.quill;
    }

    /**
     * View a specific user-created page by binding its content to the editor.
     * @param {string} pageId - The ID of the page to view.
     */
    viewPage(pageId) {
        this.quillStop();
        this.currentBinding = new QuillBinding(
            this.db.pageContent(pageId),
            this.quillStart(),
            this.getAwareness()
        );
    }

    /**
     * View a special page (e.g., Profile, Friends).
     * @param {string} pageId - The ID of the special page to view.
     */
    viewSpecial(pageId) {
        this.quillStop();
        this.app.specialPages.render(pageId);
    }
}

/**
 * SpecialPages Class
 * Renders special pages such as Profile, Friends, Network, and Database.
 */
class SpecialPages {
    constructor(shadowRoot, getUser, getAwareness, db) {
        this.shadowRoot = shadowRoot;
        this.getUser = getUser;
        this.getAwareness = getAwareness;
        this.db = db;
    }

    /**
     * Render the specified special page.
     * @param {string} pageId - The ID of the special page to render.
     */
    render(pageId) {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';

        const container = document.createElement('div');
        container.classList.add('special-page');
        editorContainer.appendChild(container);

        switch (pageId) {
            case 'profile':
                this.renderProfile(this.getUser(), container);
                break;
            case 'friends':
                this.renderFriends(container);
                break;
            case 'network':
                this.renderNetwork(container);
                break;
            case 'database':
                this.renderDatabase(container);
                break;
            default:
                container.innerHTML = '<p>Page not found.</p>';
        }
    }

    /**
     * Render the User Profile page.
     * @param {Object} user - The current user object.
     * @param {HTMLElement} container - The container to render the profile in.
     */
    renderProfile(user, container) {
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Name: ';
        nameLabel.setAttribute('for', 'user-name');

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'user-name';
        nameInput.placeholder = 'Name';
        nameInput.value = user.name;
        nameInput.addEventListener('input', (e) => {
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
        colorInput.addEventListener('input', (e) => {
            const updatedUser = { ...user, color: e.target.value };
            this.getAwareness().setLocalStateField('user', updatedUser);
        });

        const nameDiv = document.createElement('div');
        nameDiv.appendChild(nameLabel);
        nameDiv.appendChild(nameInput);

        const colorDiv = document.createElement('div');
        colorDiv.appendChild(colorLabel);
        colorDiv.appendChild(colorInput);

        container.appendChild(nameDiv);
        container.appendChild(document.createElement('br'));
        container.appendChild(colorDiv);
    }

    /**
     * Render the Friends List page.
     * @param {HTMLElement} container - The container to render the friends list in.
     */
    renderFriends(container) {
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

    /**
     * Render the Network page.
     * @param {HTMLElement} container - The container to render the network in.
     */
    renderNetwork(container) {
        if (typeof this.db.renderNetwork === 'function') {
            this.db.renderNetwork(container);
        } else {
            container.innerHTML = '<p>Network feature not implemented.</p>';
        }
    }

    /**
     * Render the Database page.
     * @param {HTMLElement} container - The container to render the database in.
     */
    renderDatabase(container) {
        if (typeof this.db.renderDatabase === 'function') {
            this.db.renderDatabase(container);
        } else {
            container.innerHTML = '<p>Database feature not implemented.</p>';
        }
    }
}

/**
 * App Class
 * The main application class that initializes and coordinates other components.
 */
class App extends HTMLElement {
    constructor() {
        super();

        this.channel = 'todo';

        this.db = new DB(this.channel);
        this.net = new Network(this.channel, this.db);

        this.attachShadow({ mode: 'open' });
    }

    /**
     * Get the current user.
     * @returns {Object} The current user object.
     */
    user() {
        return this.net.user();
    }

    /**
     * Get the awareness instance.
     * @returns {Object} The awareness instance.
     */
    awareness() {
        return this.net.awareness();
    }

    /**
     * Lifecycle method called when the element is added to the DOM.
     */
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
                
                /* Button Styling */
                button {             
                    background-color: #007BFF;
                    color: white; 
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    border-radius: 4px;
                    margin-bottom: 10px;
                    transition: background-color 0.3s;
                }

                button:hover {
                    background-color: #0056b3;
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

                /* Special Pages Styling */
                .special-page-item {
                    padding: 8px;
                    cursor: pointer;
                    border-bottom: 1px solid #eee;
                }
                .special-page-item:hover {
                    background: #f5f5f5;
                }

                /* Special Page Content Styling */
                .special-page label {
                    display: inline-block;
                    width: 80px;
                    margin-right: 10px;
                }
                .special-page input[type="text"],
                .special-page input[type="color"] {
                    padding: 5px;
                    border: 1px solid #ccc;
                    border-radius: 4px;
                }
                .special-page h3 {
                    margin-top: 0;
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

    /**
     * Load Quill CSS styles from CDNs.
     * @returns {Promise<string>} The combined CSS styles.
     */
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

    /**
     * Initialize all component instances.
     */
    initComponents() {
        // Initialize ContextMenu first as it might be used by Sidebar
        this.contextMenu = new ContextMenu(this.shadowRoot, this.db, this);

        // Initialize Editor
        this.editor = new Editor(this.shadowRoot, this.db, this.awareness.bind(this), this);

        // Initialize SpecialPages
        this.specialPages = new SpecialPages(this.shadowRoot, this.user.bind(this), this.awareness.bind(this), this.db);

        // Initialize Sidebar
        this.sidebar = new Sidebar(this.shadowRoot, this.db, this);
    }

    /**
     * Initialize the application by loading the first page or creating a new one.
     */
    initializeApp() {
        if (this.db.pages.size === 0) {
            this.db.pageNew(`page-${Date.now()}`, 'Empty');
        } else {
            const firstPageId = this.db.pages.keys().next().value;
            this.editor.viewPage(firstPageId);
        }
    }
}

// Define the custom element
customElements.define('app-root', App);
export default App;
