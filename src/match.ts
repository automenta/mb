import { events } from './events';
import DB from './db';
import Network from './net';

interface ProcessingState {
    startTime: number;
}

interface Metrics {
    pagesProcessed: number;
    matchesFound: number;
    processingTime: number;
    lastUpdate: number;
    queueSize?: number;
    workerCapacity?: number;
    peersCount?: number;
}

interface PageProperties {
    topics: string[];
    length: number;
    complexity: number;
    timestamp: number;
}

interface MatchResult {
    pageId: string;
    similarity: number;
    timestamp: number;
}

export default class Matching {
    db: DB;
    net: Network;
    processingQueue: Map<string, ProcessingState> = new Map();
    workerCapacity: number = 0.5;
    lastProcessed: Map<string, number> = new Map();
    processInterval: number = 5000;
    metrics: Metrics = {
        pagesProcessed: 0,
        matchesFound: 0,
        processingTime: 0,
        lastUpdate: Date.now()
    };
    processTimer: NodeJS.Timeout | null = null;
    similarityThreshold: number = 0.5; // Default similarity threshold
    autoAdjustCapacity: boolean = false; // Auto-adjust worker capacity based on network size

    constructor(db: DB, net: Network) {
        this.db = db;
        this.net = net;

        // Start processing loop (consider starting this externally or via a method call)
        // this.startProcessing();

        // Listen for new/changed pages (consider if this should be enabled by default or configurable)
        // this.onPagesChanged();

        // Network coordination (consider if this should be enabled by default or configurable)
        // this.net.awareness().on('change', () => this.coordinated());
    }

    on(event: string, listener: (...args: any[]) => void): void {
        // TODO: Implement event handling if needed
    }

    // Main processing loop
    async processLoop(): Promise<void> {
        if (!this.shouldProcess()) return;

        const pageToProcess = this.selectNextPage();
        if (!pageToProcess) return;

        await this.processPage(pageToProcess);
        this.updateMetrics();
    }

    // Select next page to process based on age and processing history (consider different selection strategies)
    selectNextPage(): string | null {
        let oldest: string | null = null;
        let oldestTime: number = Infinity;

        for (const pageId of this.db.query().list().map(obj => obj.id)) { // Iterate over page IDs directly
            const lastTime = this.lastProcessed.get(pageId) || 0;
            if (lastTime < oldestTime && !this.processingQueue.has(pageId)) {
                oldest = pageId;
                oldestTime = lastTime;
            }
        }

        return oldest;
    }

    // Process a single page (consider breaking down into smaller, testable functions)
    async processPage(pageId: string): Promise<void> {
        const startTime = Date.now();
        this.processingQueue.set(pageId, { startTime });

        try {
            const page = this.db.get(pageId);
            if (!page) {
                console.warn(`Page not found: ${pageId}`);
                return;
            }
            const content = page.text.toString(); // Access text content directly

            // Extract semantic properties (simplified example - consider making this pluggable/configurable)
            const properties: PageProperties = this.extractProperties(content);

            // Find matches across other pages
            const matches: MatchResult[] = await this.findMatches(pageId, properties);

            // Store results (consider what results to store and how)
            this.storeResults(pageId, properties, matches);

            this.metrics.pagesProcessed++;
            this.metrics.matchesFound += matches.length;

        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            this.processingQueue.delete(pageId);
            this.lastProcessed.set(pageId, Date.now());
        }
    }

    // Extract semantic properties from content (consider using NLP libraries or more advanced techniques)
    extractProperties(content: string): PageProperties {
        // Simplified example - in reality would use more sophisticated NLP
        const topics = new Set(content.toLowerCase()
            .split(/[^a-z]+/)
            .filter(w => w.length > 4));

        return {
            topics: Array.from(topics),
            length: content.length,
            complexity: content.split(/[.!?]+/).length, // Consider more robust complexity metrics
            timestamp: Date.now()
        };
    }

    // Find matching pages (consider different matching algorithms and filtering options)
    async findMatches(pageId: string, properties: PageProperties): Promise<MatchResult[]> {
        const matches: MatchResult[] = [];

        for (const otherPage of this.db.query().list()) { // Iterate over NObject directly
            if (otherPage.id === pageId) continue;

            const otherContent = otherPage.text.toString(); // Access text content directly
            const otherProps: PageProperties = this.extractProperties(otherContent);

            // Calculate similarity (consider different similarity metrics)
            const similarity = this.calculateSimilarity(properties, otherProps);

            if (similarity > this.similarityThreshold) { // Use similarityThreshold property
                matches.push({
                    pageId: otherPage.id,
                    similarity,
                    timestamp: Date.now()
                });
            }
        }

        return matches;
    }

    // Calculate similarity between pages (consider different similarity algorithms)
    calculateSimilarity(propsA: PageProperties, propsB: PageProperties): number {
        const commonTopics = propsA.topics.filter(t =>
            propsB.topics.includes(t)).length;

        if (propsA.topics.length === 0 || propsB.topics.length === 0) return 0; // Avoid division by zero

        return commonTopics /
            Math.max(propsA.topics.length, propsB.topics.length);
    }

    // Store processing results (consider storing in a separate collection or using NObject metadata)
    storeResults(pageId: string, properties: PageProperties, matches: MatchResult[]): void {
        const page = this.db.get(pageId);
        if (page) {
            // Example: Storing matches as metadata (consider data structure and size limits)
            // page.metadata.set('matchingProperties', properties);
            // page.metadata.set('pageMatches', matches);
            // console.log(`Stored results for page ${pageId}: ${matches.length} matches found.`);
        }
    }

    // Coordinate processing with other nodes (consider more sophisticated coordination mechanisms)
    coordinated(): void {
        if (!this.autoAdjustCapacity) return;
        const peers = Array.from(this.net.awareness().getStates().keys());
        const myPosition = peers.indexOf(this.net.awareness().clientID);

        if (myPosition === -1) return;

        // Adjust work capacity based on position in peer list (consider more dynamic adjustment strategies)
        this.workerCapacity = 1 / (peers.length || 1);
    }

    // Determine if this server should process now (consider more sophisticated scheduling algorithms)
    shouldProcess(): boolean {
        return Math.random() < this.workerCapacity;
    }

    // Update metrics (consider more comprehensive metrics and logging)
    updateMetrics(): void {
        this.metrics.lastUpdate = Date.now();
        this.metrics.processingTime += this.processInterval;
        this.metrics.queueSize = this.processingQueue.size; // Update queue size
        this.metrics.workerCapacity = this.workerCapacity; // Update worker capacity
        this.metrics.peersCount = this.net.awareness().getStates().size; // Update peers count

        // Emit metrics for dashboard (consider throttling or batching metrics emissions)
        events.emit('matching-metrics', {
            detail: this.metrics // Send the entire metrics object
        });
    }

    getMetrics(): Metrics {
        return this.metrics; // Return the entire metrics object
    }


    startProcessing(): void {
        if (this.processTimer) return;

        this.processTimer = setInterval(() => this.processLoop(), this.processInterval);
        console.log('Processing started');
    }

    stopProcessing(): void {
        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
            console.log('Processing stopped');
        }
    }

    setWorkerCapacity(capacity: number): void {
        this.workerCapacity = Math.max(0, Math.min(1, capacity));
        console.log(`Worker capacity set to ${(this.workerCapacity * 100).toFixed(1)}%`);
    }

    setProcessInterval(ms: number): void {
        this.processInterval = Math.max(1000, Math.min(60000, ms));
        if (this.processTimer) {
            this.stopProcessing();
            this.startProcessing();
        }
        console.log(`Process interval set to ${this.processInterval}ms`);
    }

    setSimilarityThreshold(threshold: number): void {
        this.similarityThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`Similarity threshold set to ${(this.similarityThreshold * 100).toFixed(1)}%`);
    }

    setAutoAdjust(enabled: boolean): void {
        this.autoAdjustCapacity = enabled;
        if (enabled)
            this.coordinated(); // Immediately adjust based on peers

        console.log(`Auto-adjust capacity ${enabled ? 'enabled' : 'disabled'}`);
    }


    onPagesChanged(): void {
        // TODO: Implement page change handling if needed
    }
}

