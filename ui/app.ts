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
    private readonly channel: string;
    private socket: Socket;
    db: DB | null = null;
    net: Network | null = null;
    match: Matching | null = null;
    editor: Editor | null = null;
    sidebar: Sidebar | null = null;
    public store: ReturnType<typeof initializeStore>;
    public ele: HTMLElement;
    themeManager: ThemeManager; // Add ThemeManager instance

    constructor(channel: string, rootElement: HTMLElement) {
        this.channel = channel;
        this.ele = rootElement;
        this.store = initializeStore();
        this.themeManager = new ThemeManager(this.ele); // Initialize ThemeManager

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

        // Initialize UI components
        this.sidebar = new Sidebar(this, $('#sidebar')[0]);
        this.editor = new Editor(this, $('#editor')[0]);

        // Mount views
        new DBView($('#db-view')[0], this.db).render();
        new NetView($('#net-view'), this.net).render();
        new MatchView($('#match-view')[0], this.match).render();


        // Bind network to editor - after editor and network are initialized
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
