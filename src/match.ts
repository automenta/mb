import { events } from './events';
import DB from './db';
import Network from './net';
import MatchingEngine, { PageProperties, MatchResult } from './matching-engine';
import ProcessingQueueManager, { ProcessingState } from './processing-queue-manager';

interface Metrics {
    pagesProcessed: number;
    matchesFound: number;
    processingTime: number;
    lastUpdate: number;
    queueSize?: number;
    workerCapacity?: number;
    peersCount?: number;
}


export default class Matching {
    db: DB;
    net: Network;
    matchingEngine: MatchingEngine;
    processingQueueManager: ProcessingQueueManager;
    metrics: Metrics = {
        pagesProcessed: 0,
        matchesFound: 0,
        processingTime: 0,
        lastUpdate: Date.now()
    };
    processTimer: NodeJS.Timeout | null = null;
    autoAdjustCapacity: boolean = false; // Auto-adjust worker capacity based on network size

    constructor(db: DB, net: Network) {
        this.db = db;
        this.net = net;
        this.matchingEngine = new MatchingEngine(db);
        this.processingQueueManager = new ProcessingQueueManager(db, this.matchingEngine);

        // Start processing loop (consider starting this externally or via a method call)
        this.startProcessing();

        // Listen for new/changed pages (consider if this should be enabled by default or configurable)
        this.onPagesChanged();
        
        // Network coordination (consider if this should be enabled by default or configurable)
        this.net.awareness().on('change', () => this.coordinated());
    }

    on(event: string, listener: (...args: any[]) => void): void {
        // TODO: Implement event handling if needed
    }

    // Main processing loop
    async processLoop(): Promise<void> {
        await this.processingQueueManager.processLoop();
        this.updateMetrics();
    }

    // Select next page to process based on age and processing history (consider different selection strategies)
    selectNextPage(): string | null {
        return this.processingQueueManager.selectNextPage();
    }

    // Process a single page (consider breaking down into smaller, testable functions)
    async processPage(pageId: string): Promise<void> {
        try {
            const page = this.db.get(pageId);
            if (!page) {
                console.warn(`Page not found: ${pageId}`);
                return;
            }
            const content = page.text.toString(); // Access text content directly

            // Extract semantic properties (simplified example - consider making this pluggable/configurable)
            const properties: PageProperties = this.matchingEngine.extractProperties(content);

            // Find matches across other pages
            const matches: MatchResult[] = await this.matchingEngine.findMatches(pageId, properties);

            // Store results (consider what results to store and how)
            this.matchingEngine.storeResults(pageId, properties, matches);

            this.metrics.pagesProcessed++;
            this.metrics.matchesFound += matches.length;

        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            // Cleanup moved to ProcessingQueueManager
        }
    }


    // Coordinate processing with other nodes (consider more sophisticated coordination mechanisms)
    coordinated(): void {
        if (!this.autoAdjustCapacity) return;
        const peers = Array.from(this.net.awareness().getStates().keys());
        const myPosition = peers.indexOf(this.net.awareness().clientID);

        if (myPosition === -1) return;

        // Adjust work capacity based on position in peer list (consider more dynamic adjustment strategies)
        this.processingQueueManager.setWorkerCapacity(1 / (peers.length || 1));
    }

    // Determine if this server should process now (consider more sophisticated scheduling algorithms)
    shouldProcess(): boolean {
        return this.processingQueueManager.shouldProcess();
    }

    // Update metrics (consider more comprehensive metrics and logging)
    updateMetrics(): void {
        this.metrics.lastUpdate = Date.now();
        this.metrics.processingTime += this.processingQueueManager.getProcessInterval();
        this.metrics.queueSize = this.processingQueueManager.getQueueSize(); // Update queue size
        this.metrics.workerCapacity = this.processingQueueManager.getWorkerCapacity(); // Update worker capacity
        this.metrics.peersCount = this.net.awareness()?.getStates()?.size; // Update peers count

        // Emit metrics for dashboard (consider throttling or batching metrics emissions)
        events.emit('matching-metrics', {
            detail: this.metrics // Send the entire metrics object
        });
    }

    getMetrics(): Metrics {
        return this.metrics; // Return the entire metrics object
    }


    startProcessing(): void {
        this.processingQueueManager.startProcessing();
    }

    stopProcessing(): void {
        this.processingQueueManager.stopProcessing();
    }

    setWorkerCapacity(capacity: number): void {
        this.processingQueueManager.setWorkerCapacity(capacity);
        console.log(`Worker capacity set to ${(this.processingQueueManager.getWorkerCapacity() * 100).toFixed(1)}%`);
    }

    setProcessInterval(ms: number): void {
        this.processingQueueManager.setProcessInterval(ms);
        console.log(`Process interval set to ${this.processingQueueManager.getProcessInterval()}ms`);
    }

    setSimilarityThreshold(threshold: number): void {
        this.matchingEngine.setSimilarityThreshold(threshold);
        console.log(`Similarity threshold set to ${(this.matchingEngine.similarityThreshold * 100).toFixed(1)}%`);
    }

    setAutoAdjust(enabled: boolean): void {
        this.autoAdjustCapacity = enabled;
        this.coordinated(); // Immediately adjust based on peers

        console.log(`Auto-adjust capacity ${enabled ? 'enabled' : 'disabled'}`);
    }


    onPagesChanged(): void {
        // TODO: Implement page change handling if needed
    }
}
