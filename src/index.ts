import $ from 'jquery';

import DB from './db';
import Network from './net';
import SideBar from './sidebar';

import '/css/index.css';

import Editor from "./editor";
import Matching from "./match.js";



export default class App {
    private readonly channel: string;

    readonly db: DB;
    readonly net: Network;
    readonly match: Matching;
    readonly editor: Editor;

    public ele: JQuery;

    constructor() {
        this.channel = 'todo';

        this.db = new DB(this.channel);
        this.net = new Network(this.channel, this.db);

        this.match = new Matching(this.db, this.net);

        this.ele = $('<div id="container">').append(`           
            <div id="sidebar"></div>
            <div id="main-view"></div>            
        `);

        this.editor = new Editor(this.ele.find('#main-view'), this.db, this.awareness.bind(this), this);
        const sidebar = new SideBar(this);
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }
}


//MAIN
$('body').append(new App().ele);
