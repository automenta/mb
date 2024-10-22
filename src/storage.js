// src/Storage.js
import PouchDB from 'pouchdb';

export default class Storage {
    async init() {
        this.db = new PouchDB('p2p_search_index');
        console.log('Storage initialized');
    }

    async save(id, content) {
        await this.db.put({ _id: id, content });
    }

    async update(id, content) {
        try {
            const doc = await this.db.get(id);
            await this.db.put({ ...doc, content });
        } catch (err) {
            if (err.name === 'not_found') {
                await this.save(id, content);
            } else {
                throw err;
            }
        }
    }

    async remove(id) {
        try {
            const doc = await this.db.get(id);
            await this.db.remove(doc);
        } catch (err) {
            if (err.name !== 'not_found') {
                throw err;
            }
        }
    }

    async get(id) {
        try {
            const doc = await this.db.get(id);
            return doc.content;
        } catch (err) {
            if (err.name === 'not_found') {
                return null;
            } else {
                throw err;
            }
        }
    }

    async getAll() {
        const result = await this.db.allDocs({ include_docs: true });
        return result.rows.map(row => ({ id: row.id, content: row.doc.content }));
    }
}