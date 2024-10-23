class Store {
    constructor(name) {
        this.db = new Dexie(name);
        this.db.version(2).stores({
            items: '++id,text,order,source,created,updated'
        });
    }
    async update(id, text) {
        const now = new Date().toISOString();
        await this.db.items.update(id, {
            text,
            updated: now
        });
    }
    async getAll() {
        return this.db.items.orderBy('order').toArray();
    }

    async add(text, source = 'local') {
        const maxOrder = await this.db.items.orderBy('order').last();
        const order = maxOrder ? maxOrder.order + 1 : 0;
        const now = new Date().toISOString();
        return this.db.items.add({
            text,
            order,
            source,
            created: now,
            updated: now
        });
    }

    async bulkAdd(items, source = 'remote') {
        const maxOrder = await this.db.items.orderBy('order').last();
        let order = maxOrder ? maxOrder.order + 1 : 0;
        const now = new Date().toISOString();

        const processedItems = items.map(item => ({
            ...item,
            order: order++,
            source,
            created: now,
            updated: now
        }));

        return await this.db.items.bulkAdd(processedItems);
    }

    async delete(id) {
        await this.db.items.delete(id);
    }

    async reorder(items) {
        const now = new Date().toISOString();
        await this.db.items.bulkPut(
            items.map((item, i) => ({
                ...item,
                order: i,
                updated: now
            }))
        );
    }
}