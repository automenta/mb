import $ from 'jquery';
import View from './util/view';
import ObjViewMini from './util/obj.view.mini';
import type { App } from './app';
import pageTags from '../tag/page.json';
import DB from '../core/db'; // Import DB class
import NObject from '../core/obj'; // Import NObject class

import '/ui/css/db.css';

interface FilterValues {
    [key: string]: string;
}

export default class DBView extends View {
    app: App;
    sortKey: string;
    sortOrder: string;
    filterValues: FilterValues = {}; // Initialize filterValues
    db: DB; // Use imported DB class

    constructor(app: App, root: JQuery<HTMLElement>, db: DB) { // Update constructor to accept DB
        super(root);
        this.app = app;
        this.db = db;
        this.ele = $('<div>').addClass('database-page');
        this.sortKey = 'name'; // Default sort key to 'name'
        this.sortOrder = 'asc';
    }

    render(): JQuery {
        this.root.empty().append(this.ele);

        let tableHeadersHTML = '';
        pageTags?.properties && Object.entries(pageTags.properties).forEach(([field, property]) => {
            tableHeadersHTML += `<th>${(property as { description: string }).description}</th>`;
        });

        const filterControlsHTML = this.renderFilterControls();

        this.ele.append(
            this.createHeader(),
            this.createControls(filterControlsHTML),
            this.createTable(tableHeadersHTML),
            this.createNewObjectButton()
        );

        this.bindEvents();
        this.updateTable();
        this.updateStatistics(); // Call updateStatistics to update stats in header
        return this.ele; // Make render() return JQuery
    }

    bindEvents(): void {
        this.ele.find('.filter-controls').on('input', '.filter-input', (e) => {
            const field = $(e.target).data('field') as string; // Cast to string
            this.filterValues[field] = ($(e.target).val() as string).toLowerCase(); // Store lowercase filter value
            this.updateTable();
        });

        this.ele.find('.sort-select').on('change', (e) => {
            this.sortKey = $(e.target).val() as string; // Cast to string
            this.updateTable();
        });

        this.ele.find('.sort-button').on('click', () => { // Use .on('click') for event binding
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            this.updateTable();
        });

        // Observe changes to the index map for real-time updates
        this.db.index.observe(() => this.updateTable());
    }

    updateTable(): void {
        // Convert Y.Map to array of NObjects
        let pages: NObject[] = Array.from(this.db.index.values())
            .map(id => this.db.get(id))
            .filter(obj => obj !== null) as NObject[]; // Filter out null objects and cast

        // Apply filters
        if (this.filterValues && Object.keys(this.filterValues).length > 0) {
            pages = pages.filter(page => {
                if (!page) return false;
                let isMatch = true;
                for (const field in this.filterValues) {
                    if (!this.filterValues.hasOwnProperty(field)) continue;
                    const filterValue = this.filterValues[field];
                    const pageValue = page.getMetadata(field);
                    if (filterValue && pageValue && !String(pageValue).toLowerCase().includes(filterValue)) {
                        isMatch = false;
                        break;
                    }
                }
                return isMatch;
            });
        }

        this.renderTable(pages);
    }


    renderTable(pages: NObject[]): void {
        const $tbody = this.ele.find('tbody').empty();
        const filteredPages = pages.filter(page => {
            if (!page) return false; // Ensure page is not null

            let isMatch = true;
            for (const field in this.filterValues) {
                if (!this.filterValues.hasOwnProperty(field)) continue; // Skip inherited properties

                const filterValue = this.filterValues[field];
                const pageValue = page.getMetadata(field); // Use getMetadata to access properties
                if (filterValue && !String(pageValue).toLowerCase().includes(filterValue)) {
                    isMatch = false;
                    break;
                }
            }
            return isMatch;
        });


        filteredPages.sort((a, b) => {
            const aValue = a?.getMetadata(this.sortKey) || ''; // Use getMetadata and handle null
            const bValue = b?.getMetadata(this.sortKey) || ''; // Use getMetadata and handle null

            return this.sortOrder === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
        });

        $tbody.append(filteredPages.map(this.createRow.bind(this)));
    }


    addObject(obj: NObject): void {
        this.handleNewObject(obj);
    }

    handleNewObject(obj: NObject): void {
        this.db.add(obj);
        this.updateTable();
    }

    private updateStatistics(): void {
        const objectCount = this.db.index.size;
        $('#object-count').text(`Objects: ${objectCount}`);

        // Get peer count from network (if network is available and connected)
        const network = this.app.net;
        if (network) {
            const networkStats = network.getNetworkStats();
            const peerCount = networkStats.peersConnected.size;
            $('#peer-count').text(`Peers: ${peerCount}`);
        } else {
            $('#peer-count').text('Peers: N/A'); // Indicate N/A if network is not available
        }
    }


    private createRow(page: NObject | null): JQuery {
        if (!page) return $('<tr>').append($('<td>').text('Error: Page is null'));

        const $row = $('<tr>');
        pageTags?.properties && Object.entries(pageTags.properties).forEach(([field, property]) => {
            const text = page.getMetadata(field) || ''; // Use getMetadata to access properties
            $row.append($('<td>').text(text));
        });

        const editButton = $('<button>').text('Edit').addClass('edit-button').on('click', () => {
            console.log('Edit button clicked for pageId:', page.id);
            console.log('this.app.editor:', this.app.editor); // Check if this.app.editor is defined
            this.app.editor?.loadDocument(page); // Load document in editor
        });
        $row.append($('<td>').append(editButton));

        const objViewMini = new ObjViewMini(page);
        const listItem = $('<li>').append(objViewMini.ele);

        const name = page.name + (page.isQuery ? ' (Query)' : ''); // Add "(Query)" if isQuery is true
        objViewMini.ele.find('.obj-name').text(name); // Update object name in ObjViewMini
        return $row;
    }


    private renderFilterControls(): string {
        let filterControlsHTML = '';
        pageTags?.properties && Object.entries(pageTags.properties).forEach(([field, property]) => {
            filterControlsHTML += `
                <div class="filter-group">
                    <label for="filter-${field}">${(property as { description: string }).description}:</label>
                    <input type="text" class="filter-input" id="filter-${field}" data-field="${field}" name="filter-${field}" placeholder="Filter by ${(property as { description: string }).description}">
                </div>`;
        });
        return filterControlsHTML;
    }

    private createHeader(): JQuery {
        const $header = $('<div>').addClass('db-header');
        $header.append($('<h3>').text('Database Objects'));

        const $stats = $('<div>').addClass('db-stats');
        $stats.append(
            $('<span>').attr('id', 'object-count').text('Objects: 0'),
            $('<span>').attr('id', 'peer-count').text('Peers: 0') // Placeholder for peer count
        );
        $header.append($stats);
        return $header;
    }


    private createControls(filterControlsHTML: string): JQuery {
        const $controls = $('<div>').addClass('db-controls');
        $controls.append($('<div>').addClass('filter-controls').html(filterControlsHTML));
        $controls.append($('<select>').addClass('sort-select').append(
            $('<option>').text('Name').val('name'), // Sort by Name
            $('<option>').text('Page ID').val('id') // Sort by ID
        ));
        $controls.append($('<button>').addClass('sort-button').text('Sort'));
        return $controls;
    }

    private createNewObjectButton(): JQuery {
        const newObjectButton = $('<button>')
            .text('New NObject')
            .addClass('new-object-button')
            .on('click', () => {
                this.app.createNewObject(); // Use app.createNewObject to create new object
            });
        return newObjectButton;
    }

    private createTable(tableHeadersHTML: string): JQuery {
        const $table = $('<table>').addClass('database-table');
        const $thead = $('<thead>');
        $thead.append($('<tr>').html(tableHeadersHTML));
        $table.append($thead, $('<tbody>'));
        return $table;
    }
}
