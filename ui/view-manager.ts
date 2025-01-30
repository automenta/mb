import type { Store } from './store';
import type App from './app';
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import MeView from './me.view';
import { SettingsView } from './settings.view';

export default class ViewManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    public registerViews(): void {
        if (!this.app.db || !this.app.net || !this.app.match) {
            console.error("One or more dependencies are not initialized.");
            return;
        }
        new DBView($('#db-view')[0], this.app.db).render();
        new DBView($('#db-view')[0], this.app.db).render();
        new NetView($('#net-view'), this.app.net).render();
    }
}
