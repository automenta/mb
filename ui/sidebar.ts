import { $ } from './imports';
import { store, initializeStore } from './store';
import NObject from '../src/obj';
import ObjViewMini from './util/obj.view.mini';
import '../ui/css/sidebar.css';
import type DB from '../src/db';
import MeView from "./me.view";
import FriendsView from "./friends.view";
import NetView from "./net.view.js";
import DBView from "./db.view";
import MatchingView from "./match.view.js";
import AgentsView from "./agents.view";
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
            this.store.app?.db?.delete(obj.id);
            this.store.app?.editor?.clearIfCurrent(obj.id);

            if (wasPublic) {
                const net = this.store.app?.net;
                net?.unshareObject(obj.id);
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
    private meView: MeView | null = null;
    private friendsView: FriendsView;
    private netView: NetView;
    private dbView: DBView | null = null;
    private matchingView: MatchingView;

    constructor(db: DB, app: App) {
        this.ele = $('<div>').addClass('sidebar');
        this.store = initializeStore(db);
        this.store.app = app;
        this.contextMenu = new PageContextMenu(this.store);
        this.pageList = $('<ul>', { class: 'page-list' });
        this.friendsView = new FriendsView($('.main-view'), app.awareness.bind(app));
        this.netView = new NetView($('.main-view'), app.net);
        this.matchingView = new MatchingView($('.main-view'), app.match);

        if (app.db) {
            this.meView = new MeView($('.main-view'), app.user.bind(app), app.awareness.bind(app), app.db);
            this.dbView = new DBView($('.main-view')[0], app.db);
        }


        this.ele.append(this.menu());
        this.ele.append(this.pageList);
        $(document.body).append(this.contextMenu.ele);

        // Subscribe to store changes
        this.store.subscribe(state => {
            this.updatePageList(state.objects);
        });
    }

    private currentListViewMode: string = 'my-objects'; // Default mode

    switchListViewMode(mode: string) {
        this.currentListViewMode = mode;
        const listViewContainer = $('#list-view-container');
        listViewContainer.empty();

        let view = null;
        switch (mode) {
            case 'my-objects': view = this.pageList; break;
            case 'friends': view = this.friendsView.render(); break;
            case 'network': view = this.netView.render(); break;
            default: view = $('<div>').text(`Unknown mode: ${mode}`);
        }
        listViewContainer.append(view);
    }

    private createAddPageButton(): JQuery {
        return $('<button>', {
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
                this.store.getState().awareness?.setLocalState({
                    type: 'object-created',
                    id: newObj.id,
                    timestamp: Date.now()
                });
                this.store.app?.editor?.loadDocument(newObj); // Load new object into editor
            }
        });
    }

    private createTestAddObjectButton(): JQuery {
        return $('<button>', {
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
        });
    }

    private createListViewModeDropdown(): JQuery {
        // Dropdown for list view modes
        const listModeDropdown = $('<select>', {
            id: 'list-mode-dropdown',
            title: 'Select List View Mode'
        }).append(
            $('<option>', { value: 'my-objects', text: 'My Objects' }),
            $('<option>', { value: 'friends', text: 'Friends' }),
            $('<option>', { value: 'network', text: 'Network' }),
            // Add more options as needed
        ).change(() => {
            const selectedMode = listModeDropdown.val() as string;
            this.switchListViewMode(selectedMode);
        });
        return listModeDropdown;
    }

    private createMenuItems(mainView: JQuery): JQuery[] {
        const $main = $('.main-view');
        const menuItems = [{ id: 'profile', title: 'Me', view: this.meView, isView: false },
            { id: 'friends', title: 'Friends', view: this.friendsView, isView: false },
            { id: 'network', title: 'Net', view: this.netView, isView: false },
            { id: 'database', title: 'DB', view: this.dbView, isView: true },
            { id: 'agents', title: 'Agents', view: new AgentsView($main), isView: true },
        ];
        return menuItems.map(item => {
            if (item.view) {
                return this.createMenuButton({ ...item, mainView });
            }
        }).filter(item => item !== undefined) as JQuery[]; // Filter out undefined and cast
    }

    private createToggleDarkModeButton(): JQuery {
        return $('<button>', {
            class: 'menubar-button',
            text: 'Toggle Dark Mode',
            title: 'Toggle Dark Mode'
        }).click(() => {
            this.store.app?.toggleDarkMode();
        });
    }

    /**
     * Creates a menu button with given properties.
     */
    private createMenuButton({ id, title, view, isView = false, mainView }: {
        id: string; title: string; view: any; isView?: boolean; mainView: JQuery;
    }): JQuery<HTMLElement> {
        return $('<button>', {
            id: `menu-${id}`,
            class: 'menubar-button',
            text: title,
            title: title
        }).click(() => {
            mainView.empty();
            isView ? view.render() : mainView.append(view.render());
        });
    }

    menu() {
        const menuBar = $('<div>', { class: 'menubar' });
        menuBar.append(
            this.createAddPageButton(),
            this.createTestAddObjectButton(),
            this.createListViewModeDropdown(),
            ...this.createMenuItems($('.main-view')),
            this.createToggleDarkModeButton()
        );

        // Placeholder for the list view
        const listViewContainer = $('<div>', { id: 'list-view-container' });
        this.ele.append(listViewContainer);
        return menuBar;
    }


    updatePageList(objects: NObject[]) {
        console.log('updatePageList called with', objects.length, 'objects');
        this.pageList.empty().append(objects.map(obj => {
            const v = new ObjViewMini(obj);
            v.ele.attr('data-page-id', obj.id)
                .on('contextmenu', (e: JQuery.ContextMenuEvent) => {
                    e.preventDefault();
                    this.contextMenu.showContextMenu(e, obj.id);
                })
                .on('click', async () => {
                    this.store.setCurrentObject(obj);
                    await this.store.app?.editor?.loadDocument(obj);
                });
            return v.ele;
        }));
    }
}
