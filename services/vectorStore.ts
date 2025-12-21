
import { db } from './db';
import { VectorDocument } from '../types';
import { getEmbedding } from './aiService';

// Optimized Cosine Similarity
function cosineSimilarity(vecA: number[], vecB: number[]) {
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

        // Inline Search (Stability Fix: Removed nested Worker to prevent 'URL' and 'Security' errors)
        const allDocs = await db.getAll<VectorDocument>('uki_chunks');
        const scores = [];
        
        for(let i=0; i<allDocs.length; i++) {
            const doc = allDocs[i];
            if (!doc.vector || doc.vector.length !== queryVec.length) continue;
            
            const score = cosineSimilarity(queryVec, doc.vector);
            scores.push({ doc, score });
        }
        
        // Sort Descending
        scores.sort((a, b) => b.score - a.score);
        return scores.slice(0, k);
    },
    
    async deleteForContext(contextId: string) {
        const all = await db.getAll<VectorDocument>('uki_chunks');
        const toDelete = all.filter(v => v.contextId === contextId);
        for (const v of toDelete) {
            await db.delete('uki_chunks', v.id);
        }
    }
};
