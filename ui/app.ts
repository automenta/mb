import $ from 'jquery';
import Editor from './editor/editor'; // Import Editor
import DB from '../core/db';
import Matching from '../core/match';
import Network from '../core/net';
import {Awareness} from 'y-protocols/awareness';
import ViewManager from './view-manager';
import {Tags} from "../core/tags";
import Sidebar from './sidebar'; // Corrected import
import {getStore, Store} from './store';

class ThemeManager {
    private isDarkMode: boolean;
    private appElement: JQuery;

    constructor(appElement: HTMLElement) {
        this.appElement = $(appElement);
        this.isDarkMode = localStorage.getItem('themePreference') === 'dark';
        this.applyTheme();
    };

    applyTheme() {
        $(this.appElement).toggleClass('dark-mode', this.isDarkMode);
    };

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('themePreference', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    };
}

export interface AppConfig {
    element: HTMLElement;
}

export default class App {
    public store: Store;
    public tags: Tags;
    public editor?: Editor; // Add Editor property
    public readonly channel: string;
    private ele: JQuery;
    private themes: ThemeManager;
    private views: ViewManager;
    private sidebar: Sidebar;

    constructor(channel: string, config: AppConfig) {
        this.channel = channel;
        this.db = new DB(channel);
        this.net = new Network(channel, this.db);
        this.match = new Matching(this.db, this.net);

        this.ele = $(config.element);
        this.store = getStore(this.db);
        this.themes = new ThemeManager(this.ele[0]);
        this.tags = new Tags();
        this.views = new ViewManager(this, this.store);

        this.views = new ViewManager(this, this.store);
        this.editor = new Editor({ // Initialize Editor
            db: this.db, // Pass DB instance
            net: this.net,
            tags: this.tags,
            ele: $('.main-view')[0], // Pass main-view as editor container
            app: this,
            ydoc: this.db.doc,
            getAwareness: () => this.getAwareness()
        });
        this.sidebar = new Sidebar(this.views, this, $('.sidebar')[0]);
        this.views.showView('db'); // Show the DB view initially

        this.render();
        console.log('App initialized', this);

        const websocket = false; //TODO configure
        if (websocket)
            this.initWebSocket();
    };


    public render(): void {
        $(this.ele).html(`
            <div class="container">
                <aside class="sidebar"></aside>
                <main class="main-view"></main>
            </div>
        `);
    };

    getAwareness(): Awareness {
        return this.net!.net.awareness;
    };


    createNewObject(): void {
        const newObj = this.db.create();
        newObj.name = 'New Object';
        newObj.author = this.store.currentUser?.userId ?? 'Anonymous'; // Handle anonymous user
        newObj.public = false; // Ensure new objects are private by default
        +newObj.isQuery = false; // Default to not being a query
        this.db.add(newObj);
        this.store.addObject(newObj);
        this.editor?.loadDocument(newObj);
    };
}
