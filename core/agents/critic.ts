
import { BaseAgent } from './base';

export class CriticAgent extends BaseAgent {
    get id() { return 'CRITIC'; }
    get role() { return 'QA Critic'; }
    get systemPrompt() {
        return `You are a nitpicky Senior Principal Engineer acting as a Reviewer.
        Your goal is to grade the blueprint quality from 0-100 and identify gaps.
        Output strictly valid JSON.`;
    }

    protected async execute(input: any): Promise<any> {
        this.runtime.log('Reviewing full blueprint...', this.role);
        
        const draft = this.runtime.getAllSections();
        
        const reviewPrompt = `
        Review the following blueprint draft (truncated):
        ${draft.slice(0, 15000)}...
        
        Evaluate:
        1. Completeness (Are all 20 sections present?)
        2. Consistency (Does the architecture match the requirements?)
        3. Technical Depth
        
        Output JSON: { score: number, summary: string, missing_topics: string[], critical_issues: string[] }
        `;

        const critique = await this.callLLMJSON(reviewPrompt);
        this.runtime.blackboard.critique = critique;
        
        this.runtime.log(`Score: ${critique.score}/100`, this.role);
        return critique;
    }
}
