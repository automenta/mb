import $ from 'jquery';
import { events } from '../src/events';
import '/ui/css/net.css';

class BootstrapView {
    net: any; // Type 'any' for 'net' as its type is not defined in provided files
    addButton: JQuery<HTMLElement>;
    $input: JQuery<HTMLElement>;
    $nodeList: JQuery<HTMLElement>;

    constructor(net: any) {
        this.net = net;
        this.addButton = $('<button>').text("+") as JQuery<HTMLElement>;
        this.$input = $('<input>').attr('placeholder', 'bootstrap') as JQuery<HTMLElement>;
        this.$nodeList = $('<div>') as JQuery<HTMLElement>;

        this.addButton.click(() => {
            const url = this.$input.val()?.toString().trim(); // Ensure url is a string before trimming
            if (url && this.validateURL(url)) {
                this.net.addBootstrap(url);
                this.$input.val('');
                this.update();
            } else {
                alert('Please enter a valid signaling server URL.');
            }
        });

        this.$nodeList.on('click', '.remove-server', (e) => {
            const url = $(e.target).data('url');
            this.net.removeBootstrap(url);
            this.update();
        });
        this.update();
    }

    validateURL(url: string): boolean {
        //return validateURL(url);
        return true;
    }

    update(): void {
        this.$nodeList.empty().append(this.net.signalingServers.map(url => this.renderNode(url)));
    }

    renderNode(url: string): JQuery<HTMLElement> {
        return $(`<li>${url}<button class="remove-server" data-url="${url}">Remove</button></li>`) as JQuery<HTMLElement>;
    }

    panel(): JQuery<HTMLElement> {
        return $('<div>').append('<h2>Bootstrap Nodes</h2>', this.$nodeList, this.$input, this.addButton) as JQuery<HTMLElement>;
    }
}


class NetViewer {
    net: any; // Type 'any' for 'net' as its type is not defined in provided files
    ele: JQuery<HTMLElement>;
    events: any[] = []; // Type 'any[]' for 'events' as its type is not defined
    maxEvents: number = 100;
    bootstrap: BootstrapView;

    constructor(net: any) {
        this.net = net;
        this.ele = $('<div>').addClass('net-viewer') as JQuery<HTMLElement>;
        this.bootstrap = new BootstrapView(net);
        this.render();
        events.on('networkActivity', (e: any) => this.update((e as CustomEvent<any>).detail)); // Type assertion to suppress error
    }

    render(): void {
        this.ele.append(`
            <h3>Network</h3>
            <div class="stats-grid">
                <div class="stat-box messages">
                    <strong>Messages</strong>
                    <div>Sent: <span class="sent">0</span></div>
                    <div>Received: <span class="received">0</span></div>
                </div>
                <div class="stat-box bandwidth">
                    <strong>Bandwidth</strong>
                    <div>Total: <span class="bytes">0</span> bytes</div>
                </div>
            </div>
            <div class="stat-box">
                <strong>Connections</strong>
                <div class="peers"></div>
            </div>
            <div class="stat-box">
                <strong>Events</strong>
                <div class="event-log"></div>
            </div>
        `, this.bootstrap.panel());
    }

    update(eventData: any): void { // Type 'any' for eventData as its structure is not defined
        const { type, data, timestamp } = eventData;
        const stats = data.stats;

        // Update metrics
        let r = this.ele[0] as HTMLElement; // Cast to HTMLElement
        if (!r) return;
        const sentSpan = r.querySelector('.sent');
        const receivedSpan = r.querySelector('.received');
        const bytesSpan = r.querySelector('.bytes');
        const peerList = r.querySelector('.peers');
        const eventLog = r.querySelector('.event-log');


        if (sentSpan) sentSpan.textContent = stats.messagesSent;
        if (receivedSpan) receivedSpan.textContent = stats.messagesReceived;
        if (bytesSpan) bytesSpan.textContent = stats.bytesTransferred;

        // Update peer list
        if (peerList) {
            peerList.innerHTML = ''; // Clear existing content
            $(peerList).append(stats.awareness.map(this.renderPeerBadge.bind(this)));
        }


        this.events.unshift({ type, timestamp, data });
        this.events = this.events.slice(0, this.maxEvents);

        if (eventLog) {
            eventLog.innerHTML = ''; // Clear existing content
            $(eventLog).append(this.events.map(this.renderEventEntry.bind(this)));
        }
    }

    renderPeerBadge(peer: any): JQuery<HTMLElement> { // Type 'any' for peer as its type is not defined
        return $(`<div class="peer-badge">${peer.metadata.clientID} (${new Date(peer.lastActive).toLocaleTimeString()})</div>`) as JQuery<HTMLElement>;
    }

    renderEventEntry(event: any): JQuery<HTMLElement> { // Type 'any' for event as its type is not defined
        return $(`<div class="event-entry ${event.type}>[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type} ${event.data.peerId ? `(Peer: ${event.data.peerId})` : ''} ${event.data.bytes ? `(${event.data.bytes} bytes)` : ''}</div>`) as JQuery<HTMLElement>;
    }
}

export default class NetView {
    ele: JQuery<HTMLElement>;
    net: any; // Type 'any' for 'net' as its type is not defined in provided files

    constructor(ele: JQuery<HTMLElement>, net: any) {
        this.ele = ele;
        this.net = net;
    }

    render(): JQuery<HTMLElement> { // Changed return type to JQuery<HTMLElement>
        const updateStatus = () => this.ele.empty().append(
            new NetViewer(this.net).ele //'
        );
        this.net.net.on('peers', updateStatus);
        updateStatus();
        return this.ele; // Return the root element
    }
}
