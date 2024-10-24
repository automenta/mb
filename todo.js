class TodoList {
    constructor(el) {
        this.el = el;
        this.store = new Store('todos');
        this.items = [];
        this.loadItems();
        this.render();

        // Example of how to handle incoming remote items
        window.addRemoteItems = async (items) => {
            await this.store.bulkAdd(items, 'remote');
            await this.loadItems();
            toast('Remote items added');
        };

        // Add event listeners for keyboard navigation
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
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

    createListItem(item) {
        const contentEl = h('div', {
            class: `item-content${item.source === 'local' ? ' editable' : ''}`,
        }, item.text);

        if (item.source === 'local')
            contentEl.ondblclick = e => {
                if (!e.target.closest('textarea'))
                    this.makeItemEditable(contentEl, item);
                };

        return h('div', { class: 'item', 'data-id': item.id, tabindex: 0 },
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

        contentEl.replaceChildren(this.createEditItemTextarea(item, originalHeight, finishEditing));
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

    handleKeyDown(e) {
        const focusedElement = document.activeElement;
        const items = Array.from(this.el.querySelectorAll('.item'));
        const currentIndex = items.indexOf(focusedElement);

        switch (e.key) {
            case 'ArrowUp':
                if (currentIndex > 0) {
                    items[currentIndex - 1].focus();
                }
                break;
            case 'ArrowDown':
                if (currentIndex < items.length - 1) {
                    items[currentIndex + 1].focus();
                }
                break;
            case 'Enter':
                if (focusedElement.classList.contains('item')) {
                    const itemId = parseInt(focusedElement.dataset.id, 10);
                    const item = this.items.find(item => item.id === itemId);
                    this.makeItemEditable(focusedElement.querySelector('.item-content'), item);
                }
                break;
            case 'Delete':
                if (focusedElement.classList.contains('item')) {
                    const itemId = parseInt(focusedElement.dataset.id, 10);
                    this.deleteItem(itemId);
                }
                break;
            case 'Escape':
                if (focusedElement.tagName === 'TEXTAREA') {
                    focusedElement.blur();
                }
                break;
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
                itemsContainer.appendChild(this.createListItem(item));
            });
            list.appendChild(itemsContainer);
            this.initializeSortable(itemsContainer);
        }

        this.el.appendChild(list);
    }
}
