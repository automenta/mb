// src/App.js
import $ from 'jquery';
import P2PNetwork from './p2p.js';
import SearchIndex from './search.js';
import Storage from './storage.js';

export default class App extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        this.render();
        this.init();
    }

    render() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .network-status {
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
        }
        .network-status.connected {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        .network-status.disconnected {
          background-color: #ffebee;
          color: #c62828;
        }
        #search-input {
          width: 70%;
          padding: 10px;
          font-size: 16px;
        }
        button {
          padding: 10px 20px;
          font-size: 16px;
          margin: 5px;
        }
        #results, #peer-list {
          margin-top: 20px;
        }
        .result-item {
          margin-bottom: 10px;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
        }
        .peer-item {
          margin-bottom: 5px;
          padding: 5px;
          background-color: #e3f2fd;
          border-radius: 4px;
        }
      </style>
      <div>
        <div id="network-status" class="network-status disconnected">
          Connecting to network...
        </div>
        <h1>P2P Search Index</h1>
        <input type="text" id="search-input" placeholder="Search...">
        <button id="search-button">Search</button>
        <button id="add-content-button">Add Content</button>
        <div id="results"></div>
        <h2>Connected Peers</h2>
        <div id="peer-list"></div>
      </div>
    `;
    }

    async init() {
        this.network = new P2PNetwork();
        this.searchIndex = new SearchIndex();
        this.storage = new Storage();

        try {
            await this.network.connect();
            this.setupEventListeners();
            await this.storage.init();

            const existingContent = await this.storage.getAll();
            for (const item of existingContent) {
                this.searchIndex.add(item.id, item.content);
            }
        } catch (err) {
            console.error('Failed to initialize:', err);
            this.showError('Failed to connect to the network');
        }
    }

    setupEventListeners() {
        const $root = $(this.shadowRoot);
        $root.on('click', '#search-button', () => this.handleSearch());
        $root.on('click', '#add-content-button', () => this.handleAddContent());

        // Network event listeners
    this.network.on('network-ready', () => {
      this.updateNetworkStatus(true);
    });

    this.network.on('peer-connected', (peerId) => {
            this.updateNetworkStatus(true);
            this.updatePeerList();
        });

    this.network.on('peer-disconnected', () => {
            this.updatePeerList();
            if (this.network.getPeers().length === 0) {
                this.updateNetworkStatus(false);
            }
        });

    this.network.on('network-error', (error) => {
            this.showError(error);
            this.updateNetworkStatus(false);
        });

    // Content event listeners
    this.network.on('new-content', (message) => this.handleNewContent(message));
    this.network.on('update-content', (message) => this.handleUpdateContent(message));
    this.network.on('remove-content', (message) => this.handleRemoveContent(message));
    }
}