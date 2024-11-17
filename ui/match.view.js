import $ from 'jquery';
import '/ui/css/match.css';
import {events} from '../src/events.ts';

class MatchingView {
    constructor(root, matching) {
        this.matching = matching;
        this.root = root;
        this.ele = $('<div>').addClass('matching-dashboard');
        this.updateInterval = 1000;
        this.maxLogEntries = 50;
        this.maxHistoryPoints = 100;
        this.activityLog = [];
        this.history = {
            timestamps: [], pagesProcessed: [], matchesFound: [],
            workerCapacity: [], queueSize: [], processingRate: []
        };
        this.settings = {
            isProcessing: false,
            workerCapacity: matching.workerCapacity,
            processInterval: matching.processInterval / 1000,
            similarityThreshold: 0.5,
            autoAdjustCapacity: true
        };

        events.on('matching-metrics', e => this.updateMetrics(e.detail));
        events.on('activity', e => this.logActivity(e));
    }

    template() {
        const s = this.settings;
        return `
            <div class="control-panel">
                <div class="panel-section controls">
                    ${this.renderControl('switch', 'Processing', 'processing-toggle')}
                    ${this.renderControl('slider', 'Worker Capacity', 'capacity-slider', s.workerCapacity * 100)}
                    ${this.renderControl('number', 'Process Interval', 'interval-input', s.processInterval, 's')}
                    ${this.renderControl('slider', 'Similarity Threshold', 'similarity-slider', s.similarityThreshold * 100)}
                    ${this.renderControl('switch', 'Auto-Adjust', 'auto-adjust-toggle', s.autoAdjustCapacity)}
                </div>
            </div>
            <div class="dashboard-grid">
                ${this.renderStatusPanel()}
                ${this.renderActivityPanel()}
                ${this.renderMatchesPanel()}
                ${this.renderPerformancePanel()}
            </div>`;
    }

    renderControl(type, label, id, value = '', suffix = '') {
        const controls = {
            switch: () => `
                <label class="switch-label">${label}
                    <label class="toggle-switch">
                        <input type="checkbox" id="${id}" ${value ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </label>`,
            slider: () => `
                <label>${label}
                    <input type="range" id="${id}" min="0" max="100" value="${value}">
                    <span id="${id}-value">${value.toFixed(1)}%</span>
                </label>`,
            number: () => `
                <label>${label}
                    <input type="number" id="${id}" min="1" max="60" value="${value}">${suffix}
                </label>`
        };
        return `<div class="control-group">${controls[type]()}</div>`;
    }

    renderStatusPanel() {
        return `
            <div class="dashboard-cell status-panel">
                <h3>Processing Status</h3>
                <div class="status-indicators">
                    ${['processing-rate', 'queue-size'].map(id => `
                        <div class="status-row">
                            <div class="indicator">
                                <div class="indicator-label">${id.replace('-', ' ').toUpperCase()}</div>
                                <div class="indicator-value" id="${id}">0</div>
                                <div class="indicator-bar">
                                    <div class="bar-fill" id="${id}-bar" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                    <div class="status-row">
                        ${this.renderMetricPair('pages-processed', 'matches-found')}
                    </div>
                    <div class="status-row">
                        ${this.renderMetricPair('peers-count', 'worker-capacity')}
                    </div>
                </div>
            </div>`;
    }

    renderMetricPair(id1, id2) {
        return ['metric', id1, id2].reduce((html, id) =>
            html + `<div class="${id}"><span class="${id}-label"></span>
            <span class="${id}-value" id="${id}">0</span></div>`, '');
    }

    renderActivityPanel() {
        return `
            <div class="dashboard-cell activity-panel">
                <h3>Activity Log</h3>
                <div class="activity-feed" id="activity-log"></div>
            </div>`;
    }

    renderMatchesPanel() {
        return `
            <div class="dashboard-cell matches-panel">
                <h3>Recent Matches</h3>
                <div class="matches-list" id="matches-list"></div>
            </div>`;
    }

    renderPerformancePanel() {
        return `
            <div class="dashboard-cell performance-panel">
                <h3>Performance History</h3>
                <div class="performance-chart" id="performance-chart">
                    <canvas id="history-canvas"></canvas>
                </div>
            </div>`;
    }

    render() {
        this.ele.empty();
        this.root.find('.main-view').empty().append(this.ele);
        this.ele.html(this.template());
        this.bindControls();
        this.startUpdates();
        return this.ele;
    }

    bindControls() {
        const controls = {
            'processing-toggle': (e) => {
                this.settings.isProcessing = e.target.checked;
                this.matching[e.target.checked ? 'startProcessing' : 'stopProcessing']();
                this.logActivity({
                    type: 'system',
                    message: `Processing ${e.target.checked ? 'started' : 'stopped'}`,
                    icon: e.target.checked ? '▶️' : '⏹️'
                });
            },
            'capacity-slider': (e) => {
                const value = e.target.value / 100;
                this.settings.workerCapacity = value;
                this.ele.find('#capacity-value').text(e.target.value + '%');
                if (!this.settings.autoAdjustCapacity) {
                    this.matching.setWorkerCapacity(value);
                    this.logActivity({
                        type: 'config',
                        message: `Worker capacity: ${e.target.value}%`,
                        icon: '⚡'
                    });
                }
            },
            'interval-input': (e) => {
                const value = Math.max(1, Math.min(60, parseInt(e.target.value)));
                this.settings.processInterval = value;
                this.matching.setProcessInterval(value * 1000);
                this.logActivity({
                    type: 'config',
                    message: `Interval: ${value}s`,
                    icon: '⏱️'
                });
            },
            'similarity-slider': (e) => {
                const value = e.target.value / 100;
                this.settings.similarityThreshold = value;
                this.ele.find('#similarity-value').text(e.target.value + '%');
                this.matching.setSimilarityThreshold(value);
                this.logActivity({
                    type: 'config',
                    message: `Threshold: ${e.target.value}%`,
                    icon: '🎯'
                });
            },
            'auto-adjust-toggle': (e) => {
                this.settings.autoAdjustCapacity = e.target.checked;
                this.matching.setAutoAdjust(e.target.checked);
                this.ele.find('#capacity-slider').prop('disabled', e.target.checked);
                this.logActivity({
                    type: 'config',
                    message: `Auto-adjust: ${e.target.checked ? 'on' : 'off'}`,
                    icon: '🔄'
                });
            }
        };

        Object.entries(controls).forEach(([id, handler]) =>
            this.ele.find(`#${id}`).on('change input', handler));
    }

    logActivity(event) {
        const entry = { ...event, timestamp: new Date().toLocaleTimeString(), id: Date.now() };
        this.activityLog.unshift(entry);
        this.activityLog = this.activityLog.slice(0, this.maxLogEntries);

        const $log = this.ele.find('#activity-log');
        const $newEntry = $(`
            <div class="activity-entry ${event.type}" style="opacity: 0">
                <span class="activity-icon">${event.icon}</span>
                <span class="activity-message">${event.message}</span>
                <span class="activity-time">${entry.timestamp}</span>
            </div>
        `).prependTo($log).animate({ opacity: 1 }, 300);

        if ($log.children().length > this.maxLogEntries) {
            $log.children().last().fadeOut(300, function() { $(this).remove(); });
        }
    }

    updateMetrics(metrics) {
        Object.entries(metrics).forEach(([key, value]) =>
            this.animateValue(`#${key}`, value));

        const rate = metrics.processingRate || 0;
        $('#processing-rate').text(`${rate.toFixed(1)}/s`);
        $('#rate-bar').css('width', `${Math.min(rate * 10, 100)}%`);
        $('#queue-bar').css('width', `${Math.min((metrics.queueSize / 20) * 100, 100)}%`);
        $('#worker-capacity').text(`${(metrics.workerCapacity * 100).toFixed(1)}%`);

        this.updateHistory(metrics);
        this.updateMatches(metrics.recentMatches || []);
    }

    animateValue(selector, newValue) {
        const $el = this.ele.find(selector);
        const current = parseInt($el.text());
        if (current !== newValue) {
            $el.prop('counter', current).animate({ counter: newValue }, {
                duration: 500,
                step: function(now) { $(this).text(Math.ceil(now)); }
            });
        }
    }

    updateHistory(metrics) {
        Object.entries(metrics).forEach(([key, value]) => {
            if (key in this.history) {
                this.history[key].push(value);
                if (this.history[key].length > this.maxHistoryPoints) {
                    this.history[key] = this.history[key].slice(-this.maxHistoryPoints);
                }
            }
        });
        this.updateChart();
    }

    updateMatches(matches) {
        const $list = this.ele.find('#matches-list');
        matches.forEach(match => {
            $(`
                <div class="match-entry" style="opacity: 0">
                    <div class="match-header">
                        <span class="match-title">${match.pageA} ↔ ${match.pageB}</span>
                        <span class="match-score">${(match.similarity * 100).toFixed(1)}%</span>
                    </div>
                    <div class="match-details">
                        <div class="match-properties">${match.matchedProperties.join(', ')}</div>
                        <div class="match-time">${new Date(match.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
            `).prependTo($list).animate({ opacity: 1 }, 300);
        });

        while ($list.children().length > 10) {
            $list.children().last().fadeOut(300, function() { $(this).remove(); });
        }
    }

    startUpdates() {
        if (this.updateTimer) clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() =>
            this.updateMetrics(this.matching.getMetrics()), this.updateInterval);
    }

    stop() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    }

    updateChart() {
        //TODO
    }
}

export default MatchingView;