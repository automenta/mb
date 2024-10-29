// db.js
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import $ from 'jquery';

/**
 * DB Class
 * Manages document storage, retrieval, and persistence using Yjs and IndexedDB.
 */
class DB {
    constructor(channel) {
        this.doc = new Y.Doc();
        this.pages = this.doc.getMap('pages');

        this.indexedDB = new IndexeddbPersistence(channel, this.doc);

        // Observe changes to persist data or trigger updates if needed
        this.indexedDB.on('synced', () => {
            console.log('Data synchronized with IndexedDB');
        });
    }

    /**
     * Retrieve a page object by its ID.
     * @param {string} pageId - The ID of the page.
     * @returns {Object} The page object containing title, contentId, and isPublic.
     */
    page(pageId) {
        return this.pages.get(pageId);
    }

    /**
     * Retrieve the Y.Text content of a page.
     * @param {string} pageId - The ID of the page.
     * @returns {Y.Text} The Y.Text instance for the page content.
     */
    pageContent(pageId) {
        const page = this.page(pageId);
        if (page) {
            return this.doc.getText(page.contentId);
        }
        return null;
    }

    /**
     * Set the entire page object.
     * @param {string} pageId - The ID of the page.
     * @param {Object} content - The page object containing title, contentId, and isPublic.
     */
    pageSet(pageId, content) {
        this.pages.set(pageId, content);
    }

    /**
     * Create a new page with default settings.
     * @param {string} pageId - The ID of the new page.
     * @param {string} title - The title of the new page.
     * @param {boolean} isPublic - The privacy state of the new page (default: false).
     */
    pageNew(pageId, title, isPublic = false) {
        const contentId = `content-${pageId}`;
        this.doc.getText(contentId); // Initialize Y.Text for content
        this.pageSet(pageId, { title, contentId, isPublic });
    }

    /**
     * Update the title of an existing page.
     * @param {string} pageId - The ID of the page.
     * @param {string} title - The new title.
     */
    pageTitle(pageId, title) {
        const page = this.page(pageId);
        if (page) {
            this.pageSet(pageId, { ...page, title });
        }
    }

    /**
     * Update the privacy state of an existing page.
     * @param {string} pageId - The ID of the page.
     * @param {boolean} isPublic - The new privacy state.
     */
    pagePrivacy(pageId, isPublic) {
        const page = this.page(pageId);
        if (page) {
            this.pageSet(pageId, { ...page, isPublic });
        }
    }

    /**
     * Render the database statistics and content in the provided container.
     * @param {HTMLElement} container - The DOM element to render the database.
     */
    renderDatabase(container) {
        container.innerHTML = '<h3>Database Statistics</h3>';

        const table = $('<table class="database-table"></table>');
        const headerRow = $('<tr></tr>');
        headerRow.append('<th>Page ID</th>', '<th>Page Title</th>', '<th>Content (Preview)</th>', '<th>Public</th>');
        table.append(headerRow);

        this.pages.forEach((value, key) => {
            const contentPreview = this.pageContent(key).toString().slice(0, 100) + (this.pageContent(key).length > 100 ? '...' : '');
            const isPublic = value.isPublic ? 'Yes' : 'No';

            const row = $('<tr></tr>');
            row.append(
                `<td>${key}</td>`,
                `<td>${value.title}</td>`,
                `<td>${contentPreview}</td>`,
                `<td>${isPublic}</td>`
            );
            table.append(row);
        });

        $(container).append(table);
    }
}

export default DB;
