
import { BaseAgent } from './base';

export class SreAgent extends BaseAgent {
    get id() { return 'SRE'; }
    get role() { return 'Site Reliability Engineer'; }
    get systemPrompt() {
        return `You are a Principal SRE.
        Design for reliability at scale. Focus on Performance, Caching, Fault Tolerance, and Observability (Metrics, Logs, Traces).`;
    }

    protected async execute(input: any): Promise<any> {
        this.runtime.log('Planning for Scale & Reliability...', this.role);
        
        const arch = this.runtime.getSection('High-Level Architecture') || '';

        const prompt = `
        Architecture: ${arch.slice(0, 500)}...
        
        Write 3 distinct sections:
        1. "Performance & Caching": Strategies (CDN, Redis, Query optimization).
        2. "Scalability & Fault Tolerance": Horizontal scaling, Circuit Breakers, Retry policies.
        3. "Observability & Monitoring": ELK/Prometheus setup, key metrics, tracing.
        
        Output in Markdown with headers.
        `;

        let content = "";
        await this.streamLLM(prompt, (c) => content += c);
        
        const perf = content.match(/# Performance & Caching([\s\S]*?)(?=#|$)/)?.[1] || "";
        const scale = content.match(/# Scalability & Fault Tolerance([\s\S]*?)(?=#|$)/)?.[1] || "";
        const obs = content.match(/# Observability & Monitoring([\s\S]*?)(?=#|$)/)?.[1] || "";

        if (perf) this.runtime.updateSection('Performance & Caching', perf.trim());
        if (scale) this.runtime.updateSection('Scalability & Fault Tolerance', scale.trim());
        if (obs) this.runtime.updateSection('Observability & Monitoring', obs.trim());

        if (!perf && !scale && !obs) {
            this.runtime.updateSection('Performance & Caching', content);
        }
        
        return { completed: true };
    }
}
