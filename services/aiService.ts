
import { GoogleGenAI } from "@google/genai";
import { ModelType, AppSettings } from '../types';

// --- Resilience Utilities ---

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        if (retries === 0) throw e;
        
        // Don't retry on auth errors
        if (e.message?.includes('API Key') || e.status === 401 || e.status === 403) throw e;

        // Enhanced Elite Resilience: Handle Rate Limits (429) and Server Errors (500, 502, 503, 504)
        if (e.status === 429 || e.status === 503 || e.status === 500 || e.status === 502 || e.status === 504) {
             console.warn(`API Error (${e.status}). Retrying in ${delay * 2}ms...`, e);
             await wait(delay * 2);
             return withRetry(fn, retries - 1, delay * 4); // Aggressive exponential backoff
        }
        
        console.warn(`API call failed (Unknown). Retrying in ${delay}ms...`, e);
        await wait(delay);
        return withRetry(fn, retries - 1, delay * 2);
    }
}

// --- Generators ---

export const generateBlueprintStream = async (
  prompt: string,
  apiKey: string,
  modelType: ModelType,
  settings: AppSettings['safety'],
  onChunk: (chunk: string) => void,
  systemOverride?: string
) => {
  // PII Redaction
  let safePrompt = prompt;
  if (settings.piiRedaction) {
      safePrompt = safePrompt.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '<REDACTED>');
  }

  const system = systemOverride || "You are Kyoki.";

  await withRetry(async () => {
      if (modelType === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents: safePrompt,
            config: { 
                systemInstruction: system,
                // Gemini 3 Thinking Config for advanced reasoning
                thinkingConfig: { thinkingBudget: 2048 },
                temperature: 0.7 
            },
        });
        for await (const chunk of response) {
            if (chunk.text) onChunk(chunk.text);
        }
      } 
      else {
          if (!apiKey) throw new Error(`Missing API Key for ${modelType}`);
          if (modelType === 'openai' || modelType === 'kimi' || modelType === 'glm') {
            // Generic OpenAI compatible
            const urls: Record<string, string> = {
                openai: 'https://api.openai.com/v1/chat/completions',
                kimi: 'https://api.moonshot.cn/v1/chat/completions',
                glm: 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
            };
            const models: Record<string, string> = {
                openai: 'gpt-4-turbo',
                kimi: 'moonshot-v1-8k',
                glm: 'glm-4'
            };
            
            const res = await fetch(urls[modelType], {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: models[modelType],
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: safePrompt }
                    ],
                    stream: true
                })
            });
            
            if (!res.ok) {
                const errText = await res.text();
                throw { status: res.status, message: errText };
            }
            
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
                            const txt = json.choices[0]?.delta?.content;
                            if (txt) onChunk(txt);
                        } catch (e) {}
                    }
                }
            }
        }
        else if (modelType === 'claude') {
            // Claude fetch logic
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                system: system,
                messages: [{ role: 'user', content: safePrompt }],
                max_tokens: 4096,
                stream: true
                })
            });
            if (!res.ok) {
                const errText = await res.text();
                throw { status: res.status, message: errText };
            }
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
      }
  });
};

export const getEmbedding = async (text: string, apiKey: string, modelType: ModelType): Promise<number[] | null> => {
    if (!text) return null;
    return withRetry(async () => {
        try {
            if (modelType === 'gemini') {
                const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                const result = await ai.models.embedContent({ model: 'text-embedding-004', content: text });
                return result.embedding.values;
            }
            // ... other providers stub
            return null;
        } catch (e) { return null; }
    });
};

export const generateJSON = async (prompt: string, apiKey: string, model: ModelType, settings: any, system: string) => {
    // 1. Optimized Path for Gemini (Native JSON Mode + Thinking)
    if (model === 'gemini') {
        return withRetry(async () => {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: {
                    systemInstruction: system,
                    responseMimeType: 'application/json', // Force strictly valid JSON
                    thinkingConfig: { thinkingBudget: 2048 }
                }
            });
            return JSON.parse(response.text || '{}');
        });
    }

    // 2. Fallback Path for others (Regex Extraction & Markdown stripping)
    let full = "";
    await generateBlueprintStream(prompt, apiKey, model, settings, (c) => full += c, system + "\nOutput strictly valid JSON.");
    
    // Improved cleaning for non-native JSON models
    try {
        // Strip markdown code blocks if present
        const markdownCleaned = full.replace(/```json\n?|\n?```/g, '');
        
        // Find JSON object if mixed with text
        const jsonMatch = markdownCleaned.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : markdownCleaned;
        
        return JSON.parse(jsonStr);
    } catch (e) { 
        console.warn("JSON Parse Failed", e, full);
        return {}; 
    }
};

export const checkApiKey = async (key: string, model: ModelType): Promise<boolean> => {
    if (model === 'gemini') return true; // Handled via env
    return !!key; // Optimistic check
};

// Re-export specific streams for Editor
export const regenerateSectionStream = async (t: string, c: string, full: string, k: string, m: ModelType, s: any, cb: any) => {
    await generateBlueprintStream(`Regenerate section ${t}:\n${c}`, k, m, s, cb);
};
export const explainSectionStream = async (t: string, c: string, k: string, m: ModelType, s: any, cb: any) => {
    await generateBlueprintStream(`Explain ${t}:\n${c}`, k, m, s, cb);
};

// --- NEW: Hybrid Grounding with Google Search ---
export const validateClaimWithSearch = async (claim: string, apiKey: string, modelType: ModelType): Promise<{ isGrounded: boolean; sources: string[] }> => {
    if (modelType !== 'gemini') return { isGrounded: false, sources: [] };

    return withRetry(async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            // Use flash 3 for speed and better reasoning
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Fact check this claim. If it is generally true/plausible, say TRUE. If false or hallucinated, say FALSE. Claim: "${claim}"`,
                config: {
                    tools: [{ googleSearch: {} }],
                }
            });
            
            const text = response.text || '';
            const isGrounded = text.includes('TRUE');
            
            const sources: string[] = [];
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            chunks.forEach((c: any) => {
                if (c.web?.uri) sources.push(c.web.uri);
            });

            return { isGrounded, sources };
        } catch (e) {
            console.error("Grounding check failed", e);
            return { isGrounded: false, sources: [] };
        }
    });
};
