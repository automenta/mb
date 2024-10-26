import * as Y from 'yjs';
import {IndexeddbPersistence} from "y-indexeddb";
import $ from "jquery";

class DB {
    constructor(channel) {
        this.doc = new Y.Doc();
        this.pages = this.doc.getMap('pages');

        this.indexedDB = new IndexeddbPersistence(channel, this.doc);
    }

    pageContent(pageId) {
        return this.doc.getText(this.pages.get(pageId).contentId);
    }
    pageSet(pageId, content) {
        return this.pages.set(pageId, content);
    }
    pageNew(pageId, title) {
        return this.pageSet(pageId, {title, contentId: `content-${pageId}`});
    }
    pageTitle(pageId, title) {
        return this.pageSet(pageId, {...(this.pages.get(pageId)), title: title});
    }

    renderDatabase(container) {
        container.innerHTML = '<h3>Database Statistics</h3>';

        const table = $('<table class="database-table"></table>');
        const headerRow = $('<tr></tr>');
        headerRow.append('<th>Page ID</th>', '<th>Page Title</th>', '<th>Content</th>');
        table.append(headerRow);

        this.pages.forEach((value, key) => {
            table.append($('<tr>').append(
                `<td>${key}</td>`, `<td>${value.title}</td>`,
                `<td>${this.pageContent(key)}</td>` //TODO display first N chars only
            ));
        });

        $(container).append(table);

    }
}

export default DB;