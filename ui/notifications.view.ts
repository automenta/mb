import $ from "jquery";
import View from './util/view';
import DB from '../core/db';
import NObject from '../core/obj';
import ObjViewMini from './util/obj.view.mini';

import '/ui/css/notifications.css';

export default class NotificationsView extends View {
    ele: JQuery;
    db: DB;
    notificationsList: JQuery;

    constructor(root: HTMLElement, db: DB, private readonly loadDocument: (obj: NObject) => Promise<void>) {
        super($(root));
        this.db = db;
        this.ele = $('<div>').addClass('notifications-view');
        this.notificationsList = $('<ul>').addClass('notifications-list');

    }

    render() {
        this.ele.empty().append(this.notificationsList);
        this.updateNotificationsList();
        this.bindEvents();
        return this.ele;
    }

    bindEvents() {
        // Re-render notifications when database index changes (new replies added)
        this.db.index.observe(() => this.updateNotificationsList());
    }

    updateNotificationsList() {
        this.notificationsList.empty();
        const replies = this.getReplyObjects();
        if (replies.length === 0) {
            this.notificationsList.append($('<li>').text('No notifications yet.'));
        } else {
            replies.forEach(reply => {
                const replyView = new ObjViewMini(reply);
                const listItem = $('<li>').append(replyView.ele);
                if (!reply.read) {
                    listItem.addClass('unread'); // Add 'unread' class for unread notifications
                }
                listItem.on('click', () => {
                    console.log(`Notification clicked, object ID: ${reply.id}`);
                    this.markAsRead(reply); // Mark as read when clicked
                    this.loadDocument(reply); // Call loadDocument to open in editor
                });
                this.notificationsList.append(listItem);
            });
        }
    }


    getReplyObjects() {
        return this.db.list().filter(obj => obj.repliesTo.length > 0); // Filter for reply objects
    }

    markAsRead(reply: NObject) {
        reply.read = true; // Set the 'read' metadata to true
        this.updateNotificationsList(); // Re-render to update UI
    }
}
