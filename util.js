"use strict";

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

class LanguageModel {
    static defaults = {
        endpoint: 'http://localhost:11434/api/generate',
        model: 'llamablit',
        retries: 3
    }

    constructor(options = {}) {
        this.config = { ...LanguageModel.defaults, ...options };
    }

    async process(text, systemPrompt) {
        return this.processWithRetries(text, systemPrompt, 0);
    }

    async processWithRetries(text, systemPrompt, retryCount = 0) {
        try {
            const response = await fetch(this.config.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.model,
                    stream: false,
                    system: systemPrompt,
                    prompt: text
                })
            })

            if (!response.ok)
                throw new Error(`Server responded with status ${response.status}`)

            const data = await response.json();

            if (!data.response)
                throw new Error('Invalid response structure from API')


            const jsonStr = data.response
            const cleanedJson = this.cleanJson(jsonStr)

            try {
                return JSON.parse(cleanedJson)
            } catch (e) {
                if (retryCount < this.config.retries)
                    return this.processWithRetries(text, systemPrompt, retryCount + 1)

                throw new Error('Failed to parse JSON after retries')
            }
        } catch (error) {
            throw new Error(`API error: ${error.message}`)
        }
    }

    cleanJson(str) {
        const matches = str.match(/\{[\s\S]*\}/g)
        if (!matches) return str

        // Attempt to parse each match until one succeeds
        for (const match of matches) {
            try {
                return match
            } catch (e) {
                // Continue to next match if parsing fails
            }
        }
        return str
    }
}
