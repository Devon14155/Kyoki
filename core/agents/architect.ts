
import { BaseAgent } from './base';

export class ArchitectAgent extends BaseAgent {
    get id() { return 'ARCHITECT'; }
    get role() { return 'System Architect'; }
    get systemPrompt() {
        return `You are a Senior Principal Architect. 
        Your goal is to design a scalable, secure, and maintainable system architecture based on requirements.
        You make decisions on Tech Stack, Database, High Level design, and Data models.
        You write detailed technical documentation in Markdown.`;
    }

    protected async execute(input: any): Promise<any> {
        const reqs = this.runtime.blackboard.requirements;
        if (!reqs) throw new Error("Requirements missing.");

        // 1. Tech Stack Rationale
        this.runtime.log('Defining Tech Stack...', this.role);
        const stackPrompt = `
        Requirements: ${JSON.stringify(reqs)}
        Select the optimal Technology Stack.
        Include: Languages, Database, Cloud Provider, Frameworks.
        Write "Tech Stack Rationale" section in Markdown. Justify every choice with trade-offs.
        `;
        let stackContent = "";
        await this.streamLLM(stackPrompt, (c) => stackContent += c);
        this.runtime.updateSection('Tech Stack Rationale', stackContent);

        // 2. High-Level Architecture
        this.runtime.log('Designing System Topology...', this.role);
        const hlaPrompt = `
        Requirements: ${JSON.stringify(reqs)}
        Tech Stack: ${stackContent.slice(0, 500)}...
        
        Design the High-Level Architecture.
        Describe system components, interactions, and data flow.
        Include a Mermaid JS diagram in a code block.
        Write "High-Level Architecture" section in Markdown.
        `;
        let hlaContent = "";
        await this.streamLLM(hlaPrompt, (c) => hlaContent += c);
        this.runtime.updateSection('High-Level Architecture', hlaContent);

        // 3. Detailed Backend & Frontend
        const bePrompt = `Design the "Detailed Backend Architecture". Discuss microservices/monolith structure, API gateway, workers, etc.`;
        let beContent = "";
        await this.streamLLM(bePrompt, (c) => beContent += c);
        this.runtime.updateSection('Detailed Backend Architecture', beContent);

        const fePrompt = `Design the "Detailed Frontend Architecture". Discuss component structure, routing, asset handling, build system.`;
        let feContent = "";
        await this.streamLLM(fePrompt, (c) => feContent += c);
        this.runtime.updateSection('Detailed Frontend Architecture', feContent);

        // 4. Data Models / DB Schema
        this.runtime.log('Designing Data Models...', this.role);
        const dataPrompt = `
        Design "Data Models / DB Schema" for entities: ${JSON.stringify(reqs.core_entities)}.
        Include ER diagrams (Mermaid) and table definitions.
        `;
        let dataContent = "";
        await this.streamLLM(dataPrompt, (c) => dataContent += c);
        this.runtime.updateSection('Data Models / DB Schema', dataContent);

        // 5. State Management & Data Flow
        const statePrompt = `Write "State Management" and "Data Flow Diagrams" sections. Explain how state is handled and trace 2 critical data flows.`;
        let stateContent = "";
        await this.streamLLM(statePrompt, (c) => stateContent += c);
        
        // Naive split attempt based on headers, or append if model ignores instructions
        if (stateContent.includes('# Data Flow Diagrams')) {
            const parts = stateContent.split('# Data Flow Diagrams');
            this.runtime.updateSection('State Management', parts[0].replace('# State Management', '').trim());
            this.runtime.updateSection('Data Flow Diagrams', parts[1].trim());
        } else {
            this.runtime.updateSection('State Management', stateContent);
        }
        
        return { completed: true };
    }
}
