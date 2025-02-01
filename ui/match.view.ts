import $ from 'jquery';
import '/ui/css/match.css';
import {events} from '../core/events';
import {MATCHING_METRICS_UPDATED} from '../core/match'; // Import MATCHING_METRICS_UPDATED Symbol


interface MatchingSettings {
    isProcessing: boolean;
    workerCapacity: number;
    processInterval: number;
    similarityThreshold: number;
    autoAdjustCapacity: boolean;
}

interface HistoryData {
    timestamps: number[];
    pagesProcessed: number[];
    matchesFound: number[];
    workerCapacity: number[];
    queueSize: number[];
    processingRate: number[];
}

interface ActivityEvent {
    type: string;
    message: string;
    icon: string;
    timestamp?: string;
    id?: number;
}

interface Match {
    pageA: string;
    pageB: string;
    similarity: number;
    matchedProperties: string[];
    timestamp: number;
}

interface MatchingMetrics {
    pagesProcessed: number;
    matchesFound: number;
    workerCapacity: number;
    queueSize: number;
    processingRate: number;
    recentMatches: Match[];
    peersCount: number;
}

interface MatchingInterface {
    workerCapacity: number;
    processInterval: number;
    startProcessing: () => void;
    stopProcessing: () => void;
    setWorkerCapacity: (value: number) => void;
    setProcessInterval: (value: number) => void;
    setSimilarityThreshold: (value: number) => void;
    setAutoAdjust: (value: boolean) => void;
    getMetrics: () => MatchingMetrics;
}


class MatchingView {
    matching: MatchingInterface;
    root: JQuery;
    ele: JQuery;
    updateInterval: number = 1000;
    maxLogEntries: number = 50;
    maxHistoryPoints: number = 100;
    activityLog: ActivityEvent[] = [];
    history: HistoryData = {
        timestamps: [], pagesProcessed: [], matchesFound: [],
        workerCapacity: [], queueSize: [], processingRate: []
    };
    settings: MatchingSettings = {
        isProcessing: false,
        workerCapacity: 0,
        processInterval: 0,
        similarityThreshold: 0.5,
        autoAdjustCapacity: true
    };
    updateTimer: any;
    chart: any;

   constructor(root: JQuery, matching: MatchingInterface) {
        this.matching = matching;
        this.root = root;
        this.ele = $('<div>').addClass('matching-dashboard');
        this.settings.workerCapacity = matching.workerCapacity;
        this.settings.processInterval = matching.processInterval / 1000;

        const handleMatchingMetrics = (e: any) => this.updateMetrics(e.detail as MatchingMetrics);
        const handleActivity = (e: any) => this.logActivity(e.detail as ActivityEvent);

        events.on(MATCHING_METRICS_UPDATED, handleMatchingMetrics);
        events.on('activity', handleActivity);
    }

    template(): string {
        const { workerCapacity, processInterval, similarityThreshold, autoAdjustCapacity } = this.settings;
        return `
            <div class="control-panel">
                <div class="panel-section controls">
                    ${this.renderControl('switch', 'Processing', 'processing-toggle')}
                    ${this.renderControl('slider', 'Worker Capacity', 'capacity-slider', workerCapacity * 100)}
                    ${this.renderControl('number', 'Process Interval', 'interval-input', processInterval, 's')}
                    ${this.renderControl('slider', 'Similarity Threshold', 'similarity-slider', similarityThreshold * 100)}
                    ${this.renderControl('switch', 'Auto-Adjust', 'auto-adjust-toggle', autoAdjustCapacity)}
                </div>
            </div>
            <div class="dashboard-grid">
                ${this.renderStatusPanel()}
                ${this.renderActivityPanel()}
                ${this.renderMatchesPanel()}
                ${this.renderPerformancePanel()}
            </div>`;
    }

    renderControl(type: 'switch' | 'slider' | 'number', label: string, id: string, value: string | number | boolean = '', suffix: string = ''): string {
        return type === 'switch' ? `
            <div class="control-group">
                <label class="switch-label">${label}
                    <label class="toggle-switch">
                        <input type="checkbox" id="${id}" ${value ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </label>
            </div>` : type === 'slider' ? `
            <div class="control-group">
                <label>${label}
                    <input type="range" id="${id}" min="0" max="100" value="${value}">
                    <span id="${id}-value">${(value as number).toFixed(1)}%</span>
                </label>
            </div>` : `
            <div class="control-group">
                <label>${label}
                    <input type="number" id="${id}" min="1" max="60" value="${value}">${suffix}
                </label>
            </div>`;
    }

    renderStatusPanel(): string {
        const metrics = ['processing-rate', 'queue-size', 'pages-processed', 'matches-found', 'peers-count', 'worker-capacity'];
        return `
            <div class="dashboard-cell status-panel">
                <h3>Processing Status</h3>
                <div class="status-indicators">
                    ${metrics.map(id => `
                        <div class="status-row">
                            <div class="indicator">
                                <div class="indicator-label">${id.replace(/-/g, ' ').toUpperCase()}</div>
                                <div class="indicator-value" id="${id}">0</div>
                                ${['processing-rate', 'queue-size'].includes(id) ? `<div class="indicator-bar"><div class="bar-fill" id="${id}-bar" style="width: 0%"></div></div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    renderActivityPanel(): string {
        return `
            <div class="dashboard-cell activity-panel">
                <h3>Activity Log</h3>
                <div class="activity-feed" id="activity-log"></div>
            </div>`;
    }

    renderMatchesPanel(): string {
        return `
            <div class="dashboard-cell matches-panel">
                <h3>Recent Matches</h3>
                <div class="matches-list" id="matches-list"></div>
            </div>`;
    }

    renderPerformancePanel(): string {
        return `
            <div class="dashboard-cell performance-panel">
                <h3>Performance History</h3>
                <div class="performance-chart" id="performance-chart">
                    <canvas id="history-canvas"></canvas>
                </div>
            </div>`;
    }

   render(): JQuery {
        this.ele.empty().html(this.template());
        if (this.root && this.root.length) {
            this.root.append(this.ele);
            this.bindControls();
            this.startUpdates();
        } else {
            console.error('Root element for MatchingView is undefined or not found.');
        }
        return this.ele;
    }

    bindControls(): void {
        this.ele.on('change', '#processing-toggle', (e: JQuery.Event) => {
            this.settings.isProcessing = e.currentTarget.checked;
            this.matching[this.settings.isProcessing ? 'startProcessing' : 'stopProcessing']();
            this.logActivity({ type: 'system', message: `Processing ${this.settings.isProcessing ? 'started' : 'stopped'}`, icon: this.settings.isProcessing ? '▶️' : '⏹️' });
        });
        this.ele.on('input', '#capacity-slider', (e: JQuery.Event) => {
            const value = parseFloat(e.currentTarget.value) / 100;
            this.settings.workerCapacity = value;
            this.ele.find('#capacity-value').text(`${value * 100}%`);
            if (!this.settings.autoAdjustCapacity) {
                this.matching.setWorkerCapacity(value);
                this.logActivity({ type: 'config', message: `Worker capacity: ${value * 100}%`, icon: '⚡' });
            }
        });
        this.ele.on('input', '#interval-input', (e: JQuery.Event) => {
            const value = Math.max(1, Math.min(60, parseInt(e.currentTarget.value, 10)));
            this.settings.processInterval = value;
            this.matching.setProcessInterval(value * 1000);
            this.logActivity({ type: 'config', message: `Interval: ${value}s`, icon: '⏱️' });
        });
        this.ele.on('input', '#similarity-slider', (e: JQuery.Event) => {
            const value = parseFloat(e.currentTarget.value) / 100;
            this.settings.similarityThreshold = value;
            this.ele.find('#similarity-value').text(`${value * 100}%`);
            this.matching.setSimilarityThreshold(value);
            this.logActivity({ type: 'config', message: `Threshold: ${value * 100}%`, icon: '🎯' });
        });
        this.ele.on('change', '#auto-adjust-toggle', (e: JQuery.Event) => {
            this.settings.autoAdjustCapacity = e.currentTarget.checked;
            this.matching.setAutoAdjust(this.settings.autoAdjustCapacity);
            this.ele.find('#capacity-slider').prop('disabled', this.settings.autoAdjustCapacity);
            this.logActivity({ type: 'config', message: `Auto-adjust: ${this.settings.autoAdjustCapacity ? 'on' : 'off'}`, icon: '🔄' });
        });
    }

    logActivity(event: ActivityEvent): void {
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
            $log.children().last().fadeOut(300, function () { $(this).remove(); });
        }
    }

    updateMetrics(metrics: MatchingMetrics): void {
        Object.entries(metrics).forEach(([key, value]) => this.animateValue(`#${key}`, value));

        const rate = metrics.processingRate || 0;
        this.ele.find('#processing-rate').text(`${rate.toFixed(1)}/s`);
        this.ele.find('#rate-bar').css('width', `${Math.min(rate * 10, 100)}%`);
        this.ele.find('#queue-bar').css('width', `${Math.min((metrics.queueSize / 20) * 100, 100)}%`);
        this.ele.find('#worker-capacity').text(`${(metrics.workerCapacity * 100).toFixed(1)}%`);

        this.updateHistory(metrics);
        this.updateMatches(metrics.recentMatches || []);
    }

    animateValue(selector: string, newValue: number): void {
        const $el = this.ele.find(selector);
        const current = parseInt($el.text(), 10);
        if (current !== newValue) {
            $el.prop('counter', current).animate({ counter: newValue }, {
                duration: 500,
                step: function (now) { $(this).text(Math.ceil(now)); }
            });
        }
    }

    updateHistory(metrics: MatchingMetrics): void {
        Object.entries(metrics).forEach(([key, value]) => {
            const historyKey = key as keyof HistoryData;
            if (historyKey in this.history) {
                this.history[historyKey].push(value);
                if (this.history[historyKey].length > this.maxHistoryPoints) {
                    this.history[historyKey] = this.history[historyKey].slice(-this.maxHistoryPoints);
                }
            }
        });
        this.updateChart();
    }

    updateMatches(matches: Match[]): void {
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
            $list.children().last().fadeOut(300, function () { $(this).remove(); });
        }
    }

    startUpdates(): void {
        clearInterval(this.updateTimer);
        this.updateTimer = setInterval(() => this.updateMetrics(this.matching.getMetrics()), this.updateInterval);
    }

    stop(): void {
        this.updateTimer && clearInterval(this.updateTimer);
        this.updateTimer = null;
    }

    updateChart(): void {
        if (!this.chart) {
            const canvas = this.ele.find<HTMLCanvasElement>('#history-canvas')[0];
            if (!canvas || !(canvas instanceof HTMLCanvasElement)) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            this.chart = new Chart(ctx, {
                type: 'line',
                     {
                        labels: [],
                        datasets: [
                            {
                                label: 'Pages Processed',
                                 [],
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            },
                            {
                                label: 'Matches Found',
                                 [],
                                borderColor: 'rgba(255, 99, 132, 1)',
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            },
                            {
                                label: 'Worker Capacity',
                                 [],
                                borderColor: 'rgba(54, 162, 235, 1)',
                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            }
                        ]
                    },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        this.chart.data.labels = this.history.timestamps.map(ts => new Date(ts).toLocaleTimeString());
        this.chart.data.datasets[0].data = this.history.pagesProcessed;
        this.chart.data.datasets[1].data = this.history.matchesFound;
        this.chart.data.datasets[2].data = this.history.workerCapacity.map(c => c * 100);
        this.chart.update();
    }
}

export default MatchingView;
