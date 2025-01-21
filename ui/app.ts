import $ from 'jquery';
import DB from '../src/db';
import Network from '../src/net';
import SideBar from './sidebar';
import Editor from "./editor";
import Matching from "../src/match.js";
import {io} from "socket.io-client";

import '/ui/css/app.css';

export default class App {
    private readonly channel: string;

    readonly db: DB;
    readonly net: Network;
    readonly match: Matching;
    readonly editor: Editor;
    private socket: any; // Socket.IO client

    public ele: JQuery;

    constructor(userID:string, channel:string) {
        this.channel = channel;

        this.db = new DB(userID);
        this.net = new Network(this.channel, this.db);

        this.match = new Matching(this.db, this.net);

        this.ele = $('<div>').addClass('container');

        const mainView = $('<div class="main-view"></div>');
        this.ele.append(mainView);

        this.editor = new Editor(mainView, this.db, this.net.awareness.bind(this.net), this);

        this.ele.prepend(new SideBar(this).ele); //HACK add last

        // Socket.IO connection
        this.socket = io();
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        this.socket.on('snapshot', (snap) => {
            console.log('Received snapshot:', snap);
            // Process snapshot data (e.g., display it)
        });
        this.socket.on('plugin-status', (plugins) => {
            console.log('Plugin status:', plugins);
            // Update UI to reflect plugin status
        });
        this.socket.on('plugin-error', (pluginName, error) => {
            console.error(`Plugin ${pluginName} error:`, error);
            // Display error message to the user
        });
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }

    toggleDarkMode(): void {
        this.ele.toggleClass('dark-mode');
    }
}
