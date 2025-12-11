
import { db } from './db';
import { VectorDocument } from '../types';
import { getEmbedding } from './aiService';

// Basic utility for Cosine Similarity
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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
                await db.put('vectors', doc);
            }
        }
    },

    async search(
        query: string, 
        apiKey: string, 
        modelType: any, 
        k = 3
    ): Promise<VectorDocument[]> {
        const queryVec = await getEmbedding(query, apiKey, modelType);
        if (!queryVec) return [];

        // Scan all vectors (in a larger app, use an ANN index like HNSW-WASM)
        const allDocs = await db.getAll<VectorDocument>('vectors');
        
        const scored = allDocs.map(doc => ({
            doc,
            score: cosineSimilarity(queryVec, doc.vector)
        }));

        // Sort desc
        scored.sort((a, b) => b.score - a.score);

        // Return top k
        return scored.slice(0, k).map(s => s.doc);
    },
    
    async deleteForContext(contextId: string) {
        const all = await db.getAll<VectorDocument>('vectors');
        const toDelete = all.filter(v => v.contextId === contextId);
        for (const v of toDelete) {
            await db.delete('vectors', v.id);
        }
    }
};
