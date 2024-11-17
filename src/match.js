export default class Matching {

    constructor(db, net) {
        this.db = db;
        this.net = net;
        this.processingQueue = new Map(); // pageId -> processing state
        this.workerCapacity = 0.5; // 0-1 scale of how much processing to take on
        this.lastProcessed = new Map(); // pageId -> timestamp
        this.processInterval = 5000; // Check every 5 seconds
        this.metrics = {
            pagesProcessed: 0,
            matchesFound: 0,
            processingTime: 0,
            lastUpdate: Date.now()
        };

        // Start processing loop
        setInterval(() => this.processLoop(), this.processInterval);

        // Listen for new/changed pages
        this.db.pages.observe(() => this.onPagesChanged());

        // Network coordination
        this.net.awareness().on('change', () => this.coordinated());
    }

    on(event, listener) {
        //TODO
    }

    // Main processing loop
    async processLoop() {
        if (!this.shouldProcess()) return;

        const pageToProcess = this.selectNextPage();
        if (!pageToProcess) return;

        await this.processPage(pageToProcess);
        this.updateMetrics();
    }

    // Select next page to process based on age and processing history
    selectNextPage() {
        let oldest = null;
        let oldestTime = Infinity;

        for (const [pageId, page] of this.db.pages.entries()) {
            const lastTime = this.lastProcessed.get(pageId) || 0;
            if (lastTime < oldestTime && !this.processingQueue.has(pageId)) {
                oldest = pageId;
                oldestTime = lastTime;
            }
        }

        return oldest;
    }

    // Process a single page
    async processPage(pageId) {
        const startTime = Date.now();
        this.processingQueue.set(pageId, { startTime });

        try {
            const page = this.db.page(pageId);
            const content = this.db.pageContent(pageId).toString();

            // Extract semantic properties (simplified example)
            const properties = this.extractProperties(content);

            // Find matches across other pages
            const matches = await this.findMatches(pageId, properties);

            // Store results
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

    // Extract semantic properties from content
    extractProperties(content) {
        // Simplified example - in reality would use more sophisticated NLP
        const topics = new Set(content.toLowerCase()
            .split(/[^a-z]+/)
            .filter(w => w.length > 4));

        return {
            topics: Array.from(topics),
            length: content.length,
            complexity: content.split(/[.!?]+/).length,
            timestamp: Date.now()
        };
    }

    // Find matching pages
    async findMatches(pageId, properties) {
        const matches = [];

        for (const [otherId, otherPage] of this.db.pages.entries()) {
            if (otherId === pageId) continue;

            const otherContent = this.db.pageContent(otherId).toString();
            const otherProps = this.extractProperties(otherContent);

            // Calculate similarity
            const similarity = this.calculateSimilarity(properties, otherProps);

            if (similarity > 0.5) {
                matches.push({
                    pageId: otherId,
                    similarity,
                    timestamp: Date.now()
                });
            }
        }

        return matches;
    }

    // Calculate similarity between pages
    calculateSimilarity(propsA, propsB) {
        const commonTopics = propsA.topics.filter(t =>
            propsB.topics.includes(t)).length;

        return commonTopics /
            Math.max(propsA.topics.length, propsB.topics.length);
    }

    // Store processing results
    storeResults(pageId, properties, matches) {
        const page = this.db.page(pageId);
        if (!page) return;

        this.db.pageSet(pageId, {
            ...page,
            properties,
            matches,
            lastProcessed: Date.now()
        });
    }

    // Coordinate processing with other nodes
    coordinated() {
        if (!this.autoAdjustCapacity) return;
        const peers = Array.from(this.net.awareness().getStates().keys());
        const myPosition = peers.indexOf(this.net.awareness().clientID);

        if (myPosition === -1) return;

        // Adjust work capacity based on position in peer list
        this.workerCapacity = 1 / (peers.length || 1);
    }

    // Determine if this node should process now
    shouldProcess() {
        return Math.random() < this.workerCapacity;
    }

    // Update metrics
    updateMetrics() {
        this.metrics.lastUpdate = Date.now();
        this.metrics.processingTime += this.processInterval;

        // Emit metrics for dashboard
        window.dispatchEvent(new CustomEvent('matching-metrics', {
            detail: {
                ...this.metrics,
                queueSize: this.processingQueue.size,
                workerCapacity: this.workerCapacity,
                peersCount: this.net.awareness().getStates().size
            }
        }));
    }

    getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.processingQueue.size,
            workerCapacity: this.workerCapacity,
            peersCount: this.net.awareness().getStates().size
        };
    }


    startProcessing() {
        if (this.processTimer) return;

        this.processTimer = setInterval(() => this.processLoop(), this.processInterval);
        console.log('Processing started');
    }

    stopProcessing() {
        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
            console.log('Processing stopped');
        }
    }

    setWorkerCapacity(capacity) {
        this.workerCapacity = Math.max(0, Math.min(1, capacity));
        console.log(`Worker capacity set to ${(this.workerCapacity * 100).toFixed(1)}%`);
    }

    setProcessInterval(ms) {
        this.processInterval = Math.max(1000, Math.min(60000, ms));
        if (this.processTimer) {
            this.stopProcessing();
            this.startProcessing();
        }
        console.log(`Process interval set to ${this.processInterval}ms`);
    }

    setSimilarityThreshold(threshold) {
        this.similarityThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`Similarity threshold set to ${(this.similarityThreshold * 100).toFixed(1)}%`);
    }

    setAutoAdjust(enabled) {
        this.autoAdjustCapacity = enabled;
        if (enabled) {
            this.coordinated(); // Immediately adjust based on peers
        }
        console.log(`Auto-adjust capacity ${enabled ? 'enabled' : 'disabled'}`);
    }



    onPagesChanged() {
        //TODO
    }
}

