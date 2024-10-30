import * as Y from 'yjs';
import {IndexeddbPersistence} from 'y-indexeddb';
import $ from 'jquery';


class DB {
    constructor(channel) {
        this.doc = new Y.Doc();
        this.pages = this.doc.getMap('pages');

        this.indexedDB = new IndexeddbPersistence(channel, this.doc);

        // Observe changes to persist data or trigger updates if needed
        this.indexedDB.on('synced', () => console.log('Data synchronized with IndexedDB'));
    }

    page(pageId) {
        return this.pages.get(pageId);
    }

    pageContent(pageId) {
        const page = this.page(pageId);
        return page ? this.doc.getText(page.contentId) : null;
    }

    pageSet(pageId, content) {
        this.pages.set(pageId, content);
    }

    pageNew(pageId, title, isPublic = false) {
        const contentId = `content-${pageId}`;
        this.doc.getText(contentId); // Initialize Y.Text for content
        this.pageSet(pageId, { title, contentId, isPublic });
    }

    pageTitle(pageId, title) {
        const page = this.page(pageId);
        if (page)
            this.pageSet(pageId, { ...page, title });
    }

    pagePrivacy(pageId, isPublic) {
        const page = this.page(pageId);
        if (page)
            this.pageSet(pageId, { ...page, isPublic });
    }

    renderDatabase(container) {
        container.innerHTML = '<h3>Database Statistics</h3>';

        const table = $('<table class="database-table"></table>');

        //header row
        table.append($('<tr></tr>').append('<th>Page ID</th>', '<th>Page Title</th>', '<th>Content (Preview)</th>', '<th>Public</th>'));

        this.pages.forEach((value, key) => {
            const contentPreview = this.pageContent(key).toString().slice(0, 100) + (this.pageContent(key).length > 100 ? '...' : '');
            const isPublic = value.isPublic ? 'Yes' : 'No';
            table.append($('<tr></tr>').append(
                `<td>${key}</td>`,
                `<td>${value.title}</td>`,
                `<td>${contentPreview}</td>`,
                `<td>${isPublic}</td>`
            ));
        });

        $(container).append(table);
    }
}

export default DB;
