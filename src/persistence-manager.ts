import * as Y from 'yjs';

export class PersistenceManager {
    private doc: Y.Doc;

    constructor(doc: Y.Doc) {
        this.doc = doc;
    }

    private readonly snapshotHistory: Uint8Array[] = [];
    private readonly maxHistory = 100; // Keep last 100 snapshots

    async getSnapshotHistory(): Promise<Uint8Array[]> {
        // Get current snapshot
        const snapshot = Y.encodeStateAsUpdate(this.doc);
        
        // Add to history
        this.snapshotHistory.push(snapshot);
        
        // Maintain history size
        if (this.snapshotHistory.length > this.maxHistory) {
            this.snapshotHistory.shift();
        }
        
        return [...this.snapshotHistory];
    }

    async restoreFromSnapshot(snapshot: Uint8Array): Promise<void> {
        try {
            Y.applyUpdate(this.doc, snapshot);
        } catch (error) {
            console.error('Failed to restore from snapshot:', error);
            throw new Error('Snapshot restoration failed');
        }
    }
    
    persistDocument(object: Object): void {
        //Implementation to persist the object to the database. This will depend on your database setup.
        console.log('Persisting document:', object);
    }
    catch (error: unknown) {
        console.error('Failed to restore from snapshot:', error);
        throw new Error('Snapshot restoration failed');
    }
}
