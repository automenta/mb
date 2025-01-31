import $ from 'jquery';
import { io, Socket } from 'socket.io-client';
import { Editor } from './editor/editor';
import DB from '../core/db';
import Matching from '../core/match';
import Network from '../core/net';
import { getStore, Store } from './store';
import { Awareness } from 'y-protocols/awareness';
import ViewManager from './view-manager';
import { Tags } from "../core/tags";
import MeView from "./me.view";
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import { SettingsView } from './settings.view';
import { randomUUID } from 'crypto';

class ThemeManager {
    isDarkMode: boolean;
    appElement: HTMLElement;

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

export default class App {
    readonly channel: string;
    private socket: Socket;
    db: DB;
    net: Network;
    match: Matching;
    public store: Store;
    public ele: HTMLElement;
    themes: ThemeManager;
    private views: ViewManager;
    public tags: Tags;

    constructor(channel: string, rootElement: HTMLElement) {
        this.channel = channel;
        this.db = new DB(channel);
        this.net = new Network(channel, this.db);
        this.match = new Matching(this.db, this.net);

        this.ele = $(rootElement);
        this.store = getStore(this.db);
        this.themes = new ThemeManager(this.ele);
        this.tags = new Tags();

        this.views = new ViewManager(this, this.store); // Initialize ViewManager
        this.views.showView('db-view'); // Show initial view


        this.render();
        console.log('App initialized', this);

        const websocket = false; //TODO configure
        if (websocket)
            this.initWebSocket();
    }

    private initWebSocket() {
        this.socket = io(); // Initialize socket connection
        this.socket.on('connect_error', (err) => {
            //console.error("Connection error:", err);
            this.store.setNetworkStatus('error');
        });

        this.socket.on('connect', () => {
            //console.log("Connected to WebSocket server");
            this.store.setNetworkStatus('connected');
        });

        this.socket.on('disconnect', () => {
            //console.log("Disconnected from WebSocket server");
            this.store.setNetworkStatus('disconnected');
        });
    }

    public render(): void {
        $(this.ele).html(`
            <div class="container">
                <div class="sidebar">
                    <div class="logo">Logo</div>
                    <ul class="menubar">
                        <li id="db-view-link">Database</li>
                        <li id="net-view-link">Network</li>
                        <li id="match-view-link">Matching</li>
                        <li id="profile-view-link">Profile</li>
                        <li id="settings-view-link">Settings</li>
                    </ul>
                </div>
                <div class="main-view">
                    <div id="db-view"></div>
                    <div id="net-view" style="display: none;"></div>
                    <div id="match-view" style="display: none;"></div>
                    <div id="profile-view" style="display: none;"></div>
                    <div id="settings-view" style="display: none;"></div>
                </div>
            </div>
        `);
    getAwareness(): Awareness {
        return this.net!.net.awareness;
    }

    mount(ele: HTMLElement) {
        $(ele).append(this.ele);
    }

    getObject(id: string): any {
        return this.db?.get(id);
    }
}
