import $ from "jquery";

import '/css/db.css';

export default class DBView {
    constructor(root, db) {
        this.root = root;
        this.db = db;
        this.$container = $('<div>').addClass('database-page');
        this.sortKey = 'title';
        this.sortOrder = 'asc';
        this.filterText = '';
    }

    render() {


        $(this.root).find('#main-view').empty().append(this.$container);

        this.$container.html(`
            <h3>Database Statistics</h3>
            <div class="db-controls">
                <input type="text" id="filter-input" placeholder="Filter by title">
                <select id="sort-select">
                    <option value="title">Title</option>
                    <option value="pageId">Page ID</option>
                </select>
                <button id="sort-button">Sort</button>
            </div>
            <div class="database-wrapper">
                <table class="database-table">
                    <thead>
                        <tr>
                            <th>Page ID</th>
                            <th>Page Title</th>
                            <th>Content (Preview)</th>
                            <th>Public</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `);

        this.bindEvents();
        this.updateTable();
    }

    bindEvents() {
        this.$container.find('#filter-input').on('input', (e) => {
            this.filterText = $(e.target).val().toLowerCase();
            this.updateTable();
        });

        this.$container.find('#sort-select').on('change', (e) => {
            this.sortKey = $(e.target).val();
        });

        this.$container.find('#sort-button').on('click', () => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.updateTable();
        });

        this.db.pages.observe(() => this.updateTable());
    }

    updateTable() {
        const $tbody = this.$container.find('tbody').empty();
        let pages = Array.from(this.db.pages.entries()).map(([key, value]) => ({ pageId: key, ...value }));

        if (this.filterText)
            pages = pages.filter(page => page.title.toLowerCase().includes(this.filterText));

        pages.sort((a, b) => {
            if (a[this.sortKey] < b[this.sortKey]) return this.sortOrder === 'asc' ? -1 : 1;
            if (a[this.sortKey] > b[this.sortKey]) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        pages.forEach(page => {
            const contentPreview = this.db.pageContent(page.pageId).toString().slice(0, 100) + (this.db.pageContent(page.pageId).length > 100 ? '...' : '');
            const isPublic = page.isPublic ? 'Yes' : 'No';
            $tbody.append(`
                <tr>
                    <td>${page.pageId}</td>
                    <td>${page.title}</td>
                    <td>${contentPreview}</td>
                    <td>${isPublic}</td>
                </tr>
            `);
        });
    }
}
