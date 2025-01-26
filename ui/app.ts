import DB from '../src/db';
import Network from '../src/net';
import Matching from '../src/match';
import { $, Y, Awareness, NObject, type AppState } from './imports';
import Sidebar from './sidebar';
import Editor from './editor/editor';
import { store, initializeStore } from './store';
import { EditorConfig, UserInfo } from './types';
import { io, Socket } from 'socket.io-client';
import '../ui/css/app.css';

const initializeComponent = (component: any, ...args: any[]): void => {
    if (component === null) {
        throw new Error(`Component not initialized`);
    }
    component.apply(null, args);
};

export default class App {
    private readonly channel: string;
    private socket: Socket;
    db: DB | null = null;
    net: Network | null = null;
    match: Matching | null = null;
    editor: Editor | null = null;
    sidebar: Sidebar | null = null;
    isDarkMode: boolean;
    private _userID: string;
    public store: ReturnType<typeof initializeStore>;
    public ele: HTMLElement;

    constructor(userID: string, channel: string) {
        this._userID = userID;
        this.channel = channel;
        this.isDarkMode = localStorage.getItem('themePreference') === 'dark';
        this.ele = document.createElement('div');
        this.socket = io();
        this.initializeDB(userID);
        this.store = initializeStore(this.db!);
        store.subscribe(state => this.handleStoreUpdate(state));

        if (!userID || !channel)
            throw new Error('Invalid user ID or channel ID');
    }

    private setNetworkStatus(status: boolean): void {
        store.setNetworkStatus(status ? 'connected' : 'disconnected');
    }

    private initializeDB(userID: string): void {
        this.db = new DB(userID);
        this.store = initializeStore(this.db);
    }

    private initializeNetwork(): void {
        this.net = new Network(this.channel, this.db!);
        store.setCurrentUser(this.net.user());
    }

    private initializeMatching(): void {
        this.match = new Matching(this.db!, this.net!);
    }

    private initializeEditor(): void {
        const mainView = document.createElement('div');
        mainView.className = 'main-view';
        this.ele.appendChild(mainView);
        this.editor = new Editor({
            ele: mainView as HTMLElement,
            db: this.db!,
            getAwareness: this.net!.awareness.bind(this.net),
            app: this,
            networkStatusCallback: this.setNetworkStatus.bind(this),
            isReadOnly: this.isReadOnlyDocument(),
            ydoc: this.db!.doc,
        });
    }

    private initializeSidebar(): void {
        this.sidebar = new Sidebar(this.db!, this);
        this.ele.prepend(this.sidebar.ele[0]);
    }

    private initializeSocket(): void {
        this.setupSocketListeners(this.socket);
    }

    private loadUserProfile(): void {
        const storedProfile = this.db?.config.getUserProfile();
        storedProfile && this.net?.awareness().setLocalStateField('user', storedProfile);
    }

    private setupSocketListeners(socket: Socket): void {
        if (!socket) return;

        socket.on('connect', () => {
            this.handleSocketEvent('connect', 'connected');
            this.setNetworkStatus(true);
        });
        socket.on('disconnect', () => {
            this.handleSocketEvent('disconnect', 'disconnected');
            this.setNetworkStatus(false);
        });
        socket.on('snapshot', (snap: any) => this.handleSocketEvent('snapshot', 'connected', snap));
        socket.on('plugin-status', (plugins: any) => {
            this.handleSocketPluginStatus(plugins);
            store.updatePluginStatus(plugins);
        });
        socket.on('plugin-error', (pluginName: string, error: any) => {
            this.handleSocketPluginError(pluginName, error);
            store.logError({ pluginName, error, timestamp: Date.now() });
        });
        socket.on('error', (err: any) => {
            console.error('Socket error:', err);
            store.logError({ pluginName: 'socket.io', error: err, timestamp: Date.now() });
        });
    }

    private handleSocketMessage(type: 'event' | 'plugin-status' | 'plugin-error', event: string, status: 'connected' | 'disconnected' | null, data?: any, pluginName?: string, error?: any): void {
        switch (type) {
            case 'event':
                console.log(`Socket ${event}:`, data);
                this.setNetworkStatus(status === 'connected');
                if (event === 'snapshot' && data) {
                    this.editor?.loadSnapshot(data);
                }
                break;
            case 'plugin-status':
                console.log('Plugin status:', data);
                store.updatePluginStatus(data);
                break;
            case 'plugin-error':
                const pluginNameStr = pluginName || 'unknown-plugin';
                console.error(`Plugin ${pluginNameStr} error:`, error);
                store.logError({ pluginName: pluginNameStr, error, timestamp: Date.now() });
                break;
        }
    }

    private handleSocketEvent(event: 'connect' | 'disconnect' | 'snapshot', status: 'connected' | 'disconnected', data?: any): void {
        this.handleSocketMessage('event', event, status, data);
    }

    private handleSocketPluginStatus(plugins: any): void {
        this.handleSocketMessage('plugin-status', '', null, plugins);
    }

    private handleSocketPluginError(pluginName: string, error: any): void {
        this.handleSocketMessage('plugin-error', '', null, null, pluginName, error);
    }

    private handleStoreUpdate(state: AppState): void {
        state.currentObject && this.editor?.loadDocument(state.currentObject);
        this.showConnectionWarning(state.networkStatus === 'disconnected');
        this.showErrors(state.errors);
        this.showPluginStatus(state.pluginStatus);
    }

    private showErrors(errors: Array<{ pluginName: string; error: any; timestamp: number }>): void {
        const errorContainer = document.getElementById('error-container');
        const errorList = document.getElementById('error-list');
        if (errorContainer && errorList) {
            errorList.innerHTML = '';
            errors.length > 0 ? errors.forEach(error => {
                const errorItem = document.createElement('li');
                errorItem.textContent = `${error.pluginName}: ${error.error}`;
                errorList.appendChild(errorItem);
            }) : null;
            errorContainer.style.display = errors.length > 0 ? 'block' : 'none';
        }
    }

    private showPluginStatus(plugins: Record<string, boolean>): void {
        const pluginStatusContainer = document.getElementById('plugin-status-container');
        const pluginStatusList = document.getElementById('plugin-status-list');
        pluginStatusContainer && pluginStatusList && (pluginStatusList.innerHTML = '', Object.entries(plugins).forEach(([pluginName, status]) => {
            const statusIcon = status ? '🟢' : '🔴';
            const pluginItem = document.createElement('li');
            pluginItem.textContent = `${pluginName}: ${statusIcon}`;
            pluginStatusList.appendChild(pluginItem);
        }), pluginStatusContainer.style.display = 'block');
    }

    private showConnectionWarning(show: boolean): void {
        const warningDiv = document.getElementById('connection-warning');
        warningDiv && (warningDiv.style.display = show ? 'block' : 'none');
    }

    user(): UserInfo {
        return this.net?.user() ?? { userId: '', name: '', color: '' };
    }

    awareness(): Awareness {
        return this.net?.awareness() ?? new Awareness(new Y.Doc());
    }

    toggleDarkMode(): void {
        this.isDarkMode = !this.isDarkMode;
        this.ele.classList.toggle('light-mode', !this.isDarkMode);
        this.ele.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
        localStorage.setItem('themePreference', this.isDarkMode ? 'dark' : 'light');
    }

    mount(container: HTMLElement | null): void {
        const savedTheme = localStorage.getItem('themePreference') || 'dark';
        this.ele.className = `container ${savedTheme === 'dark' ? 'dark-mode' : ''}`;
        this.ele.setAttribute('data-theme', savedTheme);
        container?.appendChild(this.ele);
        this.initializeDB(this._userID);
        this.initializeNetwork();
        this.initializeMatching();
        this.loadUserProfile();
        this.initializeEditor();
        this.initializeSidebar();
        this.store = initializeStore(this.db!);
        this.initializeSocket();
    }

    private isReadOnlyDocument(): boolean {
        const currentObject = this.store.getState().currentObject;
        const author = currentObject instanceof Y.Map ? (currentObject as Y.Map<any>).get('author') : currentObject instanceof NObject ? currentObject.author : undefined;
        return !currentObject || !this.net?.user().userId || author !== this.net?.user().userId;
    }
}