class Store {
    constructor(name) {
        this.db = new Dexie(name);
        this.db.version(2).stores({
            items: '++id,text,order,source,created,updated'
        });
    }

    async update(id, text) {
        await this.db.items.update(id, {
            text,
            updated: this.date()
        });
    }

    async getAll() {
        return this.db.items.orderBy('order').toArray();
    }

    async add(text, source = 'local') {
        const order = await this.order();
        const now = this.date();
        return this.db.items.add({
            text,
            order,
            source,
            created: now,
            updated: now
        });
    }

    async bulkAdd(items, source = 'remote') {
        let order = await this.order();
        const now = this.date();

        const processedItems = items.map(item => ({
            ...item,
            order: order++,
            source,
            created: now,
            updated: now
        }));

        return await Promise.all(processedItems.map(item => this.db.items.add(item)));
    }

    date() {
        return new Date().toISOString();
    }

    async order() {
        const maxOrder = await this.db.items.orderBy('order').last();
        return maxOrder ? maxOrder.order + 1 : 0;
    }

    async delete(id) {
        await this.db.items.delete(id);
    }

    async reorder(items) {
        const now = this.date();
        await this.db.items.bulkPut(
            items.map((item, i) => ({
                ...item,
                order: i,
                updated: now
            }))
        );
    }
}
