import $ from 'jquery';
import { io, Socket } from 'socket.io-client';
import DB from '../src/db';
import Editor from './editor/editor';
import Sidebar from './sidebar';
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import Matching from '../src/matching';
import Network from '../src/net';
import { initializeStore } from './store';
import { Awareness } from 'y-protocols/awareness';
import ViewManager from './view-manager';

class ThemeManager {
    isDarkMode: boolean;
    appElement: HTMLElement;

    constructor(appElement: HTMLElement) {
        this.appElement = appElement;
        this.isDarkMode = localStorage.getItem('themePreference') === 'dark';
        this.applyTheme();
    }

    applyTheme() {
        if (!this.appElement) {
            console.warn("appElement is not defined in ThemeManager, cannot apply theme.");
            return;
        }
        if (this.isDarkMode) {
            this.appElement.classList.add('dark-mode');
        } else {
            this.appElement.classList.remove('dark-mode');
        }
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
    db: DB | null = null;
    net: Network | null = null; // Ensure net is typed as Network
    match: Matching | null = null;
    public store: ReturnType<typeof initializeStore>>;
    public ele: HTMLElement;
    themeManager: ThemeManager;
    private viewManager: ViewManager;

    constructor(channel: string, rootElement: HTMLElement) {
        this.channel = channel;
        this.ele = rootElement;
        this.store = initializeStore();
        this.themeManager = new ThemeManager(this.ele);

        this.viewManager = new ViewManager(this);
        this.viewManager.registerViews();

        this.socket = io(); // Initialize socket connection

        this.socket.on('connect_error', (err) => {
            console.error("Connection error:", err);
            this.store.getState().app.setNetworkStatus('error');
        });

        this.socket.on('connect', () => {
            console.log("Connected to WebSocket server");
            this.store.getState().app.setNetworkStatus('connected');
        });

        this.socket.on('disconnect', () => {
            console.log("Disconnected from WebSocket server");
            this.store.getState().app.setNetworkStatus('disconnected');
        });


        this.db = new DB(channel);
        this.net = new Network(channel, this.db);
        this.match = new Matching(this.db, this.net);




        // Bind network to editor - after editor and network are initialized - ensure this.net is not null
        if (this.net) {
            this.editor?.editorCore.bindNetwork(this.net);
        }


        // Handle theme toggle - example button click handler
        $('#theme-toggle-button').on('click', () => {
            this.themeManager.toggleTheme();
        });


        console.log('App initialized', this);
    }

    getAwareness(): Awareness {
        return this.net!.net.awareness;
    }

    async load(): Promise<void> {
        await this.db?.load();
        console.log('App data loaded', this.db);
    }

    getObject(id: string) {
        return this.db?.get(id);
    }
}
