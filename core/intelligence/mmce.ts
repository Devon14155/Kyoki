
import { ConsensusItem } from '../../types';
import { getEmbedding } from '../../services/aiService';

// Helper for cosine similarity (Duplicate of vectorStore but needed in this scope)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const mmce = {
    // Massive Multi-Model Consensus Engine
    // Upgraded to include Semantic Validation against Requirements
    async process(
        taskId: string, 
        response: string, 
        provider: string,
        apiKey: string,
        modelType: any,
        requirementsSummary?: string
    ): Promise<ConsensusItem> {
        
        let score = 0.85; 
        let semanticDist = 0;

        // 1. Basic Heuristics
        if (response.length < 100) score -= 0.2;
        if (response.includes("I cannot")) score -= 0.5;
        if (response.includes("```")) score += 0.05; // Code blocks increase confidence

        // 2. Semantic Drift Check (Enterprise Logic)
        // We verify if the generated output is semantically aligned with the Requirements.
        // This prevents "Hallucination drift" where agents go off-topic.
        if (requirementsSummary && apiKey && modelType === 'gemini') {
            try {
                // Get embedding for output (using the first 1000 chars to save latency)
                const outputVec = await getEmbedding(response.slice(0, 1000), apiKey, modelType);
                const reqVec = await getEmbedding(requirementsSummary.slice(0, 1000), apiKey, modelType);

                if (outputVec && reqVec) {
                    const similarity = cosineSimilarity(outputVec, reqVec);
                    semanticDist = 1 - similarity;
                    
                    // If content is very different from requirements (e.g. talking about biology instead of software)
                    // The similarity will be low.
                    // Note: Low similarity isn't always bad (e.g. code vs text), but for "Requirements" vs "Architecture", they should align.
                    if (similarity < 0.6) {
                        score -= 0.15;
                    }
                    if (similarity > 0.8) {
                        score += 0.1;
                    }
                }
            } catch (e) {
                console.warn("MMCE Semantic check failed", e);
            }
        }

        return {
            taskId,
            final: response,
            confidence: Math.min(Math.max(score, 0), 1),
            alternatives: [{ provider, content: response, score }],
            evidence: [],
            semanticDistance: semanticDist,
            provenance: {
                model: provider,
                timestamp: Date.now()
            }
        };
    }
};
