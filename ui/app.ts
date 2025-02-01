import $ from 'jquery';
import { io, Socket } from 'socket.io-client';
import { Editor } from './editor/editor';
import DB from '../core/db';
import Matching from '../core/match';
import Network from '../core/net';
import NObject from '../core/obj';
import { Awareness } from 'y-protocols/awareness';
import ViewManager from './view-manager';
import { Tags } from "../core/tags";
import MeView from "./me.view";
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import Sidebar from './sidebar';
import { SettingsView } from './settings.view';
import { randomUUID } from 'crypto';
import { Store, initializeStore, getStore } from './store';
import ViewManager from './view-manager';
import Editor from './editor/editor'; // Import Editor

class ThemeManager {
    isDarkMode: boolean;
    appElement: JQuery;

    constructor(appElement: HTMLElement) {
        this.appElement = appElement;
        this.isDarkMode = localStorage.getItem('themePreference') === 'dark';
        this.applyTheme();
    }

    applyTheme() {
        $(this.appElement).toggleClass('dark-mode', this.isDarkMode);
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('themePreference', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    }
}

export interface AppConfig {
    element: HTMLElement;
}
export default class App {
    public store: Store;
    public ele: JQuery;
    themes: ThemeManager;
    private views: ViewManager;
    public tags: Tags;
    private sidebar: Sidebar;
    public editor?: Editor; // Add Editor property

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
        this.sidebar = new Sidebar(this.views, this, $('.sidebar')[0]);
        this.editor = new Editor({ // Initialize Editor
            db: this.db, // Pass DB instance
            net: this.net,
            tags: this.tags,
            ele: $('.main-view')[0], // Pass main-view as editor container
            app: this,
            ydoc: this.db.doc,
            getAwareness: () => this.getAwareness()
        });
        this.views.showView('db'); // Show the DB view initially

        this.render();
        console.log('App initialized', this);

        const websocket = false; //TODO configure
        if (websocket)
            this.initWebSocket();
    }


    public render(): void {
        $(this.ele).html(`
            <div class="container">
                <aside class="sidebar"></aside>
                <main class="main-view"></main>
            </div>
        `);
    }

    getAwareness(): Awareness {
        return this.net!.net.awareness;
    }


    createNewObject(): void {
        const newObj = this.db.create();
        newObj.name = 'New Object';
        newObj.author = this.store.currentUser?.userId || 'Anonymous'; // Handle anonymous user
        newObj.public = false; // Ensure new objects are private by default
        newObj.isQuery = false; // Default to not being a query
        this.db.add(newObj);
        this.store.addObject(newObj);
        this.editor?.loadDocument(newObj);
    }
}
