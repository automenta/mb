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

        socket.onAny((event, ...args) => this.handleSocketMessage(event, ...args));
    }

    private handleSocketMessage(event: string, data?: any): void {
        switch (event) {
            case 'connect':
                console.log('Socket connected');
                this.setNetworkStatus(true);
                break;
            case 'disconnect':
                console.log('Socket disconnected');
                this.setNetworkStatus(false);
                break;
            case 'snapshot':
                console.log('Socket snapshot:', data);
                this.editor?.loadSnapshot(data);
                break;
            case 'plugin-status':
                console.log('Plugin status:', data);
                store.updatePluginStatus(data);
                break;
            case 'plugin-error':
                console.error('Plugin error:', data);
                store.logError(data); // Assuming 'data' is { pluginName, error, timestamp }
                break;
            default:
                console.log('Socket event:', event, data);
        }
    }


    private handleStoreUpdate(state: AppState): void {
        state.currentObject && this.editor?.loadDocument(state.currentObject);
        this.showConnectionWarning(state.networkStatus === 'disconnected');
        this.showErrors(state.errors);
        this.showPluginStatus(state.pluginStatus);
    }

    private showErrors(errors: Array<{ pluginName: string; error: any; timestamp: number }>): void {
        this.updateVisibility('error-container', errors.length > 0);

        // No need to check again if errorContainer exists, as updateVisibility handles it
        const errorContainer = document.getElementById('error-container')!;
        const errorList = document.getElementById('error-list');
        if (errorContainer && errorList) {
            errorList.innerHTML = '';
            errors.length > 0 && errors.forEach(error => {
                const errorItem = document.createElement('li');
                errorItem.textContent = `${error.pluginName}: ${error.error}`;
                errorList.appendChild(errorItem);
            });
        }
    }

    private showPluginStatus(plugins: Record<string, boolean>): void {
        this.updateVisibility('plugin-status-container', Object.keys(plugins).length > 0);

        // No need to check again if pluginStatusContainer exists, updateVisibility handles it
        const pluginStatusContainer = document.getElementById('plugin-status-container')!;
        const pluginStatusList = document.getElementById('plugin-status-list');
        pluginStatusContainer && pluginStatusList && (pluginStatusList.innerHTML = '', Object.entries(plugins).forEach(([pluginName, status]) => {
            const statusIcon = status ? '🟢' : '🔴';
            const pluginItem = document.createElement('li');
            pluginItem.textContent = `${pluginName}: ${statusIcon}`;
            pluginStatusList.appendChild(pluginItem);
        }));
        // }, pluginStatusContainer.style.display = 'block'); // Removed redundant style setting, visibility is handled above
    }

    private showConnectionWarning(show: boolean): void {
        this.updateVisibility('connection-warning', show);
    }

    private updateVisibility(elementId: string, visible: boolean): void {
        const element = document.getElementById(elementId);
        element && (element.style.display = visible ? 'block' : 'none');
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
