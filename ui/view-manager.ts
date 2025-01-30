import $ from 'jquery';
import type { Store } from './store';
import type App from './app';
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import MeView from './me.view';
import {SettingsView} from "./settings.view";

export default class ViewManager {
    private app: App;
    private readonly store: Store;
    private views: { [key: string]: any } = {};

    constructor(app: App, store: Store) {
        this.app = app;
        this.store = store;
    }

    public registerViews(): void {
        if (!this.app.db || !this.app.net || !this.app.match || !this.store) {
            console.error("One or more dependencies are not initialized.");
            return;
        }

        // Initialize views after the main HTML structure is set up
        this.views = {
            'db-view': new DBView($('#db-view'), this.app.db),
            'net-view': new NetView($('#net-view'), this.app.net),
            'match-view': new MatchView($('#match-view'), this.app.match),
            'profile-view': new MeView($('#profile-view'), this.store.getUser.bind(this.store), this.app.getAwareness.bind(this.app), this.app.db),
            'settings-view': new SettingsView($('#settings-view'), this.store)
        };

        for (const viewId in this.views) {
            const viewElement = $(`#${viewId}`);
            if (!viewElement.length) console.error(`Element for view ${viewId} not found.`);
            this.views[viewId].render();
        }
    }

    public showView(viewId: string): void {
        $('.main-view > div').hide();
        const view = this.views[viewId];
        if (view) {
            const viewElement = $(`#${viewId}`);
            if (viewElement.length) {
                viewElement.show();
            } else {
                console.error(`Element for view ${viewId} not found.`);
            }
        } else {
            console.error(`View ${viewId} not found.`);
        }
    }
}
