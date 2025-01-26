import DB from './db';
import NObject from './obj';

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

export default class MatchingEngine {
    db: DB;
    similarityThreshold: number = 0.5; // Default similarity threshold

    constructor(db: DB) {
        this.db = db;
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
    // async findMatches(pageId: string, properties: PageProperties): Promise<MatchResult[]> {
    //     const matches: MatchResult[] = [];
    //
    //     for (const otherPage of this.db.list()) { // Iterate over NObject directly
    //         if (otherPage.id === pageId) continue;
    //
    //         const otherContent = otherPage.text.toString(); // Access text content directly
    //         const otherProps: PageProperties = this.extractProperties(otherContent);
    //
    //         // Calculate similarity (consider different similarity metrics)
    //         const similarity = this.calculateSimilarity(properties, otherProps);
    //
    //         if (similarity > this.similarityThreshold) { // Use similarityThreshold property
    //             matches.push({
    //                 pageId: otherPage.id,
    //                 similarity,
    //                 timestamp: Date.now()
    //             });
    //         }
    //     }
    //
    //     return matches;
    // }

    // Calculate similarity between pages (consider different similarity algorithms)
    calculateSimilarity(propsA: PageProperties, propsB: PageProperties): number {
        const commonTopics = propsA.topics.filter(t =>
            propsB.topics.includes(t)).length;

        if (propsA.topics.length === 0 || propsB.topics.length === 0) return 0; // Avoid division by zero

        return commonTopics /
            Math.max(propsA.topics.length, propsB.topics.length);
    }

    // // Store processing results (consider storing in a separate collection or using NObject metadata)
    // storeResults(pageId: string, properties: PageProperties, matches: MatchResult[]): void {
    //     const page = this.db.get(pageId);
    //     if (page) {
    //         // Example: Storing matches as metadata (consider data structure and size limits)
    //         // page.metadata.set('matchingProperties', properties);
    //         // page.metadata.set('pageMatches', matches);
    //         // console.log(`Stored results for page ${pageId}: ${matches.length} matches found.`);
    //     }
    // }

    setSimilarityThreshold(threshold: number): void {
        this.similarityThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`Similarity threshold set to ${(this.similarityThreshold * 100).toFixed(1)}%`);
    }
}

export { PageProperties, MatchResult };