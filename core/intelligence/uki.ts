
import { db } from '../../services/db';
import { VectorDocument } from '../../types';
import { getEmbedding } from '../../services/aiService';

// Reusing vector logic from previous iteration but upgraded for v3
const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

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

export const uki = {
    // Ingest Document into Vector Store
    async ingest(contextId: string, content: string, apiKey: string, modelType: any) {
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

    // Semantic Search
    async search(query: string, apiKey: string, modelType: any, k = 5): Promise<{doc: VectorDocument, score: number}[]> {
        const queryVec = await getEmbedding(query, apiKey, modelType);
        if (!queryVec) return [];

        const allDocs = await db.getAll<VectorDocument>('uki_chunks');
        const scored = allDocs.map(doc => ({
            doc,
            score: cosineSimilarity(queryVec, doc.vector)
        }));

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, k);
    },

    // Graph Operations (Symbolic)
    async addRelation(source: string, target: string, type: string) {
        await db.put('uki_graph', {
            id: `${source}-${type}-${target}`,
            source,
            target,
            type
        });
    }
};
