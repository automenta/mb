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
import AgentsView from './agents.view';
import DBView from './db.view';
import FriendsView from './friends.view';
import MeView from './me.view';
import NetView from './net.view';
import MatchingView from './match.view';

// Abstract Base Class for Components
abstract class Component<T extends HTMLElement = HTMLElement> {
    abstract mount(parent: JQuery<HTMLElement>): void; }

// Theme Management Class
class ThemeManager {
    isDarkMode: boolean;
    appElement: HTMLElement;

    constructor(appElement: HTMLElement) {
        this.appElement = appElement;
        this.isDarkMode = localStorage.getItem('themePreference') === 'dark';
        this.applyTheme();
    }

    toggleTheme(): void {
        this.isDarkMode = !this.isDarkMode;
        this.applyTheme();
        localStorage.setItem('themePreference', this.isDarkMode ? 'dark' : 'light');
    }

    private applyTheme(): void {
        this.appElement.classList.toggle('light-mode', !this.isDarkMode);
        this.appElement.setAttribute('data-theme', this.isDarkMode ? 'dark' : 'light');
    }

    get currentTheme(): 'dark' | 'light' {
        return this.isDarkMode ? 'dark' : 'light';
    }
}


export default class App extends Component {
    private readonly channel: string;
    private socket: Socket;
    db: DB | null = null;
    net: Network | null = null;
    match: Matching | null = null;
    editor: Editor | null = null;
    sidebar: Sidebar | null = null;
    public store: ReturnType<typeof initializeStore>;
    public ele: HTMLElement;
    private themeManager: ThemeManager = new ThemeManager(this.ele);
    private components: Component[] = []; // Component registry


    constructor(userID: string, channel: string) {
        super();
        this._userID = userID;
        this.channel = channel;
        this.ele = document.createElement('div');
        this.themeManager = new ThemeManager(this.ele);
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

    private _userID: string;

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
        if (this.match) console.log('Matching initialized'); // Conditional logging
    }

    private initializeViews(): void {
        const mainView = $('.main-view');

        this.sidebar = new Sidebar(this.db!, this);
        this.editor = this.createEditor(mainView[0]);

        this.components = [
            this.sidebar,
            this.editor,
            ...(this.db ? [ // Conditionally include DB related views
                new MeView(mainView, this.user.bind(this), this.awareness.bind(this), this.db),
                new DBView(mainView[0], this.db),
                new AgentsView(mainView),
            ] : []),
            new FriendsView(mainView, this.awareness.bind(this)),
            new NetView(mainView, this.net),
            ...(this.match ? [ // Conditionally include Matching view
                new MatchingView(mainView, this.match)
            ] : [])
        ];

        this.ele.prepend(this.sidebar.ele[0]); // Ensure sidebar is always prepended
    }

    private createEditor(mainView: HTMLElement): Editor {
        if (!this.db || !this.net) throw new Error("DB or Net not initialized yet");
        return new Editor({
            ele: mainView as HTMLElement,
            db: this.db,
            getAwareness: this.net.awareness.bind(this.net),
            app: this,
            networkStatusCallback: this.setNetworkStatus.bind(this),
            isReadOnly: this.isReadOnlyDocument(),
            ydoc: this.db.doc,
        }
    }
    private initializeSocket(): void {
        this.setupSocketListeners(this.socket);
    }

    private loadUserProfile(): void {
        const storedProfile = this.db?.config.getUserProfile();
        storedProfile && this.net?.awareness().setLocalStateField('user', storedProfile);
    }

    private themeManager: ThemeManager = new ThemeManager(this.ele);
    get theme() {
    }

    private handleSocketMessage(event: string, data?: any): void {
        const handlers: Record<string, ( any) => void> = {
            'connect': () => { console.log('Socket connected'); this.setNetworkStatus(true); },
            'disconnect': () => { console.log('Socket disconnected'); this.setNetworkStatus(false); },
            'snapshot': (data) => { console.log('Socket snapshot:', data); this.editor?.loadSnapshot(data); },
            'plugin-status': (data) => { console.log('Plugin status:', data); store.updatePluginStatus(data); },
            'plugin-error': (data) => { console.error('Plugin error:', data); store.logError(data); },
            'default': (event, data) => console.log('Socket event:', event, data),
        };

        const handler = handlers[event] || (( any) => handlers.default(event, data)); // Default handler
        handler(data);
    }
    private setupSocketListeners(socket: Socket): void {
        if (!socket) return;
        socket.onAny((event, ...args) => this.handleSocketMessage(event, ...args));
    }

    private updateUIState(state: AppState): void {
        this.showConnectionWarning(state.networkStatus === 'disconnected');
        this.showErrors(state.errors);
        this.showPluginStatus(state.pluginStatus);
    }

    private handleStoreUpdate(state: AppState): void {
        state.currentObject && this.editor?.loadDocument(state.currentObject);
        this.updateUIState(state);
    }

    private showErrors(errors: Array<{ pluginName: string; error: any; timestamp: number }>): void {
        this.updateVisibility('error-container', errors.length > 0);
        const errorList = document.getElementById('error-list');
        if (!errorList) return;
        errorList.innerHTML = ''; // Clear existing errors
        errors.forEach(error => {
            const errorItem = document.createElement('li');
            errorItem.textContent = `${error.pluginName}: ${error.error}`;
            errorList.appendChild(errorItem);
        });
    }

    private showPluginStatus(plugins: Record<string, boolean>): void {
        this.updateVisibility('plugin-status-container', Object.keys(plugins).length > 0);
        const pluginStatusList = document.getElementById('plugin-status-list');
        pluginStatusList && (pluginStatusList.innerHTML = '', Object.entries(plugins).forEach(([pluginName, status]) => {
            const statusIcon = status ? '🟢' : '🔴';
            const pluginItem = document.createElement('li');
            pluginItem.textContent = `${pluginName}: ${statusIcon}`;
            pluginStatusList.appendChild(pluginItem);
        }));
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
        this.themeManager.toggleTheme();
    }

    mount(container: HTMLElement | null): void {
        this.ele.className = `container ${this.themeManager.currentTheme === 'dark' ? 'dark-mode' : ''}`;
        this.ele.setAttribute('data-theme', this.themeManager.currentTheme);
        container?.appendChild(this.ele);

        // Initialize and register components
        this.initializeDB(this._userID);
        this.initializeNetwork();
        this.initializeMatching();
        this.initializeViews();
        this.initializeSocket();
        this.store = initializeStore(this.db!);

        this.components.forEach(component => component.mount( $(this.ele) );
        this.loadUserProfile();
    }

    private isReadOnlyDocument(): boolean {
        const currentObject = this.store.getState().currentObject;
        const author = currentObject instanceof Y.Map ? (currentObject as Y.Map<any>).get('author') : currentObject instanceof NObject ? currentObject.author : undefined;
        return !currentObject || !this.net?.user().userId || author !== this.net?.user().userId;
    }
}
