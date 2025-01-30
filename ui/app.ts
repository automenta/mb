import $ from 'jquery';
import { io, Socket } from 'socket.io-client';
import DB from '../core/db';
import Matching from '../core/match';
import Network from '../core/net';
import { getStore, Store } from './store';
import { Awareness } from 'y-protocols/awareness';
import ViewManager from './view-manager';
import { SchemaRegistry } from "../core/schema-registry";
import MeView from "./me.view";
import DBView from './db.view';
import NetView from './net.view';
import MatchView from "./match.view";
//import {SettingsView} from "./settings.view";

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

        this.render();
        this.viewManager.registerViews();
        console.log('App initialized', this);
    }

    public render(): void {
        this.ele.innerHTML = `
            <div class="container">
                <div class="sidebar">
                    <div class="logo">Logo</div>
                    <ul class="menubar">
                        <li id="db-view-link" class="active">Database</li>
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
        `;
        this.setupViewSwitching();
    }

    private setupViewSwitching(): void {
        $('#db-view-link').on('click', () => this.showView('db-view'));
        $('#net-view-link').on('click', () => this.showView('net-view'));
        $('#match-view-link').on('click', () => this.showView('match-view'));
        $('#profile-view-link').on('click', () => this.showView('profile-view'));
        $('#settings-view-link').on('click', () => this.showView('settings-view'));
    }

    private showView(viewId: string): void {
        $('.main-view > div').hide(); // Hide all views
        $(`#${viewId}`).show(); // Show the selected view

        // Initialize views if they haven't been already
        switch (viewId) {
            case 'db-view':
                new DBView($('#db-view')[0], this.db).render();
                break;
            case 'net-view':
                new NetView($('#net-view'), this.net).render();
                break;
            case 'match-view':
                new MatchView($('#match-view'), this.match).render();
                break;
            case 'profile-view':
                new MeView($('#profile-view'), /*TODO*/null, /*TODO*/null, this.db).render();
                break;
            // case 'settings-view':
            //     new SettingsView($('#settings-view'), this.store).render();
            //     break;
        }
    }

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
