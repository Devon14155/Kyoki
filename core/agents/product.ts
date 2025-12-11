
import { BaseAgent } from './base';

export class ProductManagerAgent extends BaseAgent {
    get id() { return 'PRODUCT'; }
    get role() { return 'Product Manager'; }
    get systemPrompt() {
        return `You are a Principal Product Manager at a top-tier tech company.
        Your goal is to define clear, scoped, and actionable requirements from vague user inputs.
        You focus on "What" and "Why", leaving the "How" to the architects.
        Output strictly valid JSON with keys: functional_requirements (array), non_functional_requirements (array), user_stories (array), core_entities (array).`;
    }

    protected async execute(userPrompt: string): Promise<any> {
        this.runtime.log('Analyzing user intent...', this.role);
        
        const prompt = `
        USER REQUEST: "${userPrompt}"
        
        Analyze this request and break it down into a structured PRD (Product Requirement Document).
        1. List 5-7 core functional requirements.
        2. List 3-5 critical non-functional requirements (SLAs, Scalability, Security).
        3. Define 3-5 key user stories.
        4. Identify the core data entities involved.
        `;

        const requirements = await this.callLLMJSON(prompt);
        this.runtime.blackboard.requirements = requirements;
        
        // Generate Requirements Breakdown
        let md = `## Functional Requirements\n`;
        requirements.functional_requirements.forEach((r: string) => md += `- ${r}\n`);
        md += `\n## Non-Functional Requirements\n`;
        requirements.non_functional_requirements.forEach((r: string) => md += `- ${r}\n`);
        md += `\n## User Stories\n`;
        requirements.user_stories.forEach((u: string) => md += `- ${u}\n`);
        
        this.runtime.updateSection('Requirements Breakdown', md);
        
        // Generate Executive Summary
        const execPrompt = `
        Based on these requirements: ${JSON.stringify(requirements)}
        Write a concise "Executive Summary" for this engineering blueprint.
        Highlight the core solution, target audience, and key technical goals.
        Markdown format.
        `;
        let execContent = "";
        await this.streamLLM(execPrompt, (chunk) => execContent += chunk);
        this.runtime.updateSection('Executive Summary', execContent);

        return requirements;
    }
}
