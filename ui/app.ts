import $ from 'jquery';
import { io, Socket } from 'socket.io-client';
import { Editor } from './editor/editor';
import DB from '../core/db';
import Matching from '../core/match';
import Network from '../core/net';
import NObject from '../core/obj';
import { Awareness } from 'y-protocols/awareness';
import ViewManager from './view-manager';
import { Tags } from "../core/tags";
import MeView from "./me.view";
import DBView from './db.view';
import NetView from './net.view';
import MatchView from './match.view';
import Sidebar from './sidebar';
import { SettingsView } from './settings.view';
import { randomUUID } from 'crypto';

class ThemeManager {
    isDarkMode: boolean;
    appElement: JQuery;

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

    public store: Store;
    public ele: JQuery;
    themes: ThemeManager;
    private views: ViewManager;
    public tags: Tags;
    private sidebar: Sidebar; // Add Sidebar instance

    constructor(channel: string, rootElement: HTMLElement) {
        this.channel = channel;
        this.db = new DB(channel);
        this.net = new Network(channel, this.db);
        this.match = new Matching(this.db, this.net);

        this.ele = $(rootElement);
        this.store = getStore(this.db);
        this.themes = new ThemeManager(this.ele);
        this.tags = new Tags();

    getSelectedObject(): any | null {
        return this.store.currentObject;
    }

        this.views = new ViewManager(this, this.store); // Initialize ViewManager
        this.sidebar = new Sidebar(this, $('.sidebar')[0]); // Initialize Sidebar and pass ViewManager
        this.views.showView('db-view'); // Show initial view

        this.render();
        console.log('App initialized', this);

        const websocket = false; //TODO configure
        if (websocket)
            this.initWebSocket();
    }


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
        //this.setup মেনুNavigation(); // No longer needed here, handled by Sidebar
    }

    //private setup মেনুNavigation(): void { // No longer needed here, handled by Sidebar
    //    $('#db-view-link').on('click', () => this.views.showView('db-view'));
    //    $('#net-view-link').on('click', () => this.views.showView('net-view'));
    //    $('#match-view-link').on('click', () => this.views.showView('match-view'));
    //    $('#profile-view-link').on('click', () => this.views.showView('profile-view'));
    //    $('#settings-view-link').on('click', () => this.views.showView('settings-view'));
    //}

    getAwareness(): Awareness {
        return this.net!.net.awareness;
    }


    createNewObject(): void {
        const newObj = new NObject(this.db.doc);
        newObj.name = 'New Object';
        newObj.author = this.store.currentUser?.userId || '';
        this.db.add(newObj);
        this.store.addObject(newObj);
    }
}
