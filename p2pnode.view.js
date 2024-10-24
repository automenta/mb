class NodeStatusView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.node = null;
    }

    set nodeReference(node) {
        this.node = node;
        this.bindToNode();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .stat-card {
                    padding: 10px;
                    border-radius: 4px;
                }
                .network-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 10px;
                }
                #node-id {
                    cursor: pointer; /* Add this line */
                }
            </style>
            <div class="card">
                <h2>Node Status</h2>
                <div class="network-stats">
                    <div class="stat-card">
                        <strong>Node ID:</strong> <span id="node-id">Initializing...</span>
                    </div>
                    <div class="stat-card">
                        <strong>Connected Peers:</strong> <span id="peer-count">0</span>
                    </div>
                    <div class="stat-card">
                        <strong>Messages Routed:</strong> <span id="message-count">0</span>
                    </div>
                    <div class="stat-card">
                        <strong>Network Uptime:</strong> <span id="uptime">0s</span>
                    </div>
                </div>
            </div>
        `;
    }

    bindToNode() {
        if (!this.node) return;
        this.node.addEventListener('node-id-changed', e => this.updateNodeId(e.detail.id));
        this.node.addEventListener('network-stats-updated', e => this.updateNetworkStats(e.detail));
    }

    updateNodeId(id) {
        const nodeIdSpan = this.shadowRoot.getElementById('node-id');
        nodeIdSpan.textContent = id;
        nodeIdSpan.onclick = () => {
            navigator.clipboard.writeText(id)
                .then(() => toast('Node ID copied to clipboard'))
                .catch(err => toast('Failed to copy Node ID', 'error'));
        };
    }

    updateNetworkStats(stats) {
        this.shadowRoot.getElementById('peer-count').textContent = stats.peerCount;
        this.shadowRoot.getElementById('message-count').textContent = stats.messagesRouted;
        this.shadowRoot.getElementById('uptime').textContent = `${stats.uptime}s`;
    }
}

customElements.define('node-status-view', NodeStatusView);

class BootstrapDiscoveryView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.node = null;
    }

    set nodeReference(node) {
        this.node = node;
        this.bindToNode();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                button {
                    background: #0070f3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-right: 8px;
                }
                button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                input {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-right: 8px;
                }
            </style>
            <div class="card">
                <h3>Bootstrap/Discovery</h3>
                <div>
                    <input type="text" id="bootstrap-node" placeholder="Bootstrap Node ID">
                    <button id="connect-bootstrap">Connect to Bootstrap</button>
                    <button id="become-bootstrap">Become Bootstrap Node</button>
                    <span id="bootstrap-status"></span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.getElementById('connect-bootstrap').addEventListener('click', () => {
            const bootstrapId = this.shadowRoot.getElementById('bootstrap-node').value;
            if (bootstrapId && this.node) {
                this.node.connectToBootstrap(bootstrapId);
            }
        });

        this.shadowRoot.getElementById('become-bootstrap').addEventListener('click', () => {
            if (this.node)
                this.node.becomeBootstrapNode();
        });
    }

    bindToNode() {
        if (!this.node) return;

        this.node.addEventListener('bootstrap-status-changed', e => {
            this.shadowRoot.getElementById('bootstrap-status').textContent = e.detail.isBootstrap ? '(Active Bootstrap Node)' : '';
        });
    }
}

customElements.define('bootstrap-discovery-view', BootstrapDiscoveryView);


class SendMessageView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.node = null;
    }

    set nodeReference(node) {
        this.node = node;
        this.bindToNode();
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                button {
                    background: #0070f3;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                }
                button:disabled {
                    background: #ccc;
                    cursor: not-allowed;
                }
                input, textarea {
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    margin-right: 8px;
                }
                textarea {
                    width: 100%;
                    height: 100px;
                    margin-bottom: 10px;
                }
            </style>
            <div class="card">
                <h3>Send Message</h3>
                <div>
                    <textarea id="message-content" placeholder="Enter message content"></textarea>
                    <input type="number" id="ttl" value="7" min="1" max="20" title="Time To Live">
                    <button id="broadcast">Broadcast Message</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        this.shadowRoot.getElementById('broadcast').addEventListener('click', () => {
            const content = this.shadowRoot.getElementById('message-content').value.trim();
            const ttl = parseInt(this.shadowRoot.getElementById('ttl').value, 10);

            if (content && this.node) {
                this.node.broadcast(content, ttl);
                this.shadowRoot.getElementById('message-content').value = '';
            }
        });
    }

    bindToNode() {
        // If there's any node-specific event handling, implement here
    }
}

customElements.define('send-message-view', SendMessageView);

class NetworkMessagesView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.node = null;
    }

    set nodeReference(node) {
        this.node = node;
        this.bindToNode();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .messages-list {
                    max-height: 300px;
                    overflow-y: auto;
                }
                .message-item {
                    padding: 8px;
                    margin: 4px 0;                   
                    border-radius: 4px;
                    font-family: monospace;
                }
            </style>
            <div class="card">
                <h3>Network Messages</h3>
                <div id="messages" class="messages-list"></div>
            </div>
        `;
    }

    bindToNode() {
        if (!this.node) return;

        this.node.addEventListener('message-received', e => this.addMessage(e.detail.message));
    }

    addMessage(m) {
        const messagesDiv = this.shadowRoot.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-item');
        messageElement.textContent = JSON.stringify(m);
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
    }
}

customElements.define('network-messages-view', NetworkMessagesView);


class NetworkLogView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.node = null;
    }

    set nodeReference(node) {
        this.node = node;
        this.bindToNode();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .log {
                    padding: 10px;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-family: monospace;
                    white-space: pre-wrap;
                }
            </style>
            <div class="card">
                <h3>Network Log</h3>
                <div id="log" class="log"></div>
            </div>
        `;
    }

    bindToNode() {
        if (this.node)
            this.node.addEventListener('log', e => this.log(e.detail.message));
    }

    log(message) {
        const logDiv = this.shadowRoot.getElementById('log');
        logDiv.textContent += message + '\n';
        logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll
    }
}

customElements.define('network-log-view', NetworkLogView);
