// Core message types for synchronization
const SYNC_TYPES = {
    SYNC_REQUEST: 'SYNC_REQUEST',    // New peer requests current state
    SYNC_STATE: 'SYNC_STATE',        // Full state response
    ITEM_CHANGE: 'ITEM_CHANGE',      // Add or update item
    ITEM_DELETE: 'ITEM_DELETE'       // Delete item
};

class SyncManager {
    constructor(todoList, p2pNode) {
        this.todoList = todoList;
        this.p2pNode = p2pNode;
        this.store = todoList.store;
        this.syncInProgress = false;
        this.setupListeners();
    }

    setupListeners() {
        // Handle new peer connections
        this.p2pNode.addEventListener('peer-added', async ({ detail }) => await this.requestSync(detail.peerId));

        // Handle sync messages
        this.p2pNode.addEventListener('message-received', ({ detail }) => this.handleSyncMessage(detail.message));

        // Monitor local changes
        this.todoList.addEventListener('item-changed', ({ detail }) => this.broadcastChange(detail.item));

        this.todoList.addEventListener('item-deleted', ({ detail }) => this.broadcastDelete(detail.id));
    }

    async requestSync(peerId) {
        const peer = this.p2pNode.peers.get(peerId);
        if (peer?.connection)
            peer.connection.send({
                type: SYNC_TYPES.SYNC_REQUEST,
                content: {timestamp: Date.now()},
                sender: this.p2pNode.node.id
            });

    }

    async handleSyncMessage(message) {
        if (this.syncInProgress) return;

        try {
            this.syncInProgress = true;

            switch (message.type) {
                case SYNC_TYPES.SYNC_REQUEST:
                    await this.handleSyncRequest(message);
                    break;
                case SYNC_TYPES.SYNC_STATE:
                    await this.handleSyncState(message);
                    break;
                case SYNC_TYPES.ITEM_CHANGE:
                    await this.handleRemoteChange(message);
                    break;
                case SYNC_TYPES.ITEM_DELETE:
                    await this.handleRemoteDelete(message);
                    break;
            }
        } catch (error) {
            console.error('Sync error:', error);
            this.todoList.emit('sync-error', { error });
        } finally {
            this.syncInProgress = false;
        }
    }

    async handleSyncRequest(message) {
        const items = await this.store.getAll();
        const response = {
            type: SYNC_TYPES.SYNC_STATE,
            content: { items },
            sender: this.p2pNode.node.id
        };

        // Send directly to requesting peer
        const peer = this.p2pNode.peers.get(message.sender);
        if (peer?.connection)
            peer.connection.send(response);
    }

    async handleSyncState(message) {
        const remoteItems = message.content.items;
        const localItems = await this.store.getAll();

        // Create map of local items for quick lookup
        const localItemMap = new Map(
            localItems.map(item => [item.id, item])
        );

        // Process each remote item
        for (const remoteItem of remoteItems) {
            const localItem = localItemMap.get(remoteItem.id);

            // Add or update if remote item is newer
            if (!localItem || this.isNewer(remoteItem, localItem))
                await this.store.upsert(remoteItem);

        }

        await this.todoList.loadItems();
        this.todoList.emit('sync-complete', {});
    }

    async handleRemoteChange(message) {
        const remoteItem = message.content;
        const localItem = await this.store.get(remoteItem.id);

        if (!localItem || this.isNewer(remoteItem, localItem)) {
            await this.store.upsert(remoteItem);
            await this.todoList.loadItems();
        }
    }

    async handleRemoteDelete(message) {
        const { id, timestamp } = message.content;
        const localItem = await this.store.get(id);

        // Only delete if we still have the item and the delete is newer
        if (localItem && timestamp > localItem.updated) {
            await this.store.delete(id);
            await this.todoList.loadItems();
        }
    }

    broadcastChange(item) {
        this.p2pNode.broadcast({
            type: SYNC_TYPES.ITEM_CHANGE,
            content: item,
            sender: this.p2pNode.node.id
        });
    }

    broadcastDelete(id) {
        this.p2pNode.broadcast({
            type: SYNC_TYPES.ITEM_DELETE,
            content: {
                id,
                timestamp: Date.now()
            },
            sender: this.p2pNode.node.id
        });
    }

    isNewer(itemA, itemB) {
        return new Date(itemA.updated) > new Date(itemB.updated);
    }
}

// Enhanced Store class
class Store {
    constructor(name) {
        this.db = new Dexie(name);
        this.db.version(2).stores({
            items: '++id,text,updated,source'
        });
    }

    async upsert(item) {
        const now = new Date().toISOString();
        return await this.db.items.put({
            ...item,
            updated: now
        });
    }

    async get(id) {
        return await this.db.items.get(id);
    }

    async getAll() {
        return this.db.items.toArray();
    }

    async add(text, source = 'local') {
        const now = new Date().toISOString();
        return this.db.items.add({
            text,
            source,
            created: now,
            updated: now
        });
    }

    async delete(id) {
        await this.db.items.delete(id);
    }

    async bulkAdd(items, source = 'remote') {
        let order = await this.order();

        const processedItems = items.map(item => ({
            ...item,
            order: order++,
            source,
            created: item.created || this.date(),
            updated: item.updated || this.date()
        }));

        return await this.db.items.bulkPut(processedItems);
    }


    date() {
        return new Date().toISOString();
    }

    async order() {
        const maxOrder = await this.db.items.orderBy('order').last();
        return maxOrder ? maxOrder.order + 1 : 0;
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
