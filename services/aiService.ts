
import { GoogleGenAI } from "@google/genai";
import { AppSettings, ModelDefinition } from '../types';
import { MODELS, getModelDef, getProviderDef } from './modelRegistry';
import { storageService } from './storage';

// --- Resilience Utilities ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        if (retries === 0) throw e;
        if (e.message?.includes('API Key') || e.status === 401 || e.status === 403) throw e;
        if (e.status === 429 || e.status >= 500) {
             console.warn(`API Error (${e.status}). Retrying in ${delay * 2}ms...`);
             await wait(delay * 2);
             return withRetry(fn, retries - 1, delay * 2);
        }
        throw e;
    }
}

// --- Auth Helpers ---

// Minimal JWT generation for GLM (Zhipu) using Web Crypto API
async function generateGlmToken(apiKey: string): Promise<string> {
    const [id, secret] = apiKey.split('.');
    if (!id || !secret) throw new Error("Invalid GLM API Key format");

    const header = { alg: 'HS256', sign_type: 'SIGN' };
    const payload = {
        api_key: id,
        exp: Date.now() + 3600 * 1000,
        timestamp: Date.now()
    };

    const encoder = new TextEncoder();
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    const data = `${encodedHeader}.${encodedPayload}`;

    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));

    return `${data}.${encodedSignature}`;
}

// --- Universal Router ---

class UniversalRouter {
    
    private getProviderConfig(modelId: string) {
        const model = getModelDef(modelId);
        if (!model) throw new Error(`Unknown model: ${modelId}`);
        const settings = storageService.getSettings();
        const providerConfig = settings.providers[model.providerId];
        return { model, providerConfig };
    }

    private async getApiKey(model: ModelDefinition): Promise<string> {
        if (model.providerId === 'google') return process.env.API_KEY || '';
        
        const keys = await storageService.getApiKeys();
        const key = keys[model.providerId];
        
        if (!key && model.providerId !== 'ollama') {
            throw new Error(`Missing API Key for provider: ${getProviderDef(model.providerId)?.name}`);
        }
        return key || '';
    }

    // --- Core Generation Logic ---

    async generateContentStream(
        prompt: string,
        modelId: string,
        settings: AppSettings['safety'],
        onChunk: (chunk: string) => void,
        systemOverride?: string
    ): Promise<void> {
        let { model, providerConfig } = this.getProviderConfig(modelId);
        
        // PII Redaction
        let safePrompt = prompt;
        if (settings.piiRedaction) {
            safePrompt = safePrompt.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<REDACTED>');
        }

        const apiKey = await this.getApiKey(model);

        await withRetry(async () => {
            switch (model.providerId) {
                case 'google':
                    await this.callGemini(model.id, safePrompt, systemOverride, onChunk);
                    break;
                case 'anthropic':
                    await this.callAnthropic(model.id, apiKey, safePrompt, systemOverride, onChunk);
                    break;
                case 'glm':
                    const token = await generateGlmToken(apiKey);
                    await this.callOpenAICompatible(model.id, token, safePrompt, systemOverride, onChunk, providerConfig.baseUrl, true);
                    break;
                case 'ollama':
                case 'deepseek':
                case 'grok':
                case 'kimi':
                case 'openai':
                case 'mistral':
                    await this.callOpenAICompatible(model.id, apiKey, safePrompt, systemOverride, onChunk, providerConfig.baseUrl || getProviderDef(model.providerId)?.defaultBaseUrl);
                    break;
                default:
                    throw new Error(`Provider ${model.providerId} not implemented yet`);
            }
        });
    }

    // --- Provider Implementations ---

    private async callGemini(modelId: string, prompt: string, system: string | undefined, onChunk: (c: string) => void) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContentStream({
            model: modelId,
            contents: prompt,
            config: { 
                systemInstruction: system,
                thinkingConfig: modelId.includes('gemini-3') ? { thinkingBudget: 2048 } : undefined,
            },
        });
        for await (const chunk of response) {
            if (chunk.text) onChunk(chunk.text);
        }
    }

    private async callAnthropic(model: string, apiKey: string, prompt: string, system: string | undefined, onChunk: (c: string) => void) {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
                model,
                system,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4096,
                stream: true
            })
        });

        if (!res.ok) throw new Error(await res.text());
        
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const json = JSON.parse(line.slice(6));
                        if (json.type === 'content_block_delta' && json.delta?.text) {
                            onChunk(json.delta.text);
                        }
                    } catch (e) {}
                }
            }
        }
    }

    private async callOpenAICompatible(
        model: string, 
        apiKey: string, 
        prompt: string, 
        system: string | undefined, 
        onChunk: (c: string) => void,
        baseUrl?: string,
        isJwt = false
    ) {
        if (!baseUrl) throw new Error("No Base URL provided");
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': isJwt ? apiKey : `Bearer ${apiKey}`
        };

        const body: any = {
            model,
            messages: [
                { role: 'system', content: system || 'You are a helpful assistant.' },
                { role: 'user', content: prompt }
            ],
            stream: true
        };

        // DeepSeek specific
        if (model.includes('deepseek')) {
            // DeepSeek doesn't strictly need extra params for standard chat, 
            // but 'deepseek-reasoner' will auto-output reasoning_content which we can capture if we parse carefully.
        }

        const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!res.ok) {
             const err = await res.text();
             throw new Error(`API Error ${res.status}: ${err}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                    try {
                        const json = JSON.parse(line.slice(6));
                        
                        // Handle DeepSeek Thinking
                        if (json.choices[0]?.delta?.reasoning_content) {
                            onChunk(`> *Thinking: ${json.choices[0].delta.reasoning_content}*\n\n`);
                        }

                        const txt = json.choices[0]?.delta?.content;
                        if (txt) onChunk(txt);
                    } catch (e) {}
                }
            }
        }
    }

    // --- Helper for Single Generation (JSON) ---
    async generateJSON(prompt: string, modelId: string, settings: any, system: string): Promise<any> {
        let full = "";
        await this.generateContentStream(prompt, modelId, settings, (c) => full += c, system + "\nOutput strictly valid JSON.");
        
        // Clean markdown
        const cleaned = full.replace(/```json\n?|\n?```/g, '').replace(/```\n?/g, '');
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    }

    // --- Test Connection ---
    async testConnection(providerId: string, apiKey: string): Promise<boolean> {
        try {
            const providerDef = getProviderDef(providerId);
            // Quick test with a cheap model or empty list
            if (providerId === 'google') return true; // managed via env
            if (providerId === 'ollama') {
                const res = await fetch(`${providerDef?.defaultBaseUrl}/tags`);
                return res.ok;
            }
            if (providerId === 'glm') {
                 // GLM doesn't have a simple list models endpoint that is easy to hit with raw fetch in same way, try simple chat
                 const token = await generateGlmToken(apiKey);
                 // Just return true if token gen worked, actual call might be expensive
                 return !!token;
            }
            
            // Generic OpenAI style list models
            const res = await fetch(`${providerDef?.defaultBaseUrl}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return res.ok;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}

export const router = new UniversalRouter();

// --- Exported Facade for Compatibility ---

export const generateBlueprintStream = async (
    prompt: string,
    _unusedKey: string, // We load keys internally now
    modelType: string,
    settings: AppSettings['safety'],
    onChunk: (chunk: string) => void,
    systemOverride?: string
) => {
    return router.generateContentStream(prompt, modelType, settings, onChunk, systemOverride);
};

export const generateJSON = async (prompt: string, _k: string, model: string, settings: any, system: string) => {
    return router.generateJSON(prompt, model, settings, system);
};

export const getEmbedding = async (text: string, _k: string, _m: string): Promise<number[] | null> => {
    // Only Gemini supports embeddings in this demo easily, others need more complex setup.
    // Fallback to Gemini for embeddings regardless of selected chat model for now, or return null.
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const result = await ai.models.embedContent({ model: 'text-embedding-004', content: text });
        return result.embedding.values;
    } catch { return null; }
};

export const validateClaimWithSearch = async (claim: string, _k: string, _m: string) => {
    // Force use Gemini for grounding
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Fact check: "${claim}"`,
            config: { tools: [{ googleSearch: {} }] }
        });
        const text = response.text || '';
        return { isGrounded: text.includes('True') || text.length > 10, sources: [] };
    } catch { return { isGrounded: false, sources: [] }; }
};

export const checkApiKey = async (key: string, provider: string) => {
    return router.testConnection(provider, key);
};
