class TodoList {
    constructor(el) {
        this.el = el;
        this.store = new Store('todos');
        this.items = [];
        this.init();
    }

    async init() {
        await this.loadItems();
        this.render();

        // Example of how to handle incoming remote items
        window.addRemoteItems = async (items) => {
            await this.store.bulkAdd(items, 'remote');
            await this.loadItems();
            toast('Remote items added');
        };
    }

    async loadItems() {
        try {
            this.items = await this.store.getAll();
            this.render();
        } catch (e) {
            toast('Failed to load items', 'error');
        }
    }

    async addItem(text) {
        try {
            const id = await this.store.add(text);
            await this.loadItems();
            toast('Item added');
            return id;
        } catch (e) {
            toast('Failed to add item', 'error');
        }
    }

    async deleteItem(id) {
        try {
            await this.store.delete(id);
            await this.loadItems();
            toast('Item deleted');
        } catch (e) {
            toast('Failed to delete item', 'error');
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

    render() {
        this.el.innerHTML = '';
        const list = h('div', { class: 'list' });

        // Input textarea with auto-resize
        const textarea = h('textarea', {
            rows: 1,
            placeholder: 'Add a new item... (Shift+Enter for new line)',
            onInput: e => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            },
            onKeyDown: async e => {
                if (e.key === 'Enter') {
                    if (e.shiftKey) {
                        return;
                    }
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

        list.appendChild(
            h('div', { class: 'item input' }, textarea)
        );

        // Empty state
        if (!this.items.length) {
            list.appendChild(
                h('div', { class: 'empty' },
                    'No items yet. Type above to add one!'
                )
            );
        }

        // List items
        const itemsContainer = h('div', { class: 'items' });
        this.items.forEach(item => {
            const li = h('div', { class: 'item', 'data-id': item.id },
                h('span', { class: 'handle' }, '⋮'),
                h('div', { class: 'item-content' }, item.text),
                h('button', {
                    class: 'delete',
                    onClick: async () => {
                        if (confirm('Delete this item?')) {
                            await this.deleteItem(item.id);
                        }
                    }
                }, '×')
            );
            itemsContainer.appendChild(li);
        });
        this.addSortable(list, itemsContainer, textarea);
    }


    addSortable(list, itemsContainer, textarea) {
        list.appendChild(itemsContainer);

        if (this.items.length) {
            new Sortable(itemsContainer, {
                animation: 150,
                handle: '.handle',
                dragClass: 'dragging',
                onEnd: () => {
                    const ids = [...itemsContainer.children].map(el => +el.dataset.id);
                    const reordered = ids.map(id =>
                        this.items.find(item => item.id === id)
                    );
                    this.reorderItems(reordered);
                }
            });
        }

        this.el.appendChild(list);
        textarea.focus();
    }

    createTextarea(initialText = '', placeholder = '') {
        const textarea = h('textarea', {
            rows: 1,
            placeholder,
            value: initialText,
            onInput: e => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }
        });

        // Initialize height
        setTimeout(() => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }, 0);


        return textarea;
    }

    async updateItem(id, text) {
        try {
            await this.store.update(id, text);
            await this.loadItems();
            toast('Item updated');
        } catch (e) {
            toast('Failed to update item', 'error');
        }
    }

    makeItemEditable(contentEl, item) {
        // Create and configure textarea while content is still visible
        const textarea = this.createTextarea(item.text);
        const originalHeight = contentEl.offsetHeight;
        textarea.style.height = originalHeight + 'px';

        const finishEditing = async (save = true) => {
            const newText = textarea.value.trim();
            if (save && newText && newText !== item.text) {
                await this.updateItem(item.id, newText);
            } else {
                this.render(); // Revert on cancel
            }
        };

        textarea.onkeydown = async e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await finishEditing(true);
            } else if (e.key === 'Escape') {
                await finishEditing(false);
            }
        };

        textarea.onblur = () => finishEditing(true);

        // Replace content with textarea in a single operation
        contentEl.replaceChildren(textarea);

        // Focus and move cursor to end after the textarea is in the DOM
        requestAnimationFrame(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        });
    }

    render() {
        this.el.innerHTML = '';
        const list = h('div', { class: 'list' });

        // Input item
        const textarea = this.createTextarea(
            '',
            'Add a new item... (Shift+Enter for new line)'
        );

        textarea.onkeydown = async e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const text = e.target.value.trim();
                if (text) {
                    await this.addItem(text);
                    e.target.value = '';
                    e.target.style.height = 'auto';
                }
            }
        };

        list.appendChild(
            h('div', { class: 'item input' }, textarea)
        );

        // Empty state
        if (!this.items.length) {
            list.appendChild(
                h('div', { class: 'empty' },
                    'No items yet. Type above to add one!'
                )
            );
        }

        // List items
        const itemsContainer = h('div', { class: 'items' });
        this.items.forEach(item => {
            const contentEl = h('div', {
                class: `item-content${item.source === 'local' ? ' editable' : ''}`,
            }, item.text);

            if (item.source === 'local') {
                contentEl.ondblclick = e => {
                    if (!e.target.closest('textarea')) {
                        this.makeItemEditable(contentEl, item);
                    }
                };
            }

            const li = h('div', { class: 'item', 'data-id': item.id },
                h('span', { class: 'handle' }, '⋮'),
                contentEl,
                h('button', {
                    class: 'delete',
                    onClick: async () => {
                        if (confirm('Delete this item?')) {
                            await this.deleteItem(item.id);
                        }
                    }
                }, '×')
            );
            itemsContainer.appendChild(li);
        });
        this.addSortable(list, itemsContainer, textarea);
    }
}
