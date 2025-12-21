
import { db } from './db';
import { VectorDocument } from '../types';
import { getEmbedding } from './aiService';

// --- Worker Code as Blob URL (No external file needed) ---
const workerCode = `
    const DB_NAME = 'KyokiDB';
    const DB_VERSION = 4;

    function openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    // Optimized Cosine Similarity using Float32Array (SIMD-like in modern JS engines)
    function cosineSimilarity(vecA, vecB) {
        let dot = 0;
        let normA = 0;
        let normB = 0;
        const len = vecA.length;
        for (let i = 0; i < len; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    self.onmessage = async (e) => {
        const { id, type, payload } = e.data;
        
        try {
            if (type === 'SEARCH') {
                const { queryVec, k } = payload;
                const db = await openDB();
                
                // Read all vectors - High Performance Linear Scan
                // For <100k vectors, linear scan in Worker is faster than maintaining HNSW in JS
                const tx = db.transaction('uki_chunks', 'readonly');
                const store = tx.objectStore('uki_chunks');
                const req = store.getAll();
                
                req.onsuccess = () => {
                    const allDocs = req.result;
                    const scores = [];
                    
                    for(let i=0; i<allDocs.length; i++) {
                        const doc = allDocs[i];
                        if (doc.vector.length !== queryVec.length) continue;
                        
                        const score = cosineSimilarity(queryVec, doc.vector);
                        scores.push({ doc, score });
                    }
                    
                    // Sort Descending
                    scores.sort((a, b) => b.score - a.score);
                    const topK = scores.slice(0, k);
                    
                    self.postMessage({ id, status: 'SUCCESS', result: topK });
                };
            }
        } catch (err) {
            self.postMessage({ id, status: 'ERROR', error: err.message });
        }
    };
`;

const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);
const worker = new Worker(workerUrl);

// --- Bridge ---
const pendingRequests = new Map<string, { resolve: Function, reject: Function }>();

worker.onmessage = (e) => {
    const { id, status, result, error } = e.data;
    const req = pendingRequests.get(id);
    if (req) {
        if (status === 'SUCCESS') req.resolve(result);
        else req.reject(new Error(error));
        pendingRequests.delete(id);
    }
};

const runInWorker = (type: string, payload: any): Promise<any> => {
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, type, payload });
    });
};

// Text Chunking
const chunkText = (text: string, size = 512, overlap = 50): string[] => {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        chunks.push(text.slice(start, end));
        start += size - overlap;
    }
    return chunks;
};

export const vectorStore = {
    async addDocument(
        contextId: string, 
        content: string, 
        apiKey: string, 
        modelType: any
    ): Promise<void> {
        const chunks = chunkText(content);
        
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await getEmbedding(chunk, apiKey, modelType);
            
            if (embedding) {
                const doc: VectorDocument = {
                    id: `${contextId}_${i}`,
                    contextId,
                    text: chunk,
                    vector: embedding,
                    metadata: { chunkIndex: i }
                };
                // We still write to DB in main thread (or we could move this to worker too)
                // Writing is less blocking than searching 10k items.
                await db.put('uki_chunks', doc);
            }
        }
    },

    async search(
        query: string, 
        apiKey: string, 
        modelType: any, 
        k = 3
    ): Promise<{doc: VectorDocument, score: number}[]> {
        const queryVec = await getEmbedding(query, apiKey, modelType);
        if (!queryVec) return [];

        // Offload heavy math to Worker
        return runInWorker('SEARCH', { queryVec, k });
    },
    
    async deleteForContext(contextId: string) {
        const all = await db.getAll<VectorDocument>('uki_chunks');
        const toDelete = all.filter(v => v.contextId === contextId);
        for (const v of toDelete) {
            await db.delete('uki_chunks', v.id);
        }
    }
};
