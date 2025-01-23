import * as Y from 'yjs';
import NObject from './obj';

type FilterPredicate = (obj: NObject) => boolean;
type SortPredicate = (a: NObject, b: NObject) => number;

export class QueryBuilder {
    private filters: FilterPredicate[] = [];
    private sort?: SortPredicate;
    private limit?: number;
    private offset?: number;

    constructor(private readonly db: DB) {}

    where(predicate: FilterPredicate): QueryBuilder {
        this.filters.push(predicate);
        return this;
    }

    sortBy(sortFn: SortPredicate): QueryBuilder {
        this.sort = sortFn;
        return this;
    }

    take(limit: number): QueryBuilder {
        this.limit = limit;
        return this;
    }

    skip(offset: number): QueryBuilder {
        this.offset = offset;
        return this;
    }

    private getBaseResults(): NObject[] {
        return Array.from(this.db.index.keys())
            .map(id => this.db.get(id))
            .filter((obj): obj is NObject => obj !== null);
    }

    private applyFilters(results: NObject[]): NObject[] {
        return this.filters.reduce((acc, filter) =>
            acc.filter(filter), results);
    }

    private applySorting(results: NObject[]): NObject[] {
        if (this.sort) {
            return [...results].sort(this.sort);
        }
        return results;
    }

    private applyPagination(results: NObject[]): NObject[] {
        let paginated = results;
        if (this.offset !== undefined) {
            paginated = paginated.slice(this.offset);
        }
        if (this.limit !== undefined) {
            paginated = paginated.slice(0, this.limit);
        }
        return paginated;
    }

    execute(): NObject[] {
        let results = this.getBaseResults();
        results = this.applyFilters(results);
        results = this.applySorting(results);
        return this.applyPagination(results);
    }
}

export interface DB {
    index: Y.Map<NObject>;
    get(id: string): NObject | null;
    create(id?: string): NObject;
    list(): NObject[];
    listByTag(tag: string): NObject[];
    listByAuthor(author: string): NObject[];
    search(query: string): NObject[];
    delete(id: string): boolean;
}