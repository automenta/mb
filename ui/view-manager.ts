import $ from 'jquery';
import type { Store } from './store';
import type App from './app';
import DBView from './db.view'; // Import DBView - keep this import
import NetView from './net.view';
// import MatchView from './match.view'; // Commented out for now
import MeView from './me.view'; // Import MeView - keep this import
import { SettingsView } from './settings.view'; // Import SettingsView - keep this import

export default class ViewManager {
    private app: App;
    private readonly store: Store;
    private views: { [key: string]: any } = {};

    constructor(app: App, store: Store) { // Constructor - keep as is
        this.app = app;
        this.store = store;
        this.initializeViews();
        this.setupNavigation();
    }

    private initializeViews(): void {
        // Initialize views here
        this.views = {
            'db-view': new DBView(this.app, $('#db-view'), this.app.db), // Initialize DBView with app and db
            'net-view': new NetView($('#net-view'), this.app.net),
            // 'match-view': new MatchView($('#match-view'), this.app.match), // Commented out for now
            'profile-view': new MeView($('#profile-view'), this.store.getUser.bind(this.store), this.app.getAwareness.bind(this.app), this.app.db),
            'settings-view': new SettingsView($('#settings-view'), this.store) // Initialize SettingsView - corrected initialization
        };
    }

    private setupNavigation(): void {
        $('.menubar li').on('click', (event) => {
            const viewId = $(event.currentTarget).attr('id')!;
            this.showView(viewId);
        });
    }

    public showView(viewId: string): void {
        $('.main-view > div').hide(); // Hide all views

        if (this.views[viewId]) {
            const view = this.views[viewId];

            if (view.render) {
                view.render();
            }

            $(`#${viewId}`).show(); // Show the selected view
        } else {
            console.error('View not found:', viewId);
        }
    }
}
