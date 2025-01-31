import $ from 'jquery';
import {events} from '../core/events';
import Network, {NETWORK_ACTIVITY} from '../core/net'; // Import Network class // Import Symbol
import '/ui/css/net.css';

/**
 * Creates a stat box element.
 */
function createStatBox(title: string, ...contentLines: { label: string, className: string }[]): JQuery {
    const box = $('<div>').addClass('stat-box').append(
        $('<strong>').text(title)
    );
    contentLines.forEach(({label, className}) => {
        box.append(
            $('<div>').append(
                `${label}: `,
                $('<span class="' + className + '">0</span>')
            )
        );
    });
    return box;
}

class BootstrapView { // Corrected class definition
    net: Network;
    addButton: JQuery;
    $input: JQuery;
    $nodeList: JQuery;

    constructor(net: Network) {
        this.net = net;
        this.addButton = $('<button>').text("+") as JQuery;
        this.$input = $('<input>').attr('placeholder', 'bootstrap') as JQuery;
        this.$nodeList = $('<div>') as JQuery;

        this.addButton.click(() => {
            const url = this.$input.val()?.toString().trim(); // Ensure url is a string before trimming
            if (url && this.validateURL(url)) {
                this.net.addBootstrap(url);
                this.$input.val('');
                this.update();
            } else {
                alert('Please enter a valid signaling core URL.');
            }
        });

        this.$nodeList.on('click', '.remove-core', (e) => {
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

    renderNode(url: string): JQuery {
        return $(`<li>${url}<button class="remove-server" data-url="${url}">Remove</button></li>`) as JQuery;
    }

    panel(): JQuery {
        return $('<div>').append('<h2>Bootstrap Nodes</h2>', this.$nodeList, this.$input, this.addButton) as JQuery;
    }
}


class NetViewer { // Corrected class definition
    net: Network;
    ele: JQuery;
    events: any[] = []; // Type 'any[]' for 'events' as its type is not defined
    maxEvents: number = 100;
    bootstrap: BootstrapView;
    $peerList: JQuery; // Declare $peerList

    constructor(net: Network) {
        this.net = net;
        this.ele = $('<div>').addClass('net-viewer') as JQuery;
        this.bootstrap = new BootstrapView(net);
        this.$peerList = $('<ul>').addClass('peer-list'); // Initialize $peerList
        this.render();
        events.on(NETWORK_ACTIVITY, (e: any) => this.update((e as CustomEvent).detail)); // Use Symbol
    }

    render(): void {
        this.ele.append(`
            <h3>Network</h3>
            <div class="stats-grid"></div>

            <div class="stat-box">
                <strong>Peers</strong>
                <div class="peers"></div>
                <div class="peer-list"></div>
            </div>
         `,
      this.bootstrap.panel()
    );
    this.ele.find(".peer-list").append(this.$peerList);

        // Append stat boxes to the stats-grid div
        const statsGrid = this.ele.find('.stats-grid');
        statsGrid.append(
            createStatBox('Messages', {label: 'Sent', className: 'sent'}, {label: 'Received', className: 'received'}),
            createStatBox('Bandwidth', {label: 'Total', className: 'bytes'})
        );
    }


    update(eventData: any = {}): void {
        // Handle undefined eventData or missing properties
        const { type, data = {}, timestamp } = eventData;
        const stats = data.stats || {};
    // Update metrics
    const sentSpan = this.ele.find(".sent");
    const receivedSpan = this.ele.find(".received");
    const bytesSpan = this.ele.find(".bytes");
    const peerList = this.ele.find(".peers");
    const eventLog = this.ele.find(".event-log");
    const connectionStatusSpan = this.ele.find(".connection-status");

    if (connectionStatusSpan) connectionStatusSpan.text(this.connectionStatus);

    if (sentSpan) sentSpan.text(stats.messagesSent);
    if (receivedSpan) receivedSpan.text(stats.messagesReceived);
    if (bytesSpan) bytesSpan.text(stats.bytesTransferred);

    // Update peer list
    if (peerList) {
      peerList.empty(); // Clear existing content
      if (stats.awareness) {
        peerList.append(stats.awareness.map(this.renderPeerBadge.bind(this)));
      }
    }

    // Update peer list in $peerList
    this.$peerList.empty(); // Clear existing list
    if (this.net.peers)
      this.$peerList.append(
        Array.from(this.net.peers.values()).map(this.renderPeerListItem.bind(this))
      );

        this.events.unshift({ type, timestamp, data });
    this.events = this.events.slice(0, this.maxEvents);

    if (eventLog) {
      eventLog.empty(); // Clear existing content
      eventLog.append(this.events.map(this.renderEventEntry.bind(this)));
    }
  }

  renderPeerBadge(peer: any): JQuery {
    // Type 'any' for peer as its type is not defined
    return $(
      `<div class="peer-badge">${peer.metadata.clientID} (${new Date(
        peer.lastActive
      ).toLocaleTimeString()})</div>`
    ) as JQuery;
  }

  renderPeerListItem(peer: any): JQuery {
    // Type 'any' for peer, adjust if you have Peer interface available
    return $(
      `<li>${peer.address}:${peer.port} - Last Seen: ${new Date(
        peer.lastSeen
      ).toLocaleTimeString()}</li>`
    ) as JQuery;
  }

  renderEventEntry(event: any): JQuery {
    // Type 'any' for event as its type is not defined
    return $(
      `<div class="event-entry ${
        event.type
      }">[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type} ${
        event.data.peerId ? `(Peer: ${event.data.peerId})` : ""
      } ${event.data.bytes ? `(${event.data.bytes} bytes)` : ""}</div>`
    ) as JQuery;
  }
}

export default class NetView {
  ele: JQuery;
  net: Network;

  constructor(ele: JQuery, net: Network) {
    // Corrected constructor type
    this.ele = ele;
    this.net = net;
  }

  render(): JQuery {
    // Changed return type to JQuery<HTMLElement>
    const updateStatus = () => this.ele.empty().append(new NetViewer(this.net).ele);
    this.net.net.on("peers", updateStatus);
    updateStatus();
    return this.ele; // Return the root element
  }
}
