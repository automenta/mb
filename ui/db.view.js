import $ from "jquery";

import '/ui/css/db.css';

export default class DBView {
    constructor(root, db) {
        this.root = root;
        this.db = db;
        this.ele = $('<div>').addClass('database-page');
        this.sortKey = 'title';
        this.sortOrder = 'asc';
        this.filterText = '';
    }

    render() {


        $(this.root).find('.main-view').empty().append(this.ele);

        this.ele.html(`
            <h3>Database Statistics</h3>
            <div class="db-controls">
                <input type="text" class="filter-input" placeholder="Filter by title">
                <select class="sort-select">
                    <option value="title">Title</option>
                    <option value="pageId">Page ID</option>
                </select>
                <button class="sort-button">Sort</button>
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
        this.ele.find('#filter-input').on('input', (e) => {
            this.filterText = $(e.target).val().toLowerCase();
            this.updateTable();
        });

        this.ele.find('#sort-select').on('change', (e) => {
            this.sortKey = $(e.target).val();
        });

        this.ele.find('#sort-button').click(() => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.updateTable();
        });

        this.db.index.observe(() => this.updateTable());
    }

    updateTable() {
        const $tbody = this.ele.find('tbody').empty();
        let pages = Array.from(this.db.index.entries()).map(([key, value]) => ({ pageId: key, ...value }));

        if (this.filterText)
            pages = pages.filter(page => page.title.toLowerCase().includes(this.filterText));

        pages.sort((a, b) => {
            if (a[this.sortKey] < b[this.sortKey]) return this.sortOrder === 'asc' ? -1 : 1;
            if (a[this.sortKey] > b[this.sortKey]) return this.sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        pages.forEach(page => {
            const contentPreview = page.text.slice(0, 100);
            const isPublic = page.p ? 'Yes' : 'No';
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
