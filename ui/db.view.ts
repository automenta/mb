import $ from "jquery";
import BaseView from './util/base-view';

import '/ui/css/db.css';

export default class DBView extends BaseView {
    ele: JQuery;
    sortKey: string;
    sortOrder: string;
    filterText: string;
    filterValues: Record<string, string> = {};
    db: any;
    constructor(root: HTMLElement, db: any) {
        super($(root).find('.main-view'));
        this.db = db;
        this.ele = $('<div>').addClass('database-page');
        this.sortKey = 'title';
        this.sortOrder = 'asc';
        this.filterText = '';
    }

    render() {
        this.root.empty().append(this.ele);

        const pageSchema = require('../schema/page.schema.json');

        let tableHeadersHTML = '';
        pageSchema?.properties && Object.entries(pageSchema.properties).forEach(([field, property]) => {
            tableHeadersHTML += `<th>${(property as {description:string}).description}</th>`;
        });

        const filterControlsHTML = this.renderFilterControls();

        this.ele.append(this.createHeader(), this.createControls(filterControlsHTML), this.createTable(tableHeadersHTML));

        this.bindEvents();
        this.updateTable();
    }

    bindEvents() {
        this.ele.find('.filter-controls').on('input', '.filter-input', (e) => {
            const field = $(e.target).data('field');
            const value = ($(e.target).val() as string);
            this.filterValues[field] = value;
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
        const entries = Array.from(this.db.index.entries()) as [string, any][];
        const pages = entries.map(([key, value]) => ({ pageId: key, ...value }));
        this.renderTable(pages);
    }

    renderTable(pages: any[]) {
        const $tbody = this.ele.find('tbody').empty();
        const filteredPages = pages.filter(page => {
            let isMatch = true;
            for (const field in this.filterValues) {
                const filterValue = this.filterValues[field].toLowerCase();
                if (filterValue && !String(page[field]).toLowerCase().includes(filterValue)) {
                    isMatch = false;
                    break;
                }
            }
            return isMatch;
        });
        filteredPages.sort((a, b) => this.sortOrder === 'asc' ? a[this.sortKey].localeCompare(b[this.sortKey]) : b[this.sortKey].localeCompare(a[this.sortKey]));
        $tbody.append(filteredPages.map(this.createRow.bind(this)));
    }

    addObject(obj: any) {
        this.handleNewObject(obj);
    }

    handleNewObject(obj: any) {
        this.db.index.set(obj.id, obj);
        this.updateTable();
    }

    private createRow(page: any): JQuery {
        const $row = $('<tr>');
        const pageSchema = require('../schema/page.schema.json');
        pageSchema?.properties && Object.entries(pageSchema.properties).forEach(([field, property]) => {
            $row.append($('<td>').text(page[field] || ''));
        });
        const editButton = $('<button>').text('Edit').addClass('edit-button').on('click', () => {
            console.log('Edit button clicked for pageId:', page.pageId);
        });
        $row.append($('<td>').append(editButton));
        return $row;
    }

    private renderFilterControls(): string {
        let filterControlsHTML = '';
        const pageSchema = require('../schema/page.schema.json');
        pageSchema?.properties && Object.entries(pageSchema.properties).forEach(([field, property]) => {
            filterControlsHTML += `
                <div class="filter-group">
                    <label for="filter-${field}">${(property as {description:string}).description}:</label>
                    <input type="text" class="filter-input" id="filter-${field}" data-field="${field}" placeholder="Filter by ${(property as {description:string}).description}">
                </div>`;
        });
        return filterControlsHTML;
    }

    private createHeader(): JQuery<HTMLElement> {
        return $('<h3>').text('Database Statistics');
    }

    private createControls(filterControlsHTML: string): JQuery<HTMLElement> {
        const $controls = $('<div>').addClass('db-controls');
        $controls.append($('<div>').addClass('filter-controls').html(filterControlsHTML));
        $controls.append($('<select>').addClass('sort-select').append($('<option>').text('Title').val('title'), $('<option>').text('Page ID').val('pageId')));
        $controls.append($('<button>').addClass('sort-button').text('Sort'));
        return $controls;
    }

    private createTable(tableHeadersHTML: string): JQuery<HTMLElement> {
        const $table = $('<table>').addClass('database-table');
        const $thead = $('<thead>');
        $thead.append($('<tr>').html(tableHeadersHTML));
        $table.append($thead, $('<tbody>'));
        return $table;
    }
}
