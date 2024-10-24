class TodoList {
    constructor(el, options = {}) {
        this.el = el;
        this.store = new Store('todos');
        this.items = [];

        // Default implementations
        this.renderers = {
            textDisplay: (text, item) => text,
            textEditor: options => {
                const textarea = h('textarea', {
                    rows: 1,
                    value: options.initialText || '',
                    placeholder: options.placeholder,
                    style: options.height ? { height: options.height + 'px' } : {},
                    onInput: e => this.autoResizeTextarea(e.target),
                    onKeyDown: async e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            const text = e.target.value.trim();
                            if (text) {
                                await options.onComplete(text);
                                if (options.clearAfterComplete) {
                                    e.target.value = '';
                                    e.target.style.height = 'auto';
                                }
                            }
                        } else if (e.key === 'Escape' && options.onCancel) {
                            options.onCancel();
                        }
                    },
                    onBlur: () => options.onBlur?.()
                });

                if (options.focus) {
                    requestAnimationFrame(() => {
                        textarea.focus();
                        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                    });
                }

                // Initialize height for new item editor
                if (!options.height)
                    setTimeout(() => this.autoResizeTextarea(textarea), 0);

                return textarea;
            }
        };

        // Override default implementations with provided options
        Object.assign(this.renderers, options.renderers);

        this.loadItems();
        this.render();

        window.addRemoteItems = async items => {
            await this.store.bulkAdd(items, 'remote');
            await this.loadItems();
            toast('Remote items added');
        };
    }

    // Data management methods remain the same
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

    async updateItem(id, text) {
        try {
            await this.store.update(id, text);
            await this.loadItems();
            toast('Item updated');
        } catch (e) {
            toast('Failed to update item', 'error');
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

    // UI Components using abstract renderers
    createNewItemTextarea() {
        return this.renderers.textEditor({
            placeholder: 'Add a new item... (Shift+Enter for new line)',
            onComplete: text => this.addItem(text),
            clearAfterComplete: true
        });
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

    createListItem(item) {
        const contentEl = h('div', {
            class: `item-content${item.source === 'local' ? ' editable' : ''}`,
        }, this.renderers.textDisplay(item.text, item));

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
                    if (confirm('Delete this item?')) {
                        await this.deleteItem(item.id);
                    }
                }
            }, '×')
        );
    }

    makeItemEditable(contentEl, item) {
        const originalHeight = contentEl.offsetHeight;

        const finishEditing = async (save = true) => {
            const newText = contentEl.querySelector('textarea').value.trim();
            if (save && newText && newText !== item.text)
                await this.updateItem(item.id, newText);
            else
                this.render();
        };

        contentEl.replaceChildren(this.renderers.textEditor({
            initialText: item.text,
            height: originalHeight,
            focus: true,
            onComplete: text => this.updateItem(item.id, text),
            onCancel: () => this.render(),
            onBlur: () => finishEditing(true)
        }));
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

        list.appendChild(h('div', { class: 'item input' },
            this.createNewItemTextarea()
        ));

        if (!this.items.length) {
            list.appendChild(this.createEmptyState());
        } else {
            const itemsContainer = h('div', { class: 'items' });
            this.items.forEach(item => itemsContainer.appendChild(this.createListItem(item)));
            list.appendChild(itemsContainer);
            this.initializeSortable(itemsContainer);
        }

        this.el.appendChild(list);
    }
}