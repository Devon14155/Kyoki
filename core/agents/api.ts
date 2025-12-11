
import { BaseAgent } from './base';

export class ApiAgent extends BaseAgent {
    get id() { return 'API'; }
    get role() { return 'API Architect'; }
    get systemPrompt() {
        return `You are an API Specialist. You design clean, RESTful or GraphQL interfaces. 
        Focus on resource naming, status codes, request/response bodies, and error handling.`;
    }

    protected async execute(input: any): Promise<any> {
        this.runtime.log('Designing API Contract...', this.role);
        
        const reqs = this.runtime.blackboard.requirements;
        const stack = this.runtime.getSection('Tech Stack Rationale') || '';

        const prompt = `
        Design the "API Specification" based on:
        Reqs: ${JSON.stringify(reqs)}
        Stack: ${stack.slice(0, 300)}...
        
        List key endpoints (e.g., GET /users, POST /orders).
        For complex endpoints, provide example JSON payloads.
        Define the error response format.
        `;

        let content = "";
        await this.streamLLM(prompt, (c) => content += c);
        this.runtime.updateSection('API Specification', content);
        return { completed: true };
    }
}
