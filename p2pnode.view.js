class P2PNodeView extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    font-family: sans-serif;
                    max-width: 1000px;
                    margin: 20px auto;
                    padding: 0 20px;
                }

                .container {
                    display: grid;
                    gap: 20px;
                }

                .card {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 15px;
                }

                .log {
                    background: #f5f5f5;
                    padding: 10px;
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    font-family: monospace;
                }

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

                .network-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 10px;
                }

                .stat-card {
                    background: #f0f0f0;
                    padding: 10px;
                    border-radius: 4px;
                }

                .messages-list {
                    max-height: 300px;
                    overflow-y: auto;
                }

                .message-item {
                    padding: 8px;
                    margin: 4px 0;
                    background: #f9f9f9;
                    border-radius: 4px;
                }
            </style>

            <div class="container">
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

                <div class="card">
                    <h3>Bootstrap/Discovery</h3>
                    <div>
                        <input type="text" id="bootstrap-node" placeholder="Bootstrap Node ID">
                        <button id="connect-bootstrap">Connect to Bootstrap</button>
                        <button id="become-bootstrap">Become Bootstrap Node</button>
                        <span id="bootstrap-status"></span>
                    </div>
                </div>

                <div class="card">
                    <h3>Send Message</h3>
                    <div>
                        <textarea id="message-content" placeholder="Enter message content"></textarea>
                        <input type="number" id="ttl" value="7" min="1" max="20">
                        <button id="broadcast">Broadcast Message</button>
                    </div>
                </div>

                <div class="card">
                    <h3>Network Messages</h3>
                    <div id="messages" class="messages-list"></div>
                </div>

                <div class="card">
                    <h3>Network Log</h3>
                    <div id="log" class="log"></div>
                </div>
            </div>
        `;
    }

    bindToNode(n) {
        // Forward view events to node methods
        this.addEventListener('connect-bootstrap', (e) => n.connectToBootstrap(e.detail));
        this.addEventListener('become-bootstrap', () => n.becomeBootstrapNode());
        this.addEventListener('broadcast-message', (e) => n.broadcast(e.detail.content, e.detail.ttl));

        // Listen to all node events
        n.addEventListener('node-id-changed', (e) => this.updateNodeId(e.detail.id));
        n.addEventListener('bootstrap-status-changed', (e) => {
            this.setBootstrapStatus(e.detail.isBootstrap ? '(Active Bootstrap Node)' : '');
        });
        n.addEventListener('message-received', (e) => this.addMessage(e.detail.message));
        n.addEventListener('log', (e) => this.log(e.detail.message));
        n.addEventListener('network-stats-updated', (e) => this.updateNetworkStats(e.detail));
    }

    setupEventListeners() {
        this.shadowRoot.getElementById('connect-bootstrap').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('connect-bootstrap', {
                detail: this.shadowRoot.getElementById('bootstrap-node').value
            }));
        });

        this.shadowRoot.getElementById('become-bootstrap').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('become-bootstrap'));
        });

        this.shadowRoot.getElementById('broadcast').addEventListener('click', () => {
            this.dispatchEvent(new CustomEvent('broadcast-message', {
                detail: {
                    content: this.shadowRoot.getElementById('message-content').value,
                    ttl: parseInt(this.shadowRoot.getElementById('ttl').value)
                }
            }));
            this.shadowRoot.getElementById('message-content').value = '';
        });
    }

    log(x) {
        this.shadowRoot.getElementById('log').textContent += x;
    }

    addMessage(x) {
        const messagesDiv = this.shadowRoot.getElementById('messages');
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-item');
        messageElement.textContent = JSON.stringify(x);
        messagesDiv.appendChild(messageElement);
        messagesDiv.scrollTop = messagesDiv.scrollHeight; // Auto-scroll
    }

    updateNodeId(id) {
        this.shadowRoot.getElementById('node-id').textContent = id;
    }

    updateNetworkStats(stats) {
        this.shadowRoot.getElementById('peer-count').textContent = stats.peerCount;
        this.shadowRoot.getElementById('message-count').textContent = stats.messagesRouted;
        this.shadowRoot.getElementById('uptime').textContent = `${stats.uptime}s`;
    }

    setBootstrapStatus(status) {
    }
}

customElements.define('p2pnode-view', P2PNodeView);
