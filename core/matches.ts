import DB from './db';

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

/**
 * Core matching engine that handles semantic analysis and matching of pages
 * using topic-based similarity scoring.
 */
export default class Matches {
    db: DB;
    similarityThreshold: number = 0.5; // Default similarity threshold

    constructor(db: DB) {
        this.db = db;
    }

    /**
     * Extracts semantic properties from text content
     * @param content - The text content to analyze
     * @returns PageProperties object containing:
     *          - topics: array of significant words
     *          - length: character count
     *          - complexity: sentence count
     *          - timestamp: current time
     */
    extractProperties(content: string): PageProperties {
        // Simplified example - in reality would use more sophisticated NLP
        const topics = new Set(content.toLowerCase()
            .split(/[^a-z]+/)
            .filter(w => w.length > 4 && !STOP_WORDS.has(w)));

        return {
            topics: Array.from(topics),
            length: content.length,
            complexity: content.split(/[.!?]+/).length, // Consider more robust complexity metrics
            timestamp: Date.now()
        };
    }

    /**
     * Finds pages that match the given page based on semantic similarity
     * @param pageId - ID of the page to find matches for
     * @param properties - Extracted properties of the page
     * @returns Array of MatchResult objects containing:
     *          - pageId: ID of matching page
     *          - similarity: similarity score (0-1)
     *          - timestamp: time of match
     */
    async findMatches(pageId: string, properties: PageProperties): Promise<MatchResult[]> {
        const matches: MatchResult[] = [];

        for (const otherPage of this.db.list()) { // Iterate over NObject directly
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
            page.setMetadata('matchingProperties', properties);
            page.setMetadata('pageMatches', matches);
            console.log(`Stored results for page ${pageId}: ${matches.length} matches found.`);
        }
    }

    setSimilarityThreshold(threshold: number): void {
        this.similarityThreshold = Math.max(0, Math.min(1, threshold));
        console.log(`Similarity threshold set to ${(this.similarityThreshold * 100).toFixed(1)}%`);
    }
}

const STOP_WORDS = new Set([
    'the', 'and', 'is', 'are', 'in', 'on', 'a', 'an', 'to', 'of', 'for', 'with', 'by', 'from', 'at', 'as', 'but', 'or', 'not', 'so', 'if', 'then', 'else', 'when', 'where', 'while', 'until', 'because', 'since', 'though', 'although', 'whether', 'nor', 'once', 'now', 'about', 'above', 'across', 'after', 'against', 'along', 'among', 'around', 'before', 'behind', 'below', 'beneath', 'beside', 'between', 'beyond', 'during', 'except', 'inside', 'into', 'near', 'off', 'onto', 'outside', 'over', 'under', 'underneath', 'upon', 'within', 'without', 'out', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'me', 'you', 'him', 'us', 'them', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'i', 'he', 'she', 'it', 'we', 'they', 'each', 'every', 'both', 'all', 'any', 'some', 'few', 'many', 'most', 'other', 'another', 'such', 'same', 'different', 'own', 'more', 'less', 'least', 'very', 'quite', 'rather', 'too', 'just', 'only', 'even', 'also', 'well', 'however', 'therefore', 'thus', 'hence', 'thereby', 'nevertheless', 'nonetheless', 'instead', 'meanwhile', 'otherwise', 'elsewhere', 'anywhere', 'everywhere', 'nowhere', 'somewhere', 'whenever', 'wherever', 'however', 'whatever', 'whoever', 'whomever', 'whosever', 'whichever', 'whatever', 'whichever'
]);

export {PageProperties, MatchResult};
