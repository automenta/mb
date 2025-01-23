import $ from "jquery";

import '/ui/css/db.css';

export default class DBView {
    ele: JQuery;
    sortKey: string;
    sortOrder: string;
    filterText: string;
    constructor(public root: HTMLElement, public db: any) {
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
        this.ele.find('.filter-input').on('input', (e) => {
            this.filterText = ($(e.target).val() as string).toLowerCase();
            this.updateTable();
        });

        this.ele.find('.sort-select').on('change', (e) => {
            this.sortKey = $(e.target).val() as string;
            this.updateTable();
        });

        this.ele.find('.sort-button').click(() => {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.updateTable();
        });

        this.db.index.observe(() => this.updateTable());
    }

    updateTable() {
        const pages = Array.from(this.db.index.entries()).map(([key, value]) => ({ pageId: key, ...value }));
        this.renderTable(pages);
    }

    renderTable(pages) {
        const $tbody = this.ele.find('tbody').empty();
        const filteredPages = pages.filter(page => this.filterText ? page.title.toLowerCase().includes(this.filterText) : true);
        filteredPages.sort((a, b) => this.sortOrder === 'asc' ? a[this.sortKey].localeCompare(b[this.sortKey]) : b[this.sortKey].localeCompare(a[this.sortKey]));
        $tbody.append(filteredPages.map(this.createRow.bind(this)).toArray());
    }

    private createRow(page: any): JQuery {
        const $row = $('<tr>');
        $row.append($('<td>').text(page.pageId));
        $row.append($('<td>').text(page.title));
        $row.append($('<td>').text(page.text.slice(0, 100)));
        $row.append($('<td>').text(page.p ? 'Yes' : 'No'));
        return $row;
    }
}
