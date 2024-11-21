import $ from "jquery";

import App from './app'
import DB from '../src/db'
import ObjViewMini from './obj.view.mini'

import MeView from "./me.view";
import FrensView from "./frens.view";
import NetView from "./net.view.js";
import DBView from "./db.view.js";
import MatchingView from "./match.view.js";
import '/ui/css/sidebar.css';

class PageContextMenu {
    readonly ele: JQuery;
    private db: DB;
    private sidebar: Sidebar;
    private selectedPageId: string;

    constructor(db:DB, app:Sidebar) {
        this.db = db;
        this.sidebar = app;
        this.selectedPageId = null;
        this.ele = $('<div>').addClass('context-menu').html(`
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">Delete</li>
            </ul>
        `);

        //handle clicks outside the menu
        // $(this.ele).click(e => {
        //     if (!this.ele.has(e.target).length)
        //         this.hide();
        // });
        $(document).click(e => {
            if (!$(e.target).closest('#context-menu').length)
                this.hide();
        });

        this.ele.on('click', 'li', e => {
            const action = $(e.target).data('action');
            if (!action) return;
            if (action === 'rename-page') this.renamePage();
            else if (action === 'delete-page') this.deletePage();
            this.hide();
        });
    }

    renamePage() {
        if (this.selectedPageId) {
            const newName = prompt('Enter new page name:');
            if (newName) this.db.objName(this.selectedPageId, newName);
        }
    }

    deletePage() {
        if (this.selectedPageId && confirm('Are you sure you want to delete this page?')) {
            this.db.delete(this.selectedPageId);
            if (this.db.get(this.selectedPageId)?.public) this.sidebar.app.net.unshareDocument(this.selectedPageId);
        }
    }

    showContextMenu(event:ContextMenuEvent, pageId:string) {
        event.preventDefault();
        this.selectedPageId = pageId;
        this.ele.css({
            top: event.clientY,
            left: event.clientX,
            display: 'block'
        });
    }

    hide() {
        this.ele.hide();
    }
}

import ContextMenuEvent = JQuery.ContextMenuEvent;

export default class Sidebar {
    readonly ele: JQuery;
    private readonly db: DB;
    private readonly meView: MeView;
    private readonly friendsView: FrensView;
    private readonly netView: NetView;
    private readonly dbView: DBView;
    private readonly matchingView: MatchingView;
    public app: App;
    private contextMenu: PageContextMenu;
    private pageList: JQuery;

    constructor(app:App) {
        const root = app.ele;

        this.ele = $('<div>').addClass('sidebar');

        this.app = app;
        this.db = app.db;

        const thisAware = app.awareness.bind(app);
        this.meView = new MeView(root, app.user.bind(app), thisAware);
        this.friendsView = new FrensView(root, thisAware);
        this.netView = new NetView(root.find('.main-view'), app.net);
        this.dbView = new DBView(root, this.db);
        this.matchingView = new MatchingView(root, app.match);


        this.ele.append(this.menu());
        this.contextMenu = new PageContextMenu(this.db, this);
        root.append(this.contextMenu.ele);

        this.ele.append(this.pageList = $('<ul>', {class: 'page-list'}));

        this.db.index.observe(() => this.updatePageList());

        this.updatePageList();
    }

    menu() {
        const menuBar = $('<div>', {
            class: 'menubar'
        }).append(
            $('<button>', {
                class: 'menubar-button add-page-button',
                text: '+',
                title: 'Add New Page'
            }).click(() => {
                const p = this.db.create();
                p.name = 'Empty';
                p.public = false;
                this.app.editor.view(p);
            })
        );

        [
            {id: 'profile',  title: 'Me'},
            {id: 'friends',  title: 'FRENS'},
            {id: 'network',  title: 'Net'},
            {id: 'database', title: 'DB'},
            {id: 'matching', title: 'Matching'},
        ].forEach(view => {
            let v;
            switch (view.id) {
                case 'profile': v = this.meView; break;
                case 'friends': v = this.friendsView; break;
                case 'network': v = this.netView; break;
                case 'database': v = this.dbView; break;
                case 'matching': v = this.matchingView; break;
                default: console.warn(`No page class defined for ${view.id}`);
            }

            menuBar.append($('<button>', {
                class: 'menubar-button',
                text: view.title,
                title: view.title
            }).click(() => v.render()));
        });

        return menuBar;
    }

    updatePageList() {
        const nextPageList: JQuery[] = [];
        this.db.index.forEach((_value, key) => {
            const obj = this.db.get(key);
            if (obj) {
                const v = new ObjViewMini(obj);
                v.ele.attr('data-page-id', key)
                    .on('contextmenu', (e: JQuery.Event) => {
                        e.preventDefault();
                        this.contextMenu.showContextMenu(e, key);
                    })
                    .on('click', ()=>{
                        this.app.editor.view(obj);
                    });
                nextPageList.push(v.ele);
            }
        });
        this.pageList.empty().append(nextPageList);
    }

    // updatePageList() {
    //     const nextPageList:JQuery[] = [];
    //     this.db.index.forEach((_value, key) => {
    //
    //         const value = this.db.get(key);
    //         let name = value.name;
    //         const li = $('<li>', {
    //             text: name,
    //             'data-page-id': key,
    //             title: `Open ${name}`,
    //             class: 'user-page-item'
    //         });
    //
    //         if (value.public)
    //             li.append($('<span>', {text: ' 🌐',  title: 'Public Document'}));
    //
    //         li.on({
    //             click: () => this.app.editor.view(this.db.get(key)),
    //             contextmenu: e => {
    //                 e.preventDefault();
    //                 this.contextMenu.showContextMenu(e, key);
    //             },
    //             dblclick: () => { }
    //         });
    //
    //         nextPageList.push(li);
    //     });
    //     this.pageList.empty().append(nextPageList);
    // }
}
