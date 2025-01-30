import $ from 'jquery';
import {
  io,
  Socket
} from 'socket.io-client';
import DB from '../core/db';
import Matching from '../core/match';
import Network from '../core/net';
import {
    getStore, Store
} from './store';
import {
  Awareness
} from 'y-protocols/awareness';
import ViewManager from './view-manager';
import {SchemaRegistry} from "../core/schema-registry";

class ThemeManager {
    isDarkMode: boolean;
    appElement: HTMLElement;

    constructor(appElement: HTMLElement) {
        this.appElement = appElement;
        this.isDarkMode = localStorage.getItem('themePreference') === 'dark';
        this.applyTheme();
    }

    applyTheme() {
        if (this.isDarkMode) $(this.appElement).addClass('dark-mode'); else $(this.appElement).removeClass('dark-mode');
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem('themePreference', this.isDarkMode ? 'dark' : 'light');
        this.applyTheme();
    }
}


export default class App {
    readonly channel: string;
    private socket: Socket;
    db: DB;
    net: Network;
    match: Matching;
    public store: Store;
    public ele: HTMLElement;
    themeManager: ThemeManager;
    private viewManager: ViewManager;
    public schemaRegistry: SchemaRegistry;

    constructor(channel: string, rootElement: HTMLElement) {
        this.channel = channel;
        this.db = new DB(channel);
        this.net = new Network(channel, this.db);
        this.match = new Matching(this.db, this.net);

        this.ele = rootElement;
        this.store = getStore(this.db);
        this.themeManager = new ThemeManager(this.ele);
        this.schemaRegistry = new SchemaRegistry();

        this.viewManager = new ViewManager(this);
        this.viewManager.registerViews();

        this.socket = io(); // Initialize socket connection

        this.socket.on('connect_error', (err) => {
            console.error("Connection error:", err);
            this.store.setNetworkStatus('error');
        });

        this.socket.on('connect', () => {
            console.log("Connected to WebSocket server");
            this.store.setNetworkStatus('connected');
        });

        this.socket.on('disconnect', () => {
            console.log("Disconnected from WebSocket server");
            this.store.setNetworkStatus('disconnected');
        });

        $('#theme-toggle-button').on('click', () => {
            this.themeManager.toggleTheme();
        });

        console.log('App initialized', this);
    }

    getAwareness(): Awareness {
        return this.net!.net.awareness;
    }

    getObject(id: string) {
        return this.db?.get(id);
    }
}
