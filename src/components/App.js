import $ from 'jquery';
import * as Y from 'yjs';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import {QuillBinding} from 'y-quill';

import Network from '/src/net.js';

import '/style.css'
import 'quill/dist/quill.snow.css';

Quill.register('modules/cursors', QuillCursors);

class App extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.doc = new Y.Doc();
        this.channel = 'todo';
        this.net = new Network(this.channel, this.doc);
        this.pages = this.doc.getMap('pages');
        this.init();
    }

    awareness() {
        return this.net.net.awareness;
    }

    async init() {
        const cssQuill = await this.cssQuill();

        this.shadowRoot.innerHTML = `
      <style>
        ${cssQuill}
        
        #container { display: flex; height: 100vh;  }
        #sidebar { width: 250px;  overflow-y: auto; padding: 10px; }
        #main-view { flex: 1; padding: 10px; display: flex;  }
        #editor-container { flex: 1; display: flex; flex-direction: column; position: relative; }
        
        .ql-container.ql-snow { flex: 1; overflow-y: auto; border: none; }
        .ql-snow .ql-picker-options {
            background-color: black;
        }
        .ql-toolbar.ql-snow { 
            border: 1px solid #ccc;
            box-sizing: border-box;
            padding: 8px;
            position: sticky;
            top: 0;            
            z-index: 1;
        }
        
        #editor {
            height: 100%;
            overflow-y: auto;
            border: 1px solid #ccc;
            border-top: none;
            font-size: 100%;
        }
        
        ul { list-style: none; padding: 0.5em; margin: 0; }
        li { padding: 5px; cursor: pointer; }
        li:hover { background: #333; }
        
        button {             
            background-color: #444;
            color: white; 
        }
        
        .context-menu { position: absolute; border: 1px solid #ccc; box-shadow: 2px 2px 6px rgba(30,30,30,0.2); display: none; z-index: 1000; }
        .context-menu ul { list-style: none; margin: 0; padding: 0; }
        .context-menu li { padding: 8px 12px; cursor: pointer; }
        .context-menu li:hover { background: #333; }
      </style>
      <div id="container">
        <div id="sidebar">         
          <button id="add-page">+</button>
          <ul id="page-list"></ul>
          <hr>
          <ul id="special-pages"></ul>
        </div>
        <div id="main-view">
          <div id="editor-container"></div>
        </div>
      </div>
      <div id="context-menu" class="context-menu">
        <ul>
          <li id="rename-page">Rename</li>
          <li id="delete-page">Delete</li>
        </ul>
      </div>
    `;
        this.initSidebar();
        this.initContextMenu();
        this.openDefaultPage();
    }

    async cssQuill() {
        try {
            return await (await fetch('https://cdn.quilljs.com/1.3.7/quill.snow.css')).text() +
                '\n' +
                await (await fetch('https://cdn.jsdelivr.net/npm/quill-cursors@latest/dist/quill-cursors.css')).text();
        } catch (error) {
            console.error('Error loading Quill styles:', error);
            return '';
        }
    }

    cleanupEditor() {
        if (this.currentBinding) {
            this.currentBinding.destroy();
            this.currentBinding = null;
        }
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = '';
        this.currentQuill = null;
    }

    initQuillEditor() {
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        editorContainer.innerHTML = `
            <div id="editor"></div>
        `;

        const quill = new Quill(editorContainer.querySelector('#editor'), {
            theme: 'snow',
            modules: {
                cursors: true,
                toolbar: [
                    [{header: [1, 2, false]}],
                    ['bold', 'italic', 'underline'],
                    ['image', 'code-block']
                ],
                history: {
                    userOnly: true
                }
            },
            placeholder: 'Start writing...'
        });

        return quill;
    }

    initSidebar() {
        const specialPages = [
            {id: 'profile', title: 'User Profile'},
            {id: 'friends', title: 'Friends List'},
            {id: 'network', title: 'Network Status'},
            {id: 'database', title: 'Database'},
        ];
        const specialList = $(this.shadowRoot.querySelector('#special-pages'));
        specialPages.forEach(page => {
            $('<li></li>')
                .text(page.title)
                .on('click', () => this.openSpecialPage(page.id))
                .appendTo(specialList);
        });

        $('#add-page', this.shadowRoot).on('click', () => this.addPage());

        this.pageList = $(this.shadowRoot.querySelector('#page-list'));
        this.pages.observe(() => this.renderPageList());
        this.renderPageList();
    }

    openDefaultPage() {
        if (this.pages.size === 0) {
            this.addPage();
        } else {
            const firstPageId = this.pages.keys().next().value;
            this.openPage(firstPageId);
        }
    }

    renderPageList() {
        this.pageList.empty();
        this.pages.forEach((value, key) => {
            const li = $('<li></li>')
                .text(value.title)
                .data('pageId', key)
                .on('click', () => this.openPage(key))
                .on('contextmenu', (e) => this.showContextMenu(e, key));
            this.pageList.append(li);
        });
    }

    addPage() {
        const pageId = `page-${Date.now()}`;
        this.pages.set(pageId, {title: 'New Page', contentId: `content-${pageId}`});
    }

    openPage(pageId) {
        this.cleanupEditor();
        const page = this.pages.get(pageId);

        const quill = this.initQuillEditor();
        this.currentQuill = quill;

        const yText = this.doc.getText(page.contentId);
        this.currentBinding = new QuillBinding(yText, quill, this.awareness());
    }

    openSpecialPage(pageId) {
        this.cleanupEditor();
        const editorContainer = this.shadowRoot.querySelector('#editor-container');
        const div = document.createElement('div');
        div.className = 'special-page';
        editorContainer.appendChild(div);

        switch (pageId) {
            case 'profile':
                this.renderProfilePage(div);
                break;
            case 'friends':
                this.renderFriendsPage(div);
                break;
            case 'network':
                this.net.renderNetworkStatusPage(div);
                break;
            case 'database':
                this.renderDatabasePage(div);
                break;
            default:
                div.innerHTML = '<p>Page not found.</p>';
        }
    }

    renderProfilePage(container) {
        const user = this.awareness().getLocalState().user;
        const nameInput = $('<input type="text" placeholder="Name">').val(user.name).on('input', e => {
            this.awareness().setLocalStateField('user', {...user, name: e.target.value});
        });
        const colorInput = $('<input type="color">').val(user.color).on('input', e => {
            this.awareness().setLocalStateField('user', {...user, color: e.target.value});
        });
        $(container).append(
            $('<div></div>').append('<label>Name: </label>', nameInput, '<br>'),
            $('<div></div>').append('<label>Color: </label>', colorInput)
        );
    }

    renderFriendsPage(container) {
        const updateFriends = () => {
            container.innerHTML = '<h3>Friends List</h3>';
            const users = [];
            this.awareness().getStates().forEach(state => {
                if (state.user) users.push(state.user);
            });
            const ul = $('<ul></ul>');
            users.forEach(user => {
                $('<li></li>')
                    .text(user.name)
                    .css('color', user.color)
                    .appendTo(ul);
            });
            $(container).append(ul);
        };
        this.awareness().on('change', updateFriends);
        updateFriends();
    }


    renderDatabasePage(container) {
        container.innerHTML = '<h3>Database Statistics</h3>';
        const stats = {
            pages: this.pages.size,
            clients: this.awareness().getStates().size,
        };
        $(container).append(`<p>Pages: ${stats.pages}</p>`, `<p>Clients: ${stats.clients}</p>`);
        // TODO: Implement table view with sort and filter
    }

    initContextMenu() {
        const contextMenu = $(this.shadowRoot.querySelector('#context-menu'));
        let selectedPageId = null;

        this.shadowRoot.addEventListener('click', () => {
            contextMenu.hide();
        });

        $('#rename-page', contextMenu).on('click', () => {
            if (selectedPageId) {
                const newName = prompt('Enter new page name:');
                if (newName) {
                    const page = this.pages.get(selectedPageId);
                    this.pages.set(selectedPageId, {...page, title: newName});
                }
            }
            contextMenu.hide();
        });

        $('#delete-page', contextMenu).on('click', () => {
            if (selectedPageId) {
                if (confirm('Are you sure you want to delete this page?')) {
                    this.pages.delete(selectedPageId);
                }
            }
            contextMenu.hide();
        });

        this.shadowRoot.querySelector('#page-list').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const li = $(e.target).closest('li');
            selectedPageId = li.data('pageId');
            contextMenu.css({top: e.clientY, left: e.clientX}).show();
        });
    }

    showContextMenu(event, pageId) {
        event.preventDefault();
        const contextMenu = $(this.shadowRoot.querySelector('#context-menu'));
        contextMenu.css({top: event.clientY, left: event.clientX}).show();
        this.selectedPageId = pageId;
    }
}

customElements.define('app-root', App);

export default App;
