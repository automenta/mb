import $ from "jquery";

import '/ui/css/db.css';

export default class DBView {
    ele: JQuery;
    sortKey: string;
    sortOrder: string;
    filterText: string;
    filterValues: Record<string, string> = {}; // Store filter values
    constructor(public root: HTMLElement, public db: any) {
        this.ele = $('<div>').addClass('database-page');
        this.sortKey = 'title';
        this.sortOrder = 'asc';
        this.filterText = '';
    }

    render() {
        $(this.root).find('.main-view').empty().append(this.ele);

        // Load page schema
        const pageSchema = require('../schema/page.schema.json'); // Or however you load your schema

        // Generate table headers from schema properties
        let tableHeadersHTML = '';
        if (pageSchema && pageSchema.properties) {
            for (const field in pageSchema.properties) {
                const property = pageSchema.properties[field];
                tableHeadersHTML += `<th>${property.description}</th>`;
            }
        }

        const filterControlsHTML = this.renderFilterControls();

        this.ele.html(`
            <h3>Database Statistics</h3>
            <div class="db-controls">
                <div class="filter-controls">
                    ${filterControlsHTML}
                </div>
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
                            ${tableHeadersHTML}
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
        // Bind events for dynamically generated filter inputs
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
        const pages = Array.from(this.db.index.entries()).map(([key, value]) => ({ pageId: key, ...value }));
        this.renderTable(pages);
    }

    renderTable(pages: any[]) {
        const $tbody = this.ele.find('tbody').empty();
        // Apply filtering based on filter inputs
        const filteredPages = pages.filter(page => {
            let isMatch = true;
            for (const field in this.filterValues) {
                const filterValue = this.filterValues[field].toLowerCase();
                if (filterValue) {
                    const pageValue = String(page[field]).toLowerCase(); // Ensure pageValue is a string
                    if (!pageValue.includes(filterValue)) {
                        isMatch = false;
                        break;
                    }
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
        // Generate table cells from schema properties
        const pageSchema = require('../schema/page.schema.json'); // Or however you load your schema
        if (pageSchema && pageSchema.properties) {
            for (const field in pageSchema.properties) {
                $row.append($('<td>').text(page[field] || '')); // Use property name to access page data
            }
        }
        // Add edit button
        const editButton = $('<button>').text('Edit').addClass('edit-button').on('click', () => {
            // Edit functionality will be implemented here
            console.log('Edit button clicked for pageId:', page.pageId);
        });
        $row.append($('<td>').append(editButton));
        return $row;
    }

    private renderFilterControls(): string {
        let filterControlsHTML = '';
        const pageSchema = require('../schema/page.schema.json'); // Load schema
        if (pageSchema && pageSchema.properties) {
            for (const field in pageSchema.properties) {
                const property = pageSchema.properties[field];
                filterControlsHTML += `
                    <div class="filter-group">
                        <label for="filter-${field}">${property.description}:</label>
                        <input type="text" class="filter-input" id="filter-${field}" data-field="${field}" placeholder="Filter by ${property.description}">
                    </div>`;
            }
        }
        return filterControlsHTML;
    }
}
