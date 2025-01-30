import $ from 'jquery';
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import type App from './app';

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
        new NetView($('#net-view'), this.app.net).render();
        const matchViewRoot = $('#match-view');
        if (matchViewRoot.length) {
            new MatchView(matchViewRoot, this.app.match).render();
        } else {
            console.error('Element #match-view not found.');
        }
    }
}
