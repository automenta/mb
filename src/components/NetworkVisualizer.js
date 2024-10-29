export class NetworkVisualizer extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.events = [];
        this.maxEvents = 100;
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
                    padding: 1em;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1em;
                    margin-bottom: 1em;
                }
                .stat-box {
                    border: 1px solid #ccc;
                    padding: 1em;
                    border-radius: 4px;
                }
                .event-log {
                    height: 200px;
                    overflow-y: auto;
                    border: 1px solid #ccc;
                    padding: 1em;
                }
                .peer-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5em;
                    margin-top: 1em;
                }
                .peer-badge {
                    background: #e0e0e0;
                    padding: 0.5em;
                    border-radius: 4px;
                    font-size: 0.9em;
                }
                .event-entry {
                    margin: 0.5em 0;
                    padding: 0.5em;
                    border-left: 3px solid #ccc;
                }
                .peer-connected { border-left-color: #4CAF50; }
                .peer-disconnected { border-left-color: #f44336; }
                .message-sent { border-left-color: #2196F3; }
                .message-received { border-left-color: #FF9800; }
            </style>
            <div class="stats-grid">
                <div class="stat-box" id="messages">
                    <strong>Messages</strong>
                    <div>Sent: <span id="sent">0</span></div>
                    <div>Received: <span id="received">0</span></div>
                </div>
                <div class="stat-box" id="bandwidth">
                    <strong>Bandwidth</strong>
                    <div>Total: <span id="bytes">0</span> bytes</div>
                </div>
            </div>
            <div class="stat-box">
                <strong>Connections</strong>
                <div class="peer-list" id="peers"></div>
            </div>
            <div class="stat-box">
                <strong>Events</strong>
                <div class="event-log" id="events"></div>
            </div>
        `;
    }

    setupEventListeners() {
        window.addEventListener('network-activity',
        event => this.updateVisualization(event.detail));
    }

    updateVisualization(eventData) {
        const { type, data, timestamp } = eventData;
        const stats = data.stats;

        // Update metrics
        this.shadowRoot.querySelector('#sent').textContent = stats.messagesSent;
        this.shadowRoot.querySelector('#received').textContent = stats.messagesReceived;
        this.shadowRoot.querySelector('#bytes').textContent = stats.bytesTransferred;

        // Update peer list
        const peerList = this.shadowRoot.querySelector('#peers');
        peerList.innerHTML = stats.awareness.map(peer => `
            <div class="peer-badge">
                ${peer.metadata.clientID}
                (${new Date(peer.lastActive).toLocaleTimeString()})
            </div>
        `).join('');

        // Add event to log
        this.events.unshift({
            type,
            timestamp,
            data
        });
        this.events = this.events.slice(0, this.maxEvents);

        // Update event log
        const eventsContainer = this.shadowRoot.querySelector('#events');
        eventsContainer.innerHTML = this.events.map(event => `
            <div class="event-entry ${event.type}">
                [${new Date(event.timestamp).toLocaleTimeString()}] ${event.type}
                ${event.data.peerId ? `(Peer: ${event.data.peerId})` : ''}
                ${event.data.bytes ? `(${event.data.bytes} bytes)` : ''}
            </div>
        `).join('');
    }
}

customElements.define('network-visualizer', NetworkVisualizer);
export default NetworkVisualizer;
