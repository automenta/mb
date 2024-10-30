import $ from "jquery";
import MeView from "./me.view.js";
import NetView from "./net.view.js";
import DBView from "./db.view.js";

class PageContextMenu {
    constructor(db, app) {
        this.db = db;
        this.app = app;
        this.selectedPageId = null;
        this.ele = $('<div>').attr('id', 'context-menu').appendTo($('body'));
        this.ele.html(`
            <ul>
                <li data-action="rename-page">Rename</li>
                <li data-action="delete-page">Delete</li>
            </ul>
        `);
        $(this.ele).click(e => {
            if (!this.ele.has(e.target).length) this.hide();
        });

        this.ele.on('click', 'li', e => {
            const action = $(e.target).data('action');
            if (!action) return;
            if (action === 'rename-page') this.renamePage();
            else if (action === 'delete-page') this.deletePage();
            this.hide();
        });

        $(document).on('click', e => {
            if (!$(e.target).closest('#context-menu').length)
                this.hide();
        });
    }
    renamePage() {
        if (this.selectedPageId) {
            const newName = prompt('Enter new page name:');
            if (newName) this.db.pageTitle(this.selectedPageId, newName);
        }
    }

    deletePage() {
        if (this.selectedPageId && confirm('Are you sure you want to delete this page?')) {
            this.db.pages.delete(this.selectedPageId);
            if (this.db.page(this.selectedPageId)?.isPublic) this.app.net.removeSharedDocument(this.selectedPageId);
        }
    }

    showContextMenu(event, pageId) {
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


class FriendsView {
    constructor(ele, getAwareness) {
        this.ele = ele;
        this.getAwareness = getAwareness;
        this.container = $('<div>').addClass('friends-list-page');
    }

    render() {
        $(this.ele).find('#main-view').empty().append(this.container);

        this.container.html(`
            <h3>Friends</h3>
            <ul></ul>
        `);

        const updateFriends = () => {
            const users = [];
            this.getAwareness().getStates().forEach(state => {
                if (state.user) users.push(state.user);
            });

            const ul = this.container.find('ul').empty();
            users.forEach(user => ul.append($('<li>').text(user.name).css('color', user.color)));
        };

        updateFriends();
        this.getAwareness().on('change', updateFriends);
    }
}

export default class Sidebar {
    constructor(app) {
        const root = app.ele;

        this.ele = root.find('#sidebar');

        this.db = app.db;

        const thisAware = app.awareness.bind(app);
        this.meView = new MeView(root, app.user.bind(app), thisAware);
        this.friendsView = new FriendsView(root, thisAware);
        this.netView = new NetView(root.find('#main-view'), app.net);
        this.dbView = new DBView(root, this.db);


        this.app = app;
        this.ele.append(this.menu());
        this.contextMenu = new PageContextMenu(this.db, this);
        if (this.observer) {
            this.db.pages.unobserve(this.observer);
            this.observer = undefined;
        }
        this.ele.append(this.$pageList = $('<ul>', {id: 'page-list'}));
        this.observer = this.db.pages.observe(() => this.updatePageList());
        this.updatePageList();
    }

    menu() {
        const menuBar = $('<div>', {
            id: 'menubar',
            class: 'menubar'
        }).append(
            $('<button>', {
                id: 'add-page',
                class: 'menubar-button add-page-button',
                text: '+',
                title: 'Add New Page'
            }).on('click', () => {
                const pageId = `page-${Date.now()}`;
                this.db.pageNew(pageId, 'Empty', false);
                this.app.editor.viewPage(pageId);
            })
        );

        [
            {id: 'profile',  title: 'Me',      class: MeView},
            {id: 'friends',  title: 'Friends', class: FriendsView},
            {id: 'network',  title: 'Net',     class: NetView},
            {id: 'database', title: 'DB',      class: DBView},
        ].forEach(view => {
            let v;
            switch (view.id) {
                case 'profile': v = this.meView; break;
                case 'friends': v = this.friendsView; break;
                case 'network': v = this.netView; break;
                case 'database': v = this.dbView; break;
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
        this.$pageList.empty();
        this.db.pages.forEach((value, key) => {
            const $li = $('<li>', {
                text: value.title,
                'data-page-id': key,
                title: `Open ${value.title}`,
                class: 'user-page-item'
            });

            if (value.isPublic)
                $li.append($('<span>', {text: ' 🌐',  title: 'Public Document'}));

            $li.on({
                click: () => this.app.editor.viewPage(key),
                contextmenu: e => {
                    e.preventDefault();
                    console.log('context', this.contextMenu);
                    this.contextMenu.showContextMenu(e, key);
                },
                dblclick: () => { }
            });

            this.$pageList.append($li);
        });
    }
}
