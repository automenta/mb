import DB from '../src/db';
import Network from '../src/net';
import Matching from "../src/match.js";
import { type AppState } from './imports';
import Sidebar from './sidebar';
import Editor from "./editor/editor";
import { store, initializeStore } from './store';
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
    isDarkMode: boolean;
    private _userID: string;
    public store: ReturnType<typeof initializeStore>; // Public store property
    public ele: HTMLElement; // Changed to HTMLElement

    constructor(userID: string, channel: string) {
        if (!userID) {
            throw new Error('Invalid user ID');
        }
        if (!channel) {
            throw new Error('Invalid channel ID');
        }

        this.channel = channel;

        // Initialize theme from localStorage or default to dark
        // Initialize theme from localStorage or default to dark
        const savedTheme = localStorage.getItem('themePreference') || 'dark';
        this.isDarkMode = savedTheme === 'dark';
        // this.store = initializeStore(this.db); // Initialize the store

        // this.initializeApp(userID); // Removed from constructor
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
        // initializeStore(this.db); // REMOVE THIS LINE - store is initialized in constructor - redundant call
    }

    private initializeEditor() {
        const mainView = document.createElement('div');
        mainView.className = 'main-view';
        this.ele.appendChild(mainView);
        // console.log('App.initializeEditor: mainView created:', mainView); // Add log
        // console.log('App.initializeEditor: this.ele:', this.ele); // Add log
        this.editor = new Editor({
            ele: mainView as HTMLElement,
            db: this.db,
            getAwareness: this.net.awareness.bind(this.net),
            app: this,
            networkStatusCallback: this.setNetworkStatus.bind(this),
            ydoc: this.db.doc,
        } as EditorConfig);
        // console.log('App.initializeEditor: Editor initialized:', this.editor); // Add log
    }

    private initializeSidebar() {
        this.sidebar = new Sidebar(this.db, this);
        this.ele.prepend(this.sidebar.ele[0]);
    }

    private initializeSocket() {
        this.setupSocket();
    }

    private initializeApp(userID: string) {
        this.initializeSocket();
        this.initializeDB(userID);
        this.initializeNetwork();
        this.initializeMatching();
        this.loadUserProfile(); // Load user profile from db.config
        this.store = initializeStore(this.db); // Initialize the store
        this.initializeEditor();
        this.initializeSidebar();
    }

    private loadUserProfile() {
       const storedProfile = this.db.config.get('userProfile');
       if (storedProfile) {
           this.net.awareness().setLocalStateField('user', storedProfile);
       }
   }

    private setupSocket() {
        this.setupSocket();
        this.setupSocketListeners(this.socket);
    }
    
    private setupSocketListeners(socket: Socket) {
        // Ensure proper network status updates
        socket.on('connect', () => {
            this.handleSocketEvent('connect', 'connected');
            store.setNetworkStatus('connected');
        });
        socket.on('disconnect', () => {
            this.handleSocketEvent('disconnect', 'disconnected');
            store.setNetworkStatus('disconnected');
        });
        socket.on('snapshot', (snap: any) => this.handleSocketEvent('snapshot', 'connected', snap));
        // Ensure plugin events are properly handled
        socket.on('plugin-status', (plugins: any) => {
            this.handleSocketPluginStatus(plugins);
            store.updatePluginStatus(plugins);
        });
        socket.on('plugin-error', (pluginName: string, error: any) => {
            this.handleSocketPluginError(pluginName, error);
            store.logError({
                pluginName,
                error,
                timestamp: Date.now()
            });
        });
        // Add listener for 'error' event to handle connection issues
        socket.on('error', (err: any) => {
            console.error('Socket error:', err);
            store.logError({
                pluginName: 'socket.io',
                error: err,
                timestamp: Date.now()
            });
        });
    }

    private handleSocketMessage(type: 'event' | 'plugin-status' | 'plugin-error', event: string, status: 'connected' | 'disconnected' | null, data?: any, pluginName?: string, error?: any) {
        if (type === 'event') {
            console.log(`Socket ${event}:`, data);
            if (status) this.setNetworkStatus(status);
            if (event === 'snapshot' && data) {
                this.editor.loadSnapshot(data);
            }
        } else if (type === 'plugin-status') {
            console.log('Plugin status:', data);
            store.updatePluginStatus(data);
        } else if (type === 'plugin-error') {
            console.error(`Plugin ${pluginName} error:`, error);
            store.logError({ pluginName, error, timestamp: Date.now() });
        }
    }

    private handleSocketEvent(event: 'connect' | 'disconnect' | 'snapshot', status: 'connected' | 'disconnected', data?: any) {
        this.handleSocketMessage('event', event, status, data);
    }

    private handleSocketPluginStatus(plugins: any) {
        this.handleSocketMessage('plugin-status', '', null, plugins);
    }

    private handleSocketPluginError(pluginName: string, error: any) {
        this.handleSocketMessage('plugin-error', '', null, null, pluginName, error);
    }

    private handleStoreUpdate(state: AppState) {
        if (state.networkStatus === 'disconnected') {
            this.showConnectionWarning(true); // Show warning when disconnected
        } else {
            this.showConnectionWarning(false); // Hide warning when connected
        }
        if (state.errors.length > 0) {
            this.showErrors(state.errors); // Show errors if any
        } else {
            this.showErrors([]); // Hide error container if no errors
        }
        if (Object.keys(state.pluginStatus).length > 0) {
            this.showPluginStatus(state.pluginStatus); // Show plugin status if any
        } else {
            this.showPluginStatus({}); // Hide plugin status container if no plugin statuses
        }
    }

    private showErrors(errors: Array<{ pluginName: string; error: any; timestamp: number }>) {
        const errorContainer = document.getElementById('error-container');
        const errorList = document.getElementById('error-list');
        if (errorContainer && errorList) {
            if (errors.length > 0) {
                errorList.innerHTML = ''; // Clear previous errors
                errors.forEach(error => {
                    const errorItem = document.createElement('li');
                    errorItem.textContent = `${error.pluginName}: ${error.error}`;
                    errorList.appendChild(errorItem);
                });
                errorContainer.style.display = 'block'; // Show error container
            } else {
                errorContainer.style.display = 'none'; // Hide error container if no errors
            }
        }
    }

    private showPluginStatus(plugins: Record<string, boolean>) {
        const pluginStatusContainer = document.getElementById('plugin-status-container');
        const pluginStatusList = document.getElementById('plugin-status-list');
        if (pluginStatusContainer && pluginStatusList) {
            pluginStatusList.innerHTML = ''; // Clear previous statuses
            for (const pluginName in plugins) {
                const status = plugins[pluginName] ? '🟢' : '🔴';
                const pluginItem = document.createElement('li');
                pluginItem.textContent = `${pluginName}: ${status}`;
                pluginStatusList.appendChild(pluginItem);
            }
            pluginStatusContainer.style.display = 'block'; // Show plugin status container
        }
    }

    private showConnectionWarning(show: boolean) {
        const warningDiv = document.getElementById('connection-warning');
        if (warningDiv) {
            warningDiv.style.display = show ? 'block' : 'none'; // Show/hide warning
        }
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        this.ele.classList.toggle('dark-mode', this.isDarkMode);
        this.ele.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
        localStorage.setItem('themePreference', this.isDarkMode ? 'dark' : 'light');
    }

    mount(container: HTMLElement | null): void {
        const savedTheme = localStorage.getItem('themePreference') || 'dark';
        this.ele = document.createElement('div');
        this.ele.className = `container ${savedTheme === 'dark' ? 'dark-mode' : ''}`;
        this.ele.setAttribute('data-theme', savedTheme);
        if (container) {
            container.appendChild(this.ele);
        }
        this.initializeApp(this._userID);
    }
}