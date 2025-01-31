import DB from './db';
import Matches, { PageProperties, MatchResult } from './matches';
import { Replies } from './replies';

interface ProcessingState {
    pageId: string;
    startTime: number;
}


/**
 * Manages the queue of pages to be processed for matching,
 * including scheduling, prioritization, and worker capacity.
 */
export default class Analysis {
    db: DB;
    matchingEngine: Matches;
    processingQueue: Map<string, ProcessingState> = new Map();
    replyManager: Replies; // Add Replies
    lastProcessed: Map<string, number> = new Map();
    processInterval: number = 5000;
    processTimer: NodeJS.Timeout | null = null;
    workerCapacity: number = 0.5;


    constructor(db: DB, matchingEngine: Matches) {
        this.db = db;
        this.matchingEngine = matchingEngine;
        this.processingQueue = new Map();
        this.lastProcessed = new Map();
        this.replyManager = new Replies(db); // Initialize Replies
    }


    /**
     * Main processing loop executed periodically.
     * Selects a page to process and initiates the matching process.
     */
    async processLoop(): Promise<void> {
        if (!this.shouldProcess()) return;

        const pageToProcess = this.selectNextPage();
        if (!pageToProcess) return;

        await this.processPage(pageToProcess);
    }

    /**
     * Selects the next page to process from the database.
     * Prioritizes pages that haven't been processed recently.
     * @returns ID of the page to process, or null if no page is available.
     */
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

    /**
     * Processes a single page by finding matches and updating processing state.
     * @param pageId - ID of the page to process.
     */
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

    /**
     * Determines if this instance should process a page in this iteration
     * based on worker capacity (probability-based).
     * @returns boolean - True if processing should proceed, false otherwise.
     */
    shouldProcess(): boolean {
        return Math.random() < this.workerCapacity;
    }

    /**
     * Starts the periodic processing loop.
     */
    startProcessing(): void {
        if (!this.processTimer) {
            this.processTimer = setInterval(() => this.processLoop(), this.processInterval);
            console.log('Processing started');
        }
    }

    /**
     * Stops the periodic processing loop.
     */
    stopProcessing(): void {
        if (this.processTimer) {
            clearInterval(this.processTimer as unknown as number);
            this.processTimer = null;
            console.log('Processing stopped');
        }
    }

    /**
     * Sets the interval between processing loops.
     * @param ms - Interval in milliseconds (minimum 1000ms, maximum 60000ms).
     */
    setProcessInterval(ms: number): void {
        this.processInterval = Math.max(1000, Math.min(60000, ms));
        this.stopProcessing();
        this.startProcessing();
        console.log(`Process interval set to ${this.processInterval}ms`);
    }

    /**
     * Sets the worker capacity, controlling the probability of processing in each loop.
     * @param capacity - Worker capacity (0 to 1, where 1 is 100% probability).
     */
    setWorkerCapacity(capacity: number): void {
        this.workerCapacity = Math.max(0, Math.min(1, capacity));
        console.log(`Worker capacity set to ${(this.workerCapacity * 100).toFixed(1)}%`);
    }

    /**
     * Gets the current process interval.
     * @returns Process interval in milliseconds.
     */
    getProcessInterval(): number {
        return this.processInterval;
    }

    /**
     * Gets the current worker capacity.
     * @returns Worker capacity (0 to 1).
     */
    getWorkerCapacity(): number {
        return this.workerCapacity;
    }

    /**
     * Gets the current size of the processing queue.
     * @returns Number of pages currently in the processing queue.
     */
    getQueueSize(): number {
        return this.processingQueue.size;
    }

    /**
     * Finds matches for a given page by comparing it to all other pages in the database.
     * @param pageId - ID of the page to find matches for.
     * @returns Array of MatchResult objects.
     */
    async findMatches(pageId: string): Promise<MatchResult[]> {
        const matches: MatchResult[] = [];
        const page = this.db.get(pageId);
        if (!page) return matches;

        const isQuery = page.getMetadata('isQuery') === true; // Example: Check metadata for 'isQuery' flag
        const content = page.text.toString();
        const properties = this.matchingEngine.extractProperties(content);

        for (const otherPage of this.db.list()) { // Iterate through all pages in DB
            const match = await this._findMatchesForPage(pageId, page, otherPage, properties, isQuery); // Pass isQuery flag
            if (match) {
                matches.push(match);
                if (isQuery) {
                    console.log(`Match found for query page ${pageId} with page ${otherPage.id}`);
                    // Create a reply object for query match
                    const reply = this.replyManager.createReply(pageId, `Match for query: ${page.name}`);
                    if (reply) {
                        reply.setText(`Match found with page: ${otherPage.name} (ID: ${otherPage.id})`);
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Internal helper method to find matches between two pages.
     * @param pageId - ID of the primary page.
     * @param page - NObject of the primary page.
     * @param otherPage - NObject of the page to compare with.
     * @param properties - Properties of the primary page.
     * @param isQuery - Flag indicating if the primary page is a query.
     * @returns MatchResult if a match is found above the similarity threshold, null otherwise.
     * @private
     */
    private async _findMatchesForPage(pageId: string, page: any, otherPage: any, properties: PageProperties, isQuery: boolean): Promise<MatchResult | null> { // Made private
        if (otherPage.id === pageId) return null;

        const otherContent = otherPage.text.toString();
        const otherProps: PageProperties = this.matchingEngine.extractProperties(otherContent);

        const similarity = this.matchingEngine.calculateSimilarity(properties, otherProps);

        if (similarity > this.matchingEngine.similarityThreshold) {
            return {
                pageId: otherPage.id,
                similarity: similarity,
                queryId: isQuery ? pageId : undefined, // Conditionally set queryId
                timestamp: Date.now()
            };
        }
        return null;
    }

    /**
     * Stores the processing results (e.g., matches) for a page.
     * Currently a placeholder, consider how and where to store these results.
     * @param pageId - ID of the processed page.
     * @param properties - Extracted properties of the page.
     * @param matches - Array of MatchResult objects found for the page.
     */
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
