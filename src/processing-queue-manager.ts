import DB from './db';

interface ProcessingState {
    startTime: number;
}


import MatchingEngine, { PageProperties, MatchResult } from './matching-engine';

export default class ProcessingQueueManager {
    db: DB;
    matchingEngine: MatchingEngine;
    processingQueue: Map<string, ProcessingState> = new Map();
    lastProcessed: Map<string, number> = new Map();
    processInterval: number = 5000;
    processTimer: NodeJS.Timeout | null = null;
    workerCapacity: number = 0.5;

    constructor(db: DB, matchingEngine: MatchingEngine) {
        this.db = db;
        this.matchingEngine = matchingEngine;
    }

    // Main processing loop
    async processLoop(): Promise<void> {
        if (!this.shouldProcess()) return;

        const pageToProcess = this.selectNextPage();
        if (!pageToProcess) return;

        await this.processPage(pageToProcess);
    }

    // Select next page to process based on age and processing history (consider different selection strategies)
    selectNextPage(): string | null {
        let oldest: string | null = null;
        let oldestTime: number = Infinity;

        for (const pageId of this.db.list().map(obj => obj.id)) { // Iterate over page IDs directly
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
            await this.findMatches(pageId);
        } catch (error) {
            console.error('Processing error:', error);
        } finally {
            this.processingQueue.delete(pageId);
            this.lastProcessed.set(pageId, Date.now());
        }
    }

    // Determine if this server should process now (consider more sophisticated scheduling algorithms)
    shouldProcess(): boolean {
        return Math.random() < this.workerCapacity;
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

    setProcessInterval(ms: number): void {
        this.processInterval = Math.max(1000, Math.min(60000, ms));
        if (this.processTimer) {
            this.stopProcessing();
            this.startProcessing();
        }
        console.log(`Process interval set to ${this.processInterval}ms`);
    }

    setWorkerCapacity(capacity: number): void {
        this.workerCapacity = Math.max(0, Math.min(1, capacity));
        console.log(`Worker capacity set to ${(this.workerCapacity * 100).toFixed(1)}%`);
    }

    getProcessInterval(): number {
        return this.processInterval;
    }

    getWorkerCapacity(): number {
        return this.workerCapacity;
    }

    getQueueSize(): number {
        return this.processingQueue.size;
    }

    async findMatches(pageId: string): Promise<MatchResult[]> {
        const matches: MatchResult[] = [];
        const page = this.db.get(pageId);
        if (!page) return matches;

        const content = page.text.toString();
        const properties = this.matchingEngine.extractProperties(content);

        for (const otherPage of this.db.list()) {
            const match = await this._findMatchesForPage(pageId, page, otherPage, properties);
            if (match) {
                matches.push(match);
            }
        }

        return matches;
    }

    async _findMatchesForPage(pageId: string, page: any, otherPage: any, properties: PageProperties): Promise<MatchResult | null> {
        if (otherPage.id === pageId) return null;

        const otherContent = otherPage.text.toString();
        const otherProps: PageProperties = this.matchingEngine.extractProperties(otherContent);

        const similarity = this.matchingEngine.calculateSimilarity(properties, otherProps);

        if (similarity > this.matchingEngine.similarityThreshold) {
            return {
                pageId: otherPage.id,
                similarity,
                timestamp: Date.now()
            };
        }
        return null;
    }

    storeResults(pageId: string, properties: PageProperties, matches: MatchResult[]): void {
        const page = this.db.get(pageId);
        if (page) {
            // Example: Storing matches as metadata (consider data structure and size limits)
            // page.metadata.set('matchingProperties', properties);
            // page.metadata.set('pageMatches', matches);
            // console.log(`Stored results for page ${pageId}: ${matches.length} matches found.`);
        }
    }
}

export { ProcessingState };