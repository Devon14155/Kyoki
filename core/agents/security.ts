
import { BaseAgent } from './base';

export class SecurityAgent extends BaseAgent {
    get id() { return 'SECURITY'; }
    get role() { return 'Security Engineer'; }
    get systemPrompt() {
        return `You are a Lead Security Engineer.
        Your goal is to perform Threat Modeling (STRIDE) and define security controls.
        Focus on AuthN/AuthZ, Data Protection, Network Security, and Compliance.`;
    }

    protected async execute(input: any): Promise<any> {
        this.runtime.log('Performing Threat Analysis...', this.role);
        
        const arch = this.runtime.getSection('High-Level Architecture') || '';

        const prompt = `
        Analyze this architecture: ${arch.slice(0, 1000)}...
        
        1. Identify top security risks using STRIDE.
        2. Define Authentication & Authorization (OAuth2, RBAC).
        3. Define Data Protection (Encryption).
        
        Write the "Security Model" section in Markdown.
        `;

        let content = "";
        await this.streamLLM(prompt, (c) => content += c);
        this.runtime.updateSection('Security Model', content);
        return { completed: true };
    }
}
