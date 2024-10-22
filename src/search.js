import FlexSearch from 'flexsearch';

export default class SearchIndex {
    constructor() {
        this.index = new FlexSearch.Document({
            document: {
                id: 'id',
                index: ['content']
            }
        });
    }

    add(id, content) {
        this.index.add({ id, content });
    }

    update(id, content) {
        this.index.update({ id, content });
    }

    remove(id) {
        this.index.remove(id);
    }

    async search(query) {
        const results = await this.index.search(query, { enrich: true });
        return results.flatMap(result => result.result);
    }
}

