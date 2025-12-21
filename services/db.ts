

import { Blueprint, Project, ContextItem, Folder, VectorDocument, IntelligenceJob, RunPlan, ConsensusItem, GroundingReport, VerificationReport, Conversation } from '../types';

const DB_NAME = 'KyokiDB';
const DB_VERSION = 5; 

interface DBSchema {
    projects: Project;
    blueprints: Blueprint;
    jobs: IntelligenceJob; // Upgraded Job type
    context: ContextItem;
    folders: Folder;
    conversations: Conversation; // New Chat Store
    
    // UKI (Unified Knowledge Index)
    uki_chunks: VectorDocument; // Was 'vectors'
    uki_graph: { id: string; source: string; target: string; type: string };
    
    // Intelligence Layer Artifacts
    runplans: RunPlan;
    consensus: ConsensusItem & { id: string }; // Store by taskId
    grounding: GroundingReport & { id: string };
    verification: VerificationReport & { id: string };
    
    // Caches
    det_cache: { key: string; value: any; timestamp: number }; 
    kv: { key: string; value: any };
}

class KyokiDB {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void>;

    constructor() {
        this.initPromise = this.open();
    }

    private open(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                // Base
                if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('blueprints')) {
                    const store = db.createObjectStore('blueprints', { keyPath: 'id' });
                    store.createIndex('projectId', 'projectId', { unique: false });
                }
                if (!db.objectStoreNames.contains('jobs')) {
                    const store = db.createObjectStore('jobs', { keyPath: 'id' });
                    store.createIndex('projectId', 'projectId', { unique: false });
                }
                if (!db.objectStoreNames.contains('context')) db.createObjectStore('context', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' });
                
                // New Chat Store
                if (!db.objectStoreNames.contains('conversations')) {
                    const store = db.createObjectStore('conversations', { keyPath: 'id' });
                    store.createIndex('blueprintId', 'blueprintId', { unique: false });
                }

                // UKI
                if (!db.objectStoreNames.contains('uki_chunks')) {
                    const store = db.createObjectStore('uki_chunks', { keyPath: 'id' });
                    store.createIndex('contextId', 'contextId', { unique: false });
                }
                if (!db.objectStoreNames.contains('uki_graph')) db.createObjectStore('uki_graph', { keyPath: 'id' });
                
                // Intelligence Layer
                if (!db.objectStoreNames.contains('runplans')) db.createObjectStore('runplans', { keyPath: 'id' });
                if (!db.objectStoreNames.contains('consensus')) db.createObjectStore('consensus', { keyPath: 'taskId' });
                if (!db.objectStoreNames.contains('grounding')) db.createObjectStore('grounding', { keyPath: 'taskId' });
                if (!db.objectStoreNames.contains('verification')) db.createObjectStore('verification', { keyPath: 'blueprintId' });

                // Caches
                if (!db.objectStoreNames.contains('det_cache')) db.createObjectStore('det_cache', { keyPath: 'key' });
                if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
            };
        });
    }

    public async ready() {
        await this.initPromise;
    }

    private getStore(name: string, mode: IDBTransactionMode) {
        if (!this.db) throw new Error("DB not initialized");
        return this.db.transaction(name, mode).objectStore(name);
    }

    // Generic CRUD
    async getAll<T>(storeName: string): Promise<T[]> {
        await this.ready();
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName, 'readonly').getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get<T>(storeName: string, key: string): Promise<T | undefined> {
        await this.ready();
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName, 'readonly').get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put<T>(storeName: string, item: T): Promise<void> {
        await this.ready();
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName, 'readwrite').put(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName: string, key: string): Promise<void> {
        await this.ready();
        return new Promise((resolve, reject) => {
            const request = this.getStore(storeName, 'readwrite').delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // KV Helpers
    async setVal(key: string, value: any) {
        await this.put('kv', { key, value });
    }

    async getVal<T>(key: string): Promise<T | null> {
        const res = await this.get<{key:string, value:T}>('kv', key);
        return res ? res.value : null;
    }
    
    // Conversation Helpers
    async getConversationByBlueprint(blueprintId: string): Promise<Conversation | undefined> {
        await this.ready();
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('conversations', 'readonly');
            const index = tx.objectStore('conversations').index('blueprintId');
            const request = index.get(blueprintId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new KyokiDB();