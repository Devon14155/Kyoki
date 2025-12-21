
import { ConsensusItem } from '../../types';
import { getEmbedding } from '../../services/aiService';

// Helper for cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Helper to calculate centroid of multiple vectors
function calculateCentroid(vectors: number[][]): number[] {
    if (vectors.length === 0) return [];
    const dim = vectors[0].length;
    const centroid = new Array(dim).fill(0);
    
    for (const vec of vectors) {
        for (let i = 0; i < dim; i++) {
            centroid[i] += vec[i];
        }
    }
    
    return centroid.map(val => val / vectors.length);
}

export const mmce = {
    // Massive Multi-Model Consensus Engine - True Consensus Implementation
    
    async processBatch(
        taskId: string,
        candidates: { provider: string; content: string }[],
        apiKey: string,
        modelType: any,
        requirementsSummary?: string
    ): Promise<ConsensusItem> {
        
        // 1. Generate Embeddings for all candidates
        const embeddingsWithMeta = await Promise.all(
            candidates.map(async (c) => {
                try {
                    // Use first 2000 chars for embedding to save tokens/latency
                    const vec = await getEmbedding(c.content.slice(0, 2000), apiKey, modelType);
                    return { ...c, vector: vec };
                } catch (e) {
                    return { ...c, vector: null };
                }
            })
        );

        const validCandidates = embeddingsWithMeta.filter(c => c.vector !== null);

        // Fallback if embeddings fail (e.g. offline/no key)
        if (validCandidates.length === 0) {
            // Basic heuristic fallback
            const best = candidates.sort((a,b) => b.content.length - a.content.length)[0];
            return {
                taskId,
                final: best.content,
                confidence: 0.5,
                alternatives: candidates.map(c => ({ ...c, score: 0.5 })),
                evidence: [],
                provenance: { model: best.provider, timestamp: Date.now(), method: 'SINGLE' }
            };
        }

        // 2. Calculate Centroid
        const vectors = validCandidates.map(c => c.vector!);
        const centroid = calculateCentroid(vectors);

        // 3. Score by Distance to Centroid (Closer is better = more "consensus")
        const scoredCandidates = validCandidates.map(c => {
            const similarity = cosineSimilarity(c.vector!, centroid);
            // Distance 0 to 1 (1 is far, 0 is same)
            // Cosine sim is -1 to 1. We normalize to 0-1 range for "distance".
            // Sim 1.0 -> Dist 0.0
            const dist = 1 - similarity; 
            return {
                ...c,
                score: similarity, // Higher similarity to centroid = better consensus
                distance: dist
            };
        });

        // 4. Semantic Drift Check (vs Requirements)
        let semanticDist = 0;
        if (requirementsSummary) {
            const reqVec = await getEmbedding(requirementsSummary.slice(0, 2000), apiKey, modelType);
            if (reqVec) {
                // Check distance of Centroid to Requirements
                const reqSim = cosineSimilarity(centroid, reqVec);
                semanticDist = 1 - reqSim;
            }
        }

        // 5. Select Winner
        // We pick the one closest to the centroid (highest similarity score)
        scoredCandidates.sort((a, b) => b.score - a.score);
        const winner = scoredCandidates[0];

        return {
            taskId,
            final: winner.content,
            confidence: winner.score, // Use similarity to centroid as confidence proxy
            alternatives: scoredCandidates.map(c => ({
                provider: c.provider,
                content: c.content,
                score: c.score,
                distanceToCentroid: c.distance
            })),
            evidence: [],
            semanticDistance: semanticDist,
            provenance: {
                model: winner.provider,
                timestamp: Date.now(),
                method: 'CENTROID'
            }
        };
    },

    // Legacy/Single Wrapper
    async process(
        taskId: string, 
        response: string, 
        provider: string,
        apiKey: string,
        modelType: any,
        requirementsSummary?: string
    ): Promise<ConsensusItem> {
        return this.processBatch(
            taskId, 
            [{ provider, content: response }], 
            apiKey, 
            modelType, 
            requirementsSummary
        );
    }
};
