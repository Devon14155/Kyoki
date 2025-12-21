import { eventBus } from './eventBus';
import { dispatcher } from './dispatcher';
import { TOOLS } from './tools';
import { generateJSON } from '../../services/aiService';
import { AppSettings, ModelType } from '../../types';

interface Critique {
    severity: 'critical' | 'warning' | 'suggestion';
    affectedAgent: string; // Role Name
    affectedSection: string; // Artifact Section Name
    issue: string;
    recommendation: string;
}

export const revisionLoop = {
    async run(
        jobId: string,
        artifacts: Record<string, string>,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        seed: string
    ): Promise<Record<string, string>> {
        
        // 1. Critic Review
        const eventEnv = eventBus.createEnvelope(jobId, 'VERIFY', 'TASK_STARTED', { message: 'Critic is reviewing artifacts...' });
        eventBus.emit(eventEnv);

        const critiques = await this.reviewAllArtifacts(artifacts, apiKey, modelType, settings);
        
        if (critiques.length === 0) {
            eventBus.emit(eventBus.createEnvelope(jobId, 'VERIFY', 'VERIFICATION_REPORT', { message: 'Critic found no issues.' }));
            return artifacts; 
        }

        // 2. Identify Agents to Rerun (Only Critical/Major)
        const actionableCritiques = critiques.filter(c => c.severity !== 'suggestion');
        const agentsToRerun = [...new Set(actionableCritiques.map(c => c.affectedAgent))];

        if (agentsToRerun.length === 0) {
             eventBus.emit(eventBus.createEnvelope(jobId, 'VERIFY', 'VERIFICATION_REPORT', { message: 'Critic found only suggestions. Skipping regeneration.' }));
             return artifacts;
        }

        eventBus.emit(eventBus.createEnvelope(jobId, 'VERIFY', 'SUPERVISOR_ALERT', { message: `Revision required for: ${agentsToRerun.join(', ')}` }, 'WARN'));

        // 3. Rerun Agents with Feedback
        const updatedArtifacts = { ...artifacts };

        for (const agentRole of agentsToRerun) {
            const agentCritiques = actionableCritiques.filter(c => c.affectedAgent === agentRole);
            const section = agentCritiques[0]?.affectedSection; // Assuming 1 section per agent mostly
            
            if (!section) continue;

            // Construct Feedback Context
            const feedback = agentCritiques.map(c => `- Issue: ${c.issue}\n  Fix: ${c.recommendation}`).join('\n');
            const prompt = `
            CRITIC FEEDBACK (REQURIED FIXES):
            ${feedback}

            Please regenerate the "${section}" to address these issues. Maintain consistency with the original requirements.
            `;
            
            // Dispatch Revision
            eventBus.emit(eventBus.createEnvelope(jobId, 'DISPATCH', 'TASK_STARTED', { role: agentRole, message: `Revising ${section}...` }));
            
            // We use the dispatcher but inject the previous content + feedback as context
            const previousContent = artifacts[section] || '';
            const context = `PREVIOUS VERSION:\n${previousContent}\n\n${prompt}`;
            
            try {
                // Use a modified seed for revision to avoid cache hit of the original erroneous output
                const revisionSeed = `${seed}_rev_1`; 
                const response = await dispatcher.dispatchTask(
                    { id: `${agentRole}_REV`, role: agentRole, description: `Revise ${section} based on feedback.` },
                    context,
                    apiKey,
                    modelType,
                    settings,
                    revisionSeed
                );
                
                // Explicit cast to avoid type inference issues
                const responseStr = String(response);
                updatedArtifacts[section] = responseStr;
                eventBus.emit(eventBus.createEnvelope(jobId, 'DISPATCH', 'MODEL_RESPONSE', { role: agentRole, length: responseStr.length }));
            } catch (e: any) {
                eventBus.emit(eventBus.createEnvelope(jobId, 'DISPATCH', 'SUPERVISOR_ALERT', { error: `Revision failed for ${agentRole}: ${e.message}` }, 'ERROR'));
            }
        }

        // 4. Final Consistency Check
        const finalCheck = TOOLS.architectureCoherenceChecker(updatedArtifacts);
        if (!finalCheck.success) {
             eventBus.emit(eventBus.createEnvelope(jobId, 'VERIFY', 'SUPERVISOR_ALERT', { message: 'Some coherence issues remain after revision.' }, 'WARN'));
        }

        return updatedArtifacts;
    },

    async reviewAllArtifacts(
        artifacts: Record<string, string>,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety']
    ): Promise<Critique[]> {
        const critiques: Critique[] = [];

        // A. algorithmic Checks (Coherence Checker Tool)
        const coherence = TOOLS.architectureCoherenceChecker(artifacts);
        if (!coherence.success) {
            coherence.findings?.forEach(f => {
                critiques.push({
                    severity: 'warning',
                    affectedAgent: 'UNKNOWN', // Tool findings usually cross-cutting, we assign based on text
                    affectedSection: 'Architecture', 
                    issue: f,
                    recommendation: 'Fix coherence issue.'
                });
            });
        }

        // B. LLM Critic (The "Smart" Review)
        // We summarize artifacts to avoid context window overflow
        const summaries = Object.entries(artifacts).map(([k, v]) => `--- ${k} ---\n${v.slice(0, 1000)}...`).join('\n');
        
        const prompt = `
        Review these architectural artifacts summaries.
        Identify conflicts, missing critical security controls, or scalable bottlenecks.
        
        ARTIFACTS:
        ${summaries}
        
        OUTPUT JSON format:
        {
            "critiques": [
                {
                    "severity": "critical" | "warning",
                    "affectedAgent": "AGENT_ROLE_NAME",
                    "affectedSection": "SECTION_NAME",
                    "issue": "Description of the flaw",
                    "recommendation": "How to fix it"
                }
            ]
        }
        `;

        try {
            const response = await generateJSON(prompt, apiKey, modelType, settings, "You are a harsh Technical Reviewer.");
            if (response && Array.isArray(response.critiques)) {
                critiques.push(...response.critiques);
            }
        } catch (e) {
            console.warn("Critic LLM failed", e);
        }

        return critiques;
    }
};