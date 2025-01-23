import $ from 'jquery';
import {events} from '../src/events.ts';

import '/ui/css/net.css';

class BootstrapView {
    constructor(net) {
        this.net = net;
        this.addButton = $('<button>').text("+");
        this.$input = $('<input>').attr('placeholder', 'bootstrap');
        this.$nodeList = $('<div>');

        this.addButton.click(() => {
            const url = this.$input.val().trim();
            if (this.validateURL(url)) {
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

    validateURL(url) {
        //return validateURL(url);
        return true;
    }

    update() {
        this.$nodeList.empty().append(this.net.signalingServers.map(this.renderNode).toArray());
    }

    renderNode(url) {
        return $(`<li>${url}<button class="remove-node" data-url="${url}">Remove</button></li>`);
    }

    panel() {
        return $('<div>').append('<h2>Bootstrap Nodes</h2>', this.$nodeList, this.$input, this.addButton);
    }
}


class NetViewer  {
    constructor(net) {
        this.net = net;
        this.ele = $('<div>').addClass('net-viewer');
        this.events = [];
        this.maxEvents = 100;
        this.bootstrap = new BootstrapView(net);
        this.render();
        events.on('networkActivity', e => this.update(e.detail));
    }

    render() {
        $(this.ele).append(`
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

    update(eventData) {
        const { type, data, timestamp } = eventData;
        const stats = data.stats;

        // Update metrics
        let r = this.ele[0];
        r.querySelector('.sent').textContent = stats.messagesSent;
        r.querySelector('.received').textContent = stats.messagesReceived;
        r.querySelector('.bytes').textContent = stats.bytesTransferred;

        // Update peer list
        const peerList = r.querySelector('.peers');
        peerList.empty().append(stats.awareness.map(this.renderPeerBadge.bind(this)).toArray());

        this.events.unshift({type, timestamp, data});
        this.events = this.events.slice(0, this.maxEvents);

        r.querySelector('.event-log').empty().append(this.events.map(this.renderEventEntry.bind(this)).toArray());
    }

    renderPeerBadge(peer) {
        return $(`<div class="peer-badge">${peer.metadata.clientID} (${new Date(peer.lastActive).toLocaleTimeString()})</div>`);
    }

    renderEventEntry(event) {
        return $(`<div class="event-entry ${event.type}>[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type} ${event.data.peerId ? `(Peer: ${event.data.peerId})` : ''} ${event.data.bytes ? `(${event.data.bytes} bytes)` : ''}</div>`);
    }
}

export default class NetView {
    constructor(ele, net) {
        this.ele = ele;
        this.net = net;
    }

    render() {
        const updateStatus = () => this.ele.empty().append(
            new NetViewer(this.net).ele //'<network-view></network-view>'
        );
        this.net.net.on('peers', updateStatus);
        updateStatus();
    }
}
