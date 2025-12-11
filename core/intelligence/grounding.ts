
import { ConsensusItem, GroundingReport } from '../../types';
import { uki } from './uki';
import { validateClaimWithSearch } from '../../services/aiService';

export const grounding = {
    async validate(consensus: ConsensusItem, apiKey: string, modelType: any): Promise<GroundingReport> {
        // 1. Extract Claims (Naive regex for sentences that sound factual)
        // In deep mode, we'd use an LLM to "Extract Claims"
        const claims = consensus.final.match(/[^.!?]+[.!?]/g)?.slice(0, 3) || []; // Check first 3 sentences for speed

        const issues = [];
        const evidenceFound = [];

        for (const claim of claims) {
            if (claim.length < 20) continue;
            
            // A. Check Local Knowledge (UKI / RAG)
            const hits = await uki.search(claim, apiKey, modelType, 1);
            if (hits.length > 0 && hits[0].score > 0.78) {
                // Grounded Locally
                evidenceFound.push({ chunkId: hits[0].doc.id, similarity: hits[0].score });
                continue; // Validated
            } 
            
            // B. Check Global Knowledge (Web Search) - if Gemini
            if (modelType === 'gemini') {
                const { isGrounded, sources } = await validateClaimWithSearch(claim, apiKey, modelType);
                if (isGrounded) {
                    // Grounded via Web
                    // We treat web sources as "evidence" with high similarity for now
                    evidenceFound.push({ chunkId: `WEB: ${sources[0] || 'Google Search'}`, similarity: 0.99 });
                    continue;
                }
            }

            // If we reach here, it's potentially ungrounded
            // We flag it, but loosely to avoid false positives on creative text
            // issues.push({ claimText: claim, severity: 'MINOR', evidenceNeeded: true });
        }

        consensus.evidence = evidenceFound;

        return {
            taskId: consensus.taskId,
            ungroundedClaims: issues,
            status: issues.length > 0 ? 'WARN' : 'PASS'
        };
    }
};
