import { $ } from './imports';
import { store, initializeStore } from './store';
import type NObject from '../src/obj';
import ObjViewMini from './util/obj.view.mini';
import '/ui/css/sidebar.css';
import type DB from '../src/db';
import MeView from "./me.view";
import FriendsView from "./friends.view";
import NetView from "./net.view.js";
import DBView from "./db.view";
import MatchingView from "./match.view.js";
import App from './app';

class PageContextMenu {
    readonly ele: JQuery;
    private selectedPageId: string | null = null;

    constructor(private store: ReturnType<typeof initializeStore> & { app?: App }) {
        this.ele = $('<div>').addClass('context-menu').html(`
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">Delete</li>
            </ul>
        `);

        $(document).click(e => {
            if (!$(e.target).closest('#context-menu').length)
                this.hide();
        });

        this.ele.on('click', 'li', e => {
            const action = $(e.target).data('action');
            if (!action) return;
            
            const currentObject = store.getState().currentObject;
            if (!currentObject) return;

            if (action === 'rename-page') this.renamePage(currentObject);
            else if (action === 'delete-page') this.deletePage(currentObject);
            this.hide();
        });
    }

    renamePage(obj: NObject) {
        const newName = prompt('Enter new page name:');
        if (newName) {
            obj.name = newName;
            store.setCurrentObject(obj);
        }
    }

    deletePage(obj: NObject) {
        if (confirm('Are you sure you want to delete this page?')) {
            const wasPublic = obj.public;
            store.removeObject(obj.id);
            
            // Update database and clear editor if viewing deleted object
            this.store.app?.db.delete(obj.id);
            this.store.app?.editor.clearIfCurrent(obj.id);
            
            if (wasPublic) {
                const net = this.store.app?.net;
                net?.unshareDocument(obj.id);
            }
        }
    }

    showContextMenu(event: JQuery.ContextMenuEvent, pageId: string) {
        event.preventDefault();
        this.selectedPageId = pageId;
        this.ele.css({
            top: event.clientY,
            left: event.clientX,
            display: 'block'
        });
    }

    hide() {
        this.ele.hide();
    }
}

export default class Sidebar {
    readonly ele: JQuery;
    private contextMenu: PageContextMenu;
    private readonly pageList: JQuery;
    private readonly store: ReturnType<typeof initializeStore> & { app?: App; };
    private meView: MeView;
    private friendsView: FriendsView;
    private netView: NetView;
    private dbView: DBView;
    private matchingView: MatchingView;

    constructor(db: DB, app: App) {
        this.ele = $('<div>').addClass('sidebar');
        this.store = initializeStore(db);
        this.store.app = app;
        this.contextMenu = new PageContextMenu(this.store);
        this.pageList = $('<ul>', { class: 'page-list' });

        this.ele.append(this.menu());
        this.ele.append(this.pageList);
        $(document.body).append(this.contextMenu.ele);

        // Subscribe to store changes
        this.store.subscribe(state => {
            this.updatePageList(state.objects);
        });
        this.updatePageList(this.store.getState().objects); // Initial load
    }

    menu() {
        const menuBar = $('<div>', { class: 'menubar' }).append(
            $('<button>', {
                class: 'menubar-button add-page-button',
                text: '+',
                title: 'Add New Page'
            }).click(() => {
                const db = this.store.getState().db;
                if (db) {
                    const newObj = db.create();
                    newObj.name = 'Untitled';
                    this.store.addObject(newObj);
                    this.store.setCurrentObject(newObj);
                    // console.log('New page created and set as current object:', newObj.id);
                    this.store.getState().awareness?.setLocalState({
                        type: 'object-created',
                        id: newObj.id,
                        timestamp: Date.now()
                    });
                    this.store.app?.editor.loadDocument(newObj); // Load new object into editor
                }
            }),
            // Add a button to test object updates
            $('<button>', {
                class: 'menubar-button',
                text: 'Test Add Object',
                title: 'Test Add Object'
            }).click(() => {
                const db = this.store.getState().db;
                if (db) {
                    const newObj = db.create();
                    newObj.name = 'Test Object';
                    this.store.addObject(newObj);
                    console.log('Test object added:', newObj.id);
                }
            })
        );

        const app = this.store.app;
        if (!app) {
            console.error('App instance not found in store');
            return menuBar;
        }

        let $main = $('.main-view');
        const menuItems = [
            { id: 'profile', title: 'Me', view: new MeView($main, app.user.bind(app), app.awareness.bind(app), app.db) },
            { id: 'friends', title: 'Friends', view: new FriendsView($main, app.awareness.bind(app)) },
            { id: 'network', title: 'Net', view: new NetView($main, app.net) },
            { id: 'database', title: 'DB', view: new DBView($main[0], app.db), isView: true },
            { id: 'matching', title: 'Matching', view: new MatchingView($main, app.match), isView: true },
        ];

        menuItems.forEach(item => menuBar.append(this.createMenuButton.bind(this)(item)));

        // Add a button to toggle dark mode
        menuBar.append(
            $('<button>', {
                class: 'menubar-button',
                text: 'Toggle Dark Mode',
                title: 'Toggle Dark Mode'
            }).click(() => {
                this.store.app?.toggleDarkMode();
            })
        );

        return menuBar;
    }

    private createMenuButton({ id, title, view, isView }: { id: string; title: string; view: any, isView?: boolean }) {
        const button = $('<button>', {
            id: `menu-${id}`,
            class: 'menubar-button',
            text: title,
            title: title
        });
    
        if (isView) {
            button.click(() => {
                const mainView = $('.main-view');
                mainView.empty();
                view.render();
            });
        } else {
            button.click(() => {
                const mainView = $('.main-view');
                mainView.empty();
                mainView.append(view.render());
            });
        }
    
        return button;
    }

    updatePageList(objects: NObject[]) {
        console.log('updatePageList called with', objects.length, 'objects');
        const nextPageList: JQuery[] = [];
        objects.forEach(obj => {
            const v = new ObjViewMini(obj);
            v.ele.attr('data-page-id', obj.id)
                .on('contextmenu', (e: JQuery.ContextMenuEvent) => {
                    e.preventDefault();
                    this.contextMenu.showContextMenu(e, obj.id);
                })
                .on('click', async () => {
                    this.store.setCurrentObject(obj);
                    await this.store.app?.editor.loadDocument(obj);
                });
            nextPageList.push(v.ele);
        });

        this.pageList.empty().append(nextPageList);
    }
}