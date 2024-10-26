import $ from 'jquery';

import DB from '/src/db.js';

import Network from '/src/net.js';

import '/style.css'

import Quill from 'quill';
import QuillCursors from 'quill-cursors';
import {QuillBinding} from 'y-quill';
import 'quill/dist/quill.snow.css';

Quill.register('modules/cursors', QuillCursors);

class App extends HTMLElement {
    constructor() {
        super();

        this.channel = 'todo';

        this.db = new DB(this.channel);
        this.net = new Network(this.channel, this.db);

        this.init();
        this.attachShadow({mode: 'open'});
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }

    async init() {
        const cssQuill = await this.cssQuill();

        this.shadowRoot.innerHTML = `
      <style>
        :host {
            display: block;
            width: 100%;
        }
             
        ${cssQuill}              
        
        #container { display: flex; height: 100vh;  }
        #sidebar { width: 250px; overflow-y: auto; padding: 10px;  }
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

        if (this.db.pages.size === 0)
            this.newEmptyPage();
        else
            this.viewPage(this.db.pages.keys().next().value);
    }

    async cssQuill() {
        try {
            return await(await fetch('https://cdn.quilljs.com/1.3.7/quill.snow.css')).text() +
                   '\n' +
                   await(await fetch('https://cdn.jsdelivr.net/npm/quill-cursors@latest/dist/quill-cursors.css')).text();
        } catch (error) {
            console.error('Error loading Quill styles:', error);
            return '';
        }
    }

    quillStop() {
        if (this.currentBinding) {
            this.currentBinding.destroy();
            this.currentBinding = null;
        }
        this.editorContainer().innerHTML = '';
    }

    editorContainer() {
        return this.shadowRoot.querySelector('#editor-container');
    }

    quillStart() {
        const container = this.editorContainer();
        container.innerHTML = `<div id="editor"></div>`;

        //https://quilljs.com/docs/
        return new Quill(container.querySelector('#editor'), {
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
            placeholder: '...'
        });
    }

    initSidebar() {
        const specialPages = [
            {id: 'profile', title: 'User Profile'},
            {id: 'friends', title: 'Friends List'},
            {id: 'network', title: 'Network'},
            {id: 'database', title: 'Database'},
        ];
        const specialList = $(this.shadowRoot.querySelector('#special-pages'));
        specialPages.forEach(page =>
            $('<li>')
                .text(page.title)
                .click(() => this.viewSpecial(page.id))
                .appendTo(specialList));

        $('#add-page', this.shadowRoot).click(() => this.newEmptyPage());

        this.pageList = $(this.shadowRoot.querySelector('#page-list'));
        this.db.pages.observe(() => this.renderPageList());
        this.renderPageList();
    }

    renderPageList() {
        this.pageList.empty();
        this.db.pages.forEach((value, key) => this.pageList.append(
            $('<li>').text(value.title)
                .data('pageId', key)
                .click(() => this.viewPage(key))
                .on('contextmenu', (e) => this.showContextMenu(e, key))
        ));
    }

    newEmptyPage() {
        return this.db.pageNew(`page-${Date.now()}`, 'Empty');
    }

    viewPage(pageId) {
        this.quillStop();
        this.currentBinding = new QuillBinding(
            this.db.pageContent(pageId), this.quillStart(), this.awareness());
    }

    viewSpecial(pageId) {
        this.quillStop();

        const div = $('<div>').addClass('special-page');

        switch (pageId) {
            case 'profile':
                this.renderProfile(this.user(), div);
                break;
            case 'friends':
                this.renderFriends(div);
                break;
            case 'network':
                this.net.renderNetwork(div);
                break;
            case 'database':
                this.db.renderDatabase(div);
                break;
            default:
                div.innerHTML = '<p>Page not found.</p>';
        }

        $(this.editorContainer()).append(div);
    }

    renderProfile(user, container) {
        const nameInput = $('<input type="text" placeholder="Name">').val(user.name)
            .on('input', e => this.awareness().setLocalStateField('user', {
                ...user,
                name: e.target.value
            }));
        const colorInput = $('<input type="color">').val(user.color)
            .on('input', e => this.awareness().setLocalStateField('user', {
                ...user,
                color: e.target.value
            }));
        $(container).append(
            $('<div>').append('<label>Name: </label>', nameInput, '<br>'),
            $('<div>').append('<label>Color: </label>', colorInput)
        );
    }

    renderFriends(container) {
        const updateFriends = () => {
            const users = [];
            this.awareness().getStates().forEach(state => {
                if (state.user) users.push(state.user);
            });
            const ul = $('<ul>');
            users.forEach(user =>
                $('<li>')
                    .text(user.name)
                    .css('color', user.color)
                    .appendTo(ul));
            $(container).append('<h3>Friends</h3>').append(ul);
        };
        this.awareness().on('change', updateFriends);
        updateFriends();
    }


    initContextMenu() {
        const contextMenu = $(this.shadowRoot.querySelector('#context-menu'));

        let selectedPageId = null;

        $(this.shadowRoot).click(() => contextMenu.hide());

        $('#rename-page', contextMenu).click(() => {
            if (selectedPageId) {
                const newName = prompt('Enter new page name:');
                if (newName)
                    this.db.pageTitle(selectedPageId, newName);
            }
            contextMenu.hide();
        });

        $('#delete-page', contextMenu).click(() => {
            if (selectedPageId && confirm('Are you sure you want to delete this page?'))
                this.db.pages.delete(selectedPageId);
            contextMenu.hide();
        });

        this.shadowRoot.querySelector('#page-list').addEventListener('contextmenu', (e) => {
            e.preventDefault();
            selectedPageId = $(e.target).closest('li').data('pageId');
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
