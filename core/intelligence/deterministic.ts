
import { db } from '../../services/db';

export const deterministic = {
    // Generate a deterministic seed based on project and user context
    async generateSeed(projectId: string, inputHash: string): Promise<string> {
        const masterKey = "KyokiMasterMetaSeed"; // In production, derived from user secret
        const data = new TextEncoder().encode(`${masterKey}:${projectId}:${inputHash}`);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async getCacheKey(seed: string, taskId: string, provider: string, model: string, prompt: string): Promise<string> {
        const promptHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(prompt));
        const promptHash = Array.from(new Uint8Array(promptHashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
        
        const keyData = `${seed}:${taskId}:${provider}:${model}:${promptHash}`;
        const keyBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyData));
        return Array.from(new Uint8Array(keyBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async getCachedResponse(key: string): Promise<any | null> {
        const cached = await db.get<{key:string, value:any}>('det_cache', key);
        return cached ? cached.value : null;
    },

    async setCachedResponse(key: string, response: any) {
        await db.put('det_cache', { key, value: response, timestamp: Date.now() });
    }
};
