window.h = (tag, props = {}, ...children) => {
    const el = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
        if (k.startsWith('on')) el[k.toLowerCase()] = v;
        else el.setAttribute(k, v);
    });
    el.append(...children);
    return el;
};

window.toast = (msg, type = 'success') => {
    const t = h('div', { class: `toast ${type}` }, msg);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
};

class LRUCache {
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return null;

        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    put(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            this.cache.delete(this.cache.keys().next().value);
        }
        this.cache.set(key, value);
    }
}