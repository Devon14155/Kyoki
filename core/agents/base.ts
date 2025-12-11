
import { AgentRuntime } from '../runtime';
import { generateJSON, generateBlueprintStream } from '../../services/aiService';
import { ModelType, AppSettings } from '../../types';
import { db } from '../../services/db';

export abstract class BaseAgent {
    constructor(
        protected runtime: AgentRuntime,
        protected apiKey: string,
        protected model: ModelType,
        protected settings: AppSettings['safety']
    ) {}

    abstract get id(): string;
    abstract get role(): string;
    abstract get systemPrompt(): string;

    async run(input: any): Promise<any> {
        this.runtime.log(`Starting task...`, this.role);
        try {
            return await this.execute(input);
        } catch (e: any) {
            this.runtime.log(`Error: ${e.message}`, this.role);
            throw e;
        }
    }

    protected abstract execute(input: any): Promise<any>;

    // Computes a hash for the prompt to use as a cache key for Determinism
    private async getCacheKey(prompt: string): Promise<string> {
        const data = new TextEncoder().encode(`${this.id}:${this.model}:${this.systemPrompt}:${prompt}`);
        const hashBuf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    protected async callLLMJSON(prompt: string): Promise<any> {
        // 1. Check Cache
        const key = await this.getCacheKey(prompt);
        const cached = await db.get<{key:string, value:any}>('cache', key);
        if (cached) {
            this.runtime.log('Cache hit. Returning deterministic response.', this.role);
            return cached.value;
        }

        // 2. Call API
        const result = await generateJSON(
            prompt,
            this.apiKey,
            this.model,
            this.settings,
            this.systemPrompt
        );

        // 3. Save Cache
        await db.put('cache', { key, value: result, timestamp: Date.now() });
        return result;
    }

    protected async streamLLM(prompt: string, onChunk: (chunk: string) => void): Promise<void> {
        // Streaming usually bypasses cache for UX, but for full determinism we check if full text is cached.
        const key = await this.getCacheKey(prompt);
        const cached = await db.get<{key:string, value:string}>('cache', key);
        
        if (cached) {
            this.runtime.log('Cache hit. Replaying stream...', this.role);
            // Simulate stream
            const chunks = cached.value.match(/.{1,50}/g) || [cached.value];
            for (const c of chunks) {
                onChunk(c);
                await new Promise(r => setTimeout(r, 10)); // Artificial delay for UX
            }
            return;
        }

        let fullText = "";
        await generateBlueprintStream(
            prompt,
            this.apiKey,
            this.model,
            this.settings,
            (chunk) => {
                fullText += chunk;
                onChunk(chunk);
            },
            this.systemPrompt
        );

        // Cache the final full text
        await db.put('cache', { key, value: fullText, timestamp: Date.now() });
    }
}
