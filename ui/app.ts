import DB from '../src/db';
import Network from '../src/net';
import Matching from "../src/match.js";
import { $ } from './imports';
import { store, initializeStore, type AppState } from './store';
import Sidebar from './sidebar';
import Editor from "./editor/editor";
import { EditorConfig } from './types';
import { io, Socket } from "socket.io-client";
import '/ui/css/app.css';

export default class App {
    private readonly channel: string;
    private socket: Socket;

    db: DB;
    net: Network;
    match: Matching;
    editor: Editor;
    sidebar: Sidebar;

    public ele: JQuery;

    constructor(userID: string, channel: string) {
        this.channel = channel;
        this.ele = $('<div>').addClass('container dark-mode');

        this.initializeApp(userID);
        store.subscribe(state => this.handleStoreUpdate(state));
    }

    private setNetworkStatus(status: 'connected' | 'disconnected') {
        store.setNetworkStatus(status);
    }

    private initializeDB(userID: string) {
        this.db = new DB(userID);
    }

    private initializeNetwork() {
        this.net = new Network(this.channel, this.db);
        store.setCurrentUser(this.net.user());
    }

    private initializeMatching() {
        this.match = new Matching(this.db, this.net);
    }

    private initializeStore() {
        initializeStore(this.db);
    }

    private initializeEditor() {
        const mainView = $('<div class="main-view"></div>');
        this.ele.append(mainView);
        this.editor = new Editor({
            ele: mainView,
            db: this.db,
            getAwareness: this.net.awareness.bind(this.net),
            app: this,
            networkStatusCallback: this.setNetworkStatus.bind(this)
        } as EditorConfig);
    }

    private initializeSidebar() {
        this.sidebar = new Sidebar(this.db, this);
        this.ele.prepend(this.sidebar.ele);
    }

    private initializeSocket() {
        this.setupSocket();
    }

    private initializeApp(userID: string) {
        this.initializeDB(userID);
        this.initializeNetwork();
        this.initializeMatching();
        this.initializeStore();
        this.initializeEditor();
        this.initializeSidebar();
        this.setNetworkStatus('connected');
        this.initializeSocket();
    }

    private setupSocket() {
        this.socket = io();
        this.setupSocketListeners(this.socket);
    }

    private setupSocketListeners(socket: Socket) {
        socket.on('connect', () => this.handleSocketEvent('connect', 'connected'));
        socket.on('disconnect', () => this.handleSocketEvent('disconnect', 'disconnected'));
        socket.on('snapshot', (snap: any) => this.handleSocketEvent('snapshot', 'connected', snap));
        socket.on('plugin-status', (plugins: any) => this.handleSocketPluginStatus(plugins));
        socket.on('plugin-error', (pluginName: string, error: any) => this.handleSocketPluginError(pluginName, error));
    }

    private handleSocketEvent(event: 'connect' | 'disconnect' | 'snapshot', status: 'connected' | 'disconnected', data?: any) {
        console.log(`Socket ${event}:`, data);
        this.setNetworkStatus(status);
        if (event === 'snapshot' && data) {
            this.editor.loadSnapshot(data);
        }
    }

    private handleSocketPluginStatus(plugins: any) {
        console.log('Plugin status:', plugins);
        store.updatePluginStatus(plugins);
    }

    private handleSocketPluginError(pluginName: string, error: any) {
        console.error(`Plugin ${pluginName} error:`, error);
        store.logError({ pluginName, error, timestamp: Date.now() });
    }

    private handleStoreUpdate(state: AppState) {
        if (state.networkStatus === 'disconnected') {
            this.showConnectionWarning();
        }
        if (state.errors.length > 0) {
            this.showErrors(state.errors);
        }
        if (Object.keys(state.pluginStatus).length > 0) {
            this.showPluginStatus(state.pluginStatus);
        }
    }

    private showErrors(errors: Array<{ pluginName: string; error: any; timestamp: number }>) {
        // Implement error display UI
    }

    private showPluginStatus(plugins: Record<string, boolean>) {
        // Implement plugin status display UI
    }

    private showConnectionWarning() {
        // Implement connection warning UI
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }

    toggleDarkMode(): void {
        this.ele.toggleClass('dark-mode');
    }
}