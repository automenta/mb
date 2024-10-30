"use strict";
import * as Y from 'yjs';
import {IndexeddbPersistence} from 'y-indexeddb';

class DB {
    constructor(channel) {
        this.doc = new Y.Doc({
            gc: true
        });
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

}

export default DB;
