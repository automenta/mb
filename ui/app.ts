import $ from 'jquery';
import DB from '../src/db';
import Network from '../src/net';
import SideBar from './sidebar';
import Editor from "./editor";
import Matching from "../src/match.js";

import '/ui/css/app.css';
import {IndexeddbPersistence} from "y-indexeddb";

export default class App {
    private readonly channel: string;

    readonly db: DB;
    readonly net: Network;
    readonly match: Matching;
    readonly editor: Editor;

    public ele: JQuery;

    constructor(userID:string, channel:string) {
        this.channel = channel;

        this.db = new DB(userID);
        this.net = new Network(this.channel, this.db);

        this.match = new Matching(this.db, this.net);

        this.ele = $('<div>').addClass('container');

        const mainView = $('<div class="main-view"></div>');
        this.ele.append(mainView);

        this.editor = new Editor(mainView, this.db, this.awareness.bind(this), this);

        this.ele.prepend(new SideBar(this).ele); //HACK add last
    }

    user() { return this.net.user(); }
    awareness() { return this.net.awareness(); }
}