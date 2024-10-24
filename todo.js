"use strict";

class TodoList extends BaseEventEmitter {
    constructor(el) {
        super();
        this.el = el;
        this.store = new Store('todos4');
        this.p2pNode = new P2PNode();
        this.syncManager = new SyncManager(this, this.p2pNode);

        this.initialize();
    }

    async initialize() {
        await this.loadItems();
        this.render();

        // Set up network status monitoring
        this.p2pNode.addEventListener('peer-added', () => this.updateNetworkStatus());
        this.p2pNode.addEventListener('peer-removed', () => this.updateNetworkStatus());
    }

    async addItem(text) {
        this.emit('item-changed', { item: await this.store.add(text) });
        await this.loadItems();
    }

    async updateItem(id, text) {
        const item = await this.store.get(id);
        if (item) {
            item.text = text;
            await this.store.upsert(item);
            this.emit('item-changed', { item });
            await this.loadItems();
        }
    }

    async deleteItem(id) {
        await this.store.delete(id);
        this.emit('item-deleted', { id });
        await this.loadItems();
    }

    updateNetworkStatus() {
        const status = {
            peersCount: this.p2pNode.peers.size,
            isConnected: this.p2pNode.peers.size > 0
        };
        this.emit('network-status', status);
    }


    // Data management methods
    async loadItems() {
        try {
            this.items = await this.store.getAll();
            this.render();
        } catch (e) {
            toast('Failed to load items', 'error');
        }
    }

    async updateStoreAndReload(action, message) {
        try {
            await action();
            await this.loadItems();
            toast(message);
        } catch (e) {
            toast('Failed to ' + message.toLowerCase(), 'error');
        }
    }



    async reorderItems(items) {
        try {
            await this.store.reorder(items);
            this.items = items;
            this.render();
        } catch (e) {
            toast('Failed to reorder items', 'error');
        }
    }

    // UI Components
    createNewItemTextarea() {
        const textarea = h('textarea', {
            rows: 1,
            placeholder: 'Add a new item... (Shift+Enter for new line)',
            onInput: e => this.autoResizeTextarea(e.target),
            onKeyDown: async e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const text = e.target.value.trim();
                    if (text) {
                        await this.addItem(text);
                        e.target.value = '';
                        e.target.style.height = 'auto';
                    }
                }
            }
        });

        // Initialize height
        setTimeout(() => this.autoResizeTextarea(textarea), 0);
        return textarea;
    }

    createEditItemTextarea(item, originalHeight, onFinish) {
        const textarea = h('textarea', {
            rows: 1,
            value: item.text,
            style: { height: originalHeight + 'px' },
            onInput: e => this.autoResizeTextarea(e.target),
            onKeyDown: async e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    await onFinish(true);
                } else if (e.key === 'Escape') {
                    await onFinish(false);
                }
            },
            onBlur: () => onFinish(true)
        });

        // Focus and move cursor to end after the textarea is in the DOM
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });

        return textarea;
    }

    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }
    createEmptyState() {
        return h('div', { class: 'empty' },
            'No items yet. Type above to add one!'
        );
    }

    createTodoItem(item) {
        const contentEl = h('div', {
            class: `item-content${item.source === 'local' ? ' editable' : ''}`,
        }, item.text);

        if (item.source === 'local')
            contentEl.ondblclick = e => {
                if (!e.target.closest('textarea'))
                    this.makeItemEditable(contentEl, item);
                };

        return h('div', { class: 'item', 'data-id': item.id },
            h('span', { class: 'handle' }, '⋮'),
            contentEl,
            h('button', {
                class: 'delete',
                onClick: async () => {
                    if (confirm('Delete this item?')) await this.deleteItem(item.id);
                }
            }, '×')
        );
    }

    makeItemEditable(contentEl, item) {
        const originalHeight = contentEl.offsetHeight;
        const originalText = item.text;

        const finishEditing = async (save = true) => {
            const newText = contentEl.querySelector('textarea').value.trim();
            if (save && newText && newText !== originalText)
                await this.updateItem(item.id, newText);
            else
                this.render();
        };


        contentEl.firstChild.remove();
        contentEl.appendChild(this.createEditItemTextarea(item, originalHeight, finishEditing));
        contentEl.querySelector('textarea').value = originalText;
    }

    initializeSortable(itemsContainer) {
        if (this.items.length) {
            new Sortable(itemsContainer, {
                animation: 150,
                handle: '.handle',
                dragClass: 'dragging',
                onEnd: () => this.reorderItems(
                    [...itemsContainer.children]
                        .map(el => +el.dataset.id)
                        .map(id => this.items.find(item => item.id === id))
                )
            });
        }
    }

    render() {
        this.el.innerHTML = '';
        const list = h('div', { class: 'list' });

        // Add input area
        list.appendChild( h('div', {class: 'item input'},
            this.createNewItemTextarea()
        ));

        // Add empty state or items
        if (!this.items.length) {
            list.appendChild(this.createEmptyState());
        } else {
            const itemsContainer = h('div', { class: 'items' });
            this.items.forEach(item => {
                itemsContainer.appendChild(this.createTodoItem(item));
            });
            list.appendChild(itemsContainer);
            this.initializeSortable(itemsContainer);
        }

        this.el.appendChild(list);
    }

    async resolveConflict(localTodo, remoteTodo) {
        if (localTodo.lastModified > remoteTodo.lastModified) {
            return localTodo;
        }
        if (localTodo.lastModified < remoteTodo.lastModified) {
            return remoteTodo;
        }
        // If timestamps are equal, use deterministic approach
        return localTodo.id < remoteTodo.id ? localTodo : remoteTodo;
    }

    // Add to TodoList class
    async update(node) {
        const items = await this.store.getAll();
        node.broadcast({
            type: 'UPDATE',
            items: items
        });
    }

}

