import { $ } from './imports';
import { store, initializeStore } from './store';
import NObject from '../core/obj';
import ObjViewMini from './util/obj.view.mini';
import '../ui/css/sidebar.css';
import MeView from "./me.view";
import FriendsView from "./friends.view";
import NetView from "./net.view.js";
import NotificationsView from './notifications.view';
import DBView from "./db.view";
import MatchingView from "./match.view.js";
import AgentsView from "./agents.view";
import App from './app';
import App from './app';
import View from './util/view';

class PageContextMenu {
    readonly ele: JQuery;
    private selectedPageId: string | null = null;
    app: App; // Add App instance

    constructor(store: ReturnType<typeof initializeStore> & { app?: App }) {
        this.app = store.app!; // Access app from store
        this.ele = $('<div>').addClass('context-menu').html(`
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">delete-page</li>
            </ul>
        `).hide(); // Initially hide context menu

    constructor(private store: ReturnType<typeof initializeStore> & { app?: App }) {
        this.ele = $('<div>').addClass('context-menu').html(`
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">delete-page</li>
            </ul>
        `).hide(); // Initially hide context menu

        $(document).on('click', e => { // Use document-level event listener
            if (!$(e.target).closest('.context-menu').length) {
                this.hide();
            }
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
        const newName = prompt('Rename page to:', obj.name); // Pre-fill with current name
        if (newName && newName !== obj.name) { // Check if name actually changed
            obj.name = newName;
            store.setCurrentObject(obj);
        }
    }

    deletePage(obj: NObject) {
        if (confirm(`Are you sure you want to delete page "${obj.name}"?`)) { // Confirm with page name
            const wasPublic = obj.public;
            store.removeObject(obj.id);

            this.store.app?.db?.delete(obj.id);
            this.store.app?.editor?.clearIfCurrent(obj.id);

            if (wasPublic) {
                const net = this.store.app?.net;
                net?.unshareObject(obj.id);
            }
        }
    }


    show(event: JQuery.ContextMenuEvent, pageId: string) { // Renamed to 'show' and simplified
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
    private readonly meView: MeView | null;
    private readonly friendsView: FriendsView;
    private readonly netView: NetView;
    private readonly dbView: DBView | null;
    private readonly notificationsView: NotificationsView;
    private readonly matchingView: MatchingView | null;
    private readonly agentsView: AgentsView;
    private currentView: View | null = null; // Track current view
    private viewManager: ViewManager;

    constructor(viewManager: ViewManager, ele: HTMLElement) {
        this.viewManager = viewManager;
        this.ele = $(ele).addClass('sidebar');
        this.store = initializeStore(this.viewManager.app.db); // Access app from viewManager
        this.store.app = this.viewManager.app; // Access app from viewManager
        this.contextMenu = new PageContextMenu(this.store);
        this.pageList = $('<ul>', { class: 'page-list' });
        const $mainView = $('.main-view');
        console.log('Sidebar: mainView jQuery object:', $mainView); // Log mainView

        this.friendsView = new FriendsView($mainView, app.getAwareness.bind(app));
        this.agentsView = new AgentsView($mainView);
        this.netView = new NetView($mainView, app.net);
        if (app.match)
            this.matchingView = new MatchingView($mainView, app.match);

        if (app.db) {
            this.meView = new MeView($mainView, app.store.getUser.bind(app.store), app.getAwareness.bind(app), app.db);
            this.dbView = new DBView($mainView[0], app.db);
            this.notificationsView = new NotificationsView($mainView[0], app.db, app.editor!.loadDocument.bind(app.editor!));
        }

        this.ele.append(this.createMenubar());
        this.ele.append(this.pageList);
        $(document.body).append(this.contextMenu.ele);

        events.on(NETWORK_ACTIVITY, (event: any) => { // Subscribe to NETWORK_ACTIVITY
            if (event.type === 'status') {
                this.updateNetworkStatus(event.data.status);
            }
        });

        this.store.subscribe(state => this.updatePageList(state.objects));

        // Initially show 'My Objects' list
        this.switchView('my-objects'); // Initial view is page list
        console.log('Sidebar: initial view switched to my-objects'); // Log initial view switch
    }


    private createAddPageButton(): JQuery {
        return $('<button>', {
            class: 'menubar-button add-page-button',
            title: 'Add New Page'
        }).append($('<i>', { class: 'fas fa-plus' })).on('click', () => { // Using font-awesome icon
            this.app.createNewObject();
        });
    }


    private createMenubar(): JQuery {
        const menuBar = $('<div>', { class: 'menubar' });
        menuBar.append(
            this.createAddPageButton(),
            //this.createTestAddObjectButton(), // Removed test button
            //this.createListViewModeDropdown(), // Removed dropdown for now
            this.createMenuButton({ id: 'profile', title: 'Me', view: this.meView }),
            this.createMenuButton({ id: 'friends', title: 'Friends', view: this.friendsView }),
            this.createMenuButton({ id: 'network', title: 'Network', view: this.netView }),
            this.createMenuButton({ id: 'database', title: 'DB', view: this.dbView }),
            this.createMenuButton({ id: 'agents', title: 'Agents', view: this.agentsView }),
            this.createMenuButton({ id: 'notifications', title: 'Notifications', view: this.notificationsView }),
            this.createToggleDarkModeButton(),
            this.createNetworkStatusIndicator() // Add network status indicator
        );
        return menuBar;
    }

    private createNetworkStatusIndicator(): JQuery {
        return $('<div>', {
            class: 'network-status',
            id: 'network-status-indicator',
            title: 'Network Status'
        }).append(
            $('<span>', { text: 'Network: ' }),
            $('<span>', { id: 'network-status-text', text: 'Disconnected' }) // Initial status
        );
    }

    private createToggleDarkModeButton(): JQuery {
        return $('<button>', {
            class: 'menubar-button',
            title: 'Toggle Dark Mode'
        }).append(
            $('<i>', { class: 'fas fa-adjust' }), // Example icon for dark mode toggle
            $('<span>').text('Theme') // Text label for clarity
        ).on('click', () => {
            this.store.app?.toggleDarkMode();
        });
    }

    private createMenuButton({ id, title, view }: { id: string; title: string; view: View | null }): JQuery {
        const button = $('<button>', {
            id: `menu-${id}`,
            class: 'menubar-button',
            'data-view-id': id, // Store view ID in data attribute
            title: title
        }).append(
            $('<span>').text(title) // Keep text label
        );

        button.on('click', () => {
            this.viewManager.showView(id); // Use ViewManager directly to switch view
        });
        return button;
    }


    switchView(viewId: string) {
        //console.log('sidebar.switchView: viewId =', viewId); // No longer needed here, view switching handled by ViewManager
        // $('.main-view').empty(); // ViewManager handles main view area
        //$('.menubar-button.active').removeClass('active'); // ViewManager handles active button
        //$(`.menubar-button[data-view-id="${viewId}"]`).addClass('active'); // ViewManager handles active button
        //console.log('sidebar.switchView: active button set for', viewId); // No longer needed here

        if (viewId === 'my-objects') {
            $('#list-view-container').show(); // Show page list container
            this.currentView = null;
            //console.log('sidebar.switchView: showing my-objects list'); // No longer needed here
        } else {
            $('#list-view-container').hide(); // Hide page list container
            this.currentView = null; // Reset currentView as ViewManager handles view display
            //let view: View | null = null; // No longer needed, ViewManager handles view display
            //switch (viewId) { // No longer needed, ViewManager handles view display
            //    case 'profile': view = this.meView; break; // No longer needed, ViewManager handles view display
            //    case 'friends': view = this.friendsView; break; // No longer needed, ViewManager handles view display
            //    case 'network': view = this.netView; break; // No longer needed, ViewManager handles view display
            //    case 'database': view = this.dbView; break; // No longer needed, ViewManager handles view display
            //    case 'agents': view = this.agentsView; break; // No longer needed, ViewManager handles view display
            //    case 'notifications': view = this.notificationsView; break; // No longer needed, ViewManager handles view display
            //    case 'matching': view = this.matchingView; break; // No longer needed, ViewManager handles view display
            //}
            //if (view) { // No longer needed, ViewManager handles view display
            //    console.log('sidebar.switchView: rendering view for', viewId, view); // No longer needed here
            //    const renderedView = view.render(); // No longer needed, ViewManager handles view display
            //    console.log('sidebar.switchView: renderedView:', renderedView); // No longer needed here
            //    if (renderedView && renderedView.length > 0) { // No longer needed, ViewManager handles view display
            //        $('.main-view').append(renderedView); // ViewManager handles main view area
            //        this.currentView = view; // No longer needed, ViewManager handles view display
            //        console.log('sidebar.switchView: view rendered and appended for', viewId); // No longer needed here
            //    } else { // No longer needed, ViewManager handles view display
            //        console.warn('sidebar.switchView: view.render() returned null or empty for', viewId); // No longer needed here
            //    } // No longer needed, ViewManager handles view display
            //} else { // No longer needed, ViewManager handles view display
            //    console.warn('sidebar.switchView: no view found for', viewId); // No longer needed here
            //} // No longer needed, ViewManager handles view display
        }
    }


    updatePageList(objects: NObject[]) {
        console.log('updatePageList called with', objects.length, 'objects');
        this.pageList.empty().append(objects.map(obj => {
            const v = new ObjViewMini(obj);
            v.ele.attr('data-page-id', obj.id)
                .on('contextmenu', (e: JQuery.ContextMenuEvent) => {
                    this.contextMenu.show(e, obj.id); // Use simplified 'show' method
                })
                .on('click', async () => {
                    this.store.setCurrentObject(obj);
                    await this.store.app?.editor?.loadDocument(obj);
                    this.switchView('my-objects'); // Keep 'my-objects' view active
                });
            return v.ele;
        }));
    }

    private updateNetworkStatus(status: string): void {
        const statusTextElement = this.ele.find('#network-status-text');
        if (statusTextElement) {
            statusTextElement.text(status);
            statusTextElement.removeClass('connected disconnected connecting'); // Remove previous classes
            statusTextElement.addClass(status); // Add class based on status
        }
    }
}
