import $ from 'jquery';

import DB from './db.js';
import Network from './net.js';

import '/css/index.css';

import Editor from "./editor.js";
import SideBar from "./sidebar.js";
import '/css/sidebar.css';


class App {
    constructor() {
        this.channel = 'todo';

        this.db = new DB(this.channel);
        this.net = new Network(this.channel, this.db);

        this.sharedDocuments = new Set();

        this.ele = $('<div id="container">').append(`           
            <div id="sidebar"></div>
            <div id="main-view"></div>            
        `);

        this.editor = new Editor(this.ele.find('#main-view'), this.db, this.awareness.bind(this), this);
        this.sidebar = new SideBar(this);
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }
}


//MAIN
$('body').append(new App().ele);
