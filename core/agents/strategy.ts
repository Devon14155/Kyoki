
import { BaseAgent } from './base';

export class StrategyAgent extends BaseAgent {
    get id() { return 'STRATEGY'; }
    get role() { return 'Engineering Strategist'; }
    get systemPrompt() {
        return `You are a Strategic Engineering Lead.
        Analyze risks, propose alternatives, and plan the roadmap. Define the glossary.`;
    }

    protected async execute(input: any): Promise<any> {
        this.runtime.log('Analyzing Strategy & Roadmap...', this.role);
        
        const reqs = this.runtime.blackboard.requirements;

        const prompt = `
        Reqs: ${JSON.stringify(reqs)}
        
        Write 4 sections:
        1. "Risks & Constraints": Technical/Business risks.
        2. "Alternative Approaches": What else was considered? Why was it rejected?
        3. "Implementation Roadmap": Phased plan (MVP, Beta, V1).
        4. "Glossary": Definitions of key terms.
        `;

        let content = "";
        await this.streamLLM(prompt, (c) => content += c);
        
        const risks = content.match(/# Risks & Constraints([\s\S]*?)(?=#|$)/)?.[1];
        const alt = content.match(/# Alternative Approaches([\s\S]*?)(?=#|$)/)?.[1];
        const road = content.match(/# Implementation Roadmap([\s\S]*?)(?=#|$)/)?.[1];
        const gloss = content.match(/# Glossary([\s\S]*?)(?=#|$)/)?.[1];

        if (risks) this.runtime.updateSection('Risks & Constraints', risks.trim());
        if (alt) this.runtime.updateSection('Alternative Approaches', alt.trim());
        if (road) this.runtime.updateSection('Implementation Roadmap', road.trim());
        if (gloss) this.runtime.updateSection('Glossary', gloss.trim());
        
        if (!risks && !alt) {
            this.runtime.updateSection('Risks & Constraints', content);
        }

        return { completed: true };
    }
}
