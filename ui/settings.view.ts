import $ from 'jquery';
import { Store } from './store';

export class SettingsView {
    private readonly ele: JQuery;
    private readonly store: Store;

    constructor(ele: JQuery, store: Store) {
        this.ele = ele;
        this.store = store;
        this.render();
    }

    render(): void {
        this.ele.html(`
            <h2>Settings</h2>
            <p>This is the settings view.</p>
        `);
    }
}
