
import { BaseAgent } from './base';

export class DevOpsAgent extends BaseAgent {
    get id() { return 'DEVOPS'; }
    get role() { return 'DevOps Engineer'; }
    get systemPrompt() {
        return `You are a DevOps & QA Lead.
        Design CI/CD pipelines, deployment strategies, and testing matrices.
        Focus on automation, reliability, and code quality gates.`;
    }

    protected async execute(input: any): Promise<any> {
        this.runtime.log('Designing Pipelines & Tests...', this.role);
        
        const stack = this.runtime.getSection('Tech Stack Rationale') || '';

        const prompt = `
        Tech Stack: ${stack.slice(0, 500)}...
        
        1. Design a CI/CD Pipeline (Build, Test, Deploy steps).
        2. Define the Testing Strategy (Unit, Integration, E2E, Load Testing).
        
        Write the "DevOps + CI/CD" and "Testing Strategy" sections in Markdown.
        `;

        let content = "";
        await this.streamLLM(prompt, (c) => content += c);
        
        if (content.includes('# Testing Strategy')) {
            const parts = content.split('# Testing Strategy');
            this.runtime.updateSection('DevOps + CI/CD', parts[0].replace('# DevOps + CI/CD', '').trim());
            this.runtime.updateSection('Testing Strategy', parts[1].trim());
        } else {
            this.runtime.updateSection('DevOps + CI/CD', content);
        }
        
        return { completed: true };
    }
}
