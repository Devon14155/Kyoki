
import { ModelDefinition, ProviderId } from '../types';

export const PROVIDERS: { id: ProviderId; name: string; icon: string; defaultBaseUrl?: string }[] = [
    { id: 'google', name: 'Google Gemini', icon: 'Google', defaultBaseUrl: '' },
    { id: 'openai', name: 'OpenAI', icon: 'Sparkles', defaultBaseUrl: 'https://api.openai.com/v1' },
    { id: 'anthropic', name: 'Anthropic', icon: 'Box', defaultBaseUrl: 'https://api.anthropic.com/v1' },
    { id: 'deepseek', name: 'DeepSeek', icon: 'Code', defaultBaseUrl: 'https://api.deepseek.com' },
    { id: 'grok', name: 'Grok (xAI)', icon: 'X', defaultBaseUrl: 'https://api.x.ai/v1' },
    { id: 'kimi', name: 'Kimi (Moonshot)', icon: 'Moon', defaultBaseUrl: 'https://api.moonshot.cn/v1' },
    { id: 'glm', name: 'GLM (Zhipu AI)', icon: 'Zap', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
    { id: 'ollama', name: 'Ollama (Local)', icon: 'Terminal', defaultBaseUrl: 'http://localhost:11434' },
    { id: 'nanobanana', name: 'Nano Banana', icon: 'Image', defaultBaseUrl: '' },
    { id: 'mistral', name: 'Mistral AI', icon: 'Wind', defaultBaseUrl: 'https://api.mistral.ai/v1' },
    { id: 'cohere', name: 'Cohere', icon: 'Layers', defaultBaseUrl: 'https://api.cohere.ai/v1' },
];

export const MODELS: ModelDefinition[] = [
    // --- Google Gemini ---
    {
        id: 'gemini-3-flash-preview',
        name: 'Gemini 3.0 Flash',
        providerId: 'google',
        contextWindow: 2000000,
        inputPrice: 0.50,
        outputPrice: 3.00,
        releaseDate: '2025-12-17',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true },
        badges: ['2M Context', 'Fast']
    },
    {
        id: 'gemini-3-pro-preview',
        name: 'Gemini 3.0 Pro',
        providerId: 'google',
        contextWindow: 2000000,
        inputPrice: 1.25,
        outputPrice: 5.00,
        releaseDate: '2025-12-17',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Complex Tasks', 'Reasoning']
    },

    // --- OpenAI ---
    {
        id: 'gpt-5.2',
        name: 'GPT-5.2',
        providerId: 'openai',
        contextWindow: 256000,
        inputPrice: 1.75,
        outputPrice: 14.00,
        releaseDate: '2025-12-11',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Flagship']
    },
    {
        id: 'gpt-5.2-codex',
        name: 'GPT-5.2 Codex',
        providerId: 'openai',
        contextWindow: 256000,
        inputPrice: 2.00,
        outputPrice: 16.00,
        releaseDate: '2025-12-11',
        capabilities: { vision: false, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Best for Coding']
    },
    {
        id: 'o4-mini',
        name: 'o4-mini',
        providerId: 'openai',
        contextWindow: 128000,
        inputPrice: 0.50,
        outputPrice: 2.00,
        releaseDate: '2025-10-01',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Math', 'Reasoning']
    },

    // --- Anthropic ---
    {
        id: 'claude-opus-4-5-20251101',
        name: 'Claude Opus 4.5',
        providerId: 'anthropic',
        contextWindow: 200000,
        inputPrice: 5.00,
        outputPrice: 25.00,
        releaseDate: '2025-11-24',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true, computerUse: true },
        badges: ['Best for Agents', 'Computer Use']
    },
    {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        providerId: 'anthropic',
        contextWindow: 200000,
        inputPrice: 3.00,
        outputPrice: 15.00,
        releaseDate: '2025-09-29',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Balanced']
    },

    // --- DeepSeek ---
    {
        id: 'deepseek-chat', // maps to v3.2 in router
        name: 'DeepSeek v3.2',
        providerId: 'deepseek',
        contextWindow: 128000,
        inputPrice: 0.28,
        outputPrice: 1.10,
        releaseDate: '2025-12-01',
        capabilities: { vision: false, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Most Cost-Effective', 'Cached Prompts']
    },
    {
        id: 'deepseek-reasoner', // maps to speciale
        name: 'DeepSeek v3.2 Speciale',
        providerId: 'deepseek',
        contextWindow: 128000,
        inputPrice: 0.50,
        outputPrice: 2.00,
        releaseDate: '2025-12-01',
        capabilities: { vision: false, toolCalling: true, reasoning: true, streaming: true },
        badges: ['Gold Medal Reasoning']
    },

    // --- Grok ---
    {
        id: 'grok-beta', // maps to 4.1
        name: 'Grok 4.1',
        providerId: 'grok',
        contextWindow: 256000,
        inputPrice: 5.00,
        outputPrice: 15.00,
        releaseDate: '2025-11-19',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true, realTimeSearch: true },
        badges: ['Real-Time X Search']
    },

    // --- Kimi ---
    {
        id: 'moonshot-v1-128k',
        name: 'Kimi K2 (128k)',
        providerId: 'kimi',
        contextWindow: 128000,
        inputPrice: 1.5,
        outputPrice: 1.5,
        releaseDate: '2025-06-01',
        capabilities: { vision: false, toolCalling: true, reasoning: false, streaming: true },
        badges: ['Chinese Context']
    },

    // --- GLM ---
    {
        id: 'glm-4',
        name: 'GLM-4.7',
        providerId: 'glm',
        contextWindow: 128000,
        inputPrice: 1.0,
        outputPrice: 1.0,
        releaseDate: '2025-08-01',
        capabilities: { vision: true, toolCalling: true, reasoning: true, streaming: true },
        badges: ['JWT Auth']
    },

    // --- Ollama ---
    {
        id: 'llama3.3',
        name: 'Llama 3.3 (Local)',
        providerId: 'ollama',
        contextWindow: 128000,
        inputPrice: 0,
        outputPrice: 0,
        releaseDate: '2025-12-05',
        capabilities: { vision: false, toolCalling: false, reasoning: true, streaming: true },
        badges: ['Local', 'Private']
    },
    
    // --- Image Gen (Nano Banana) ---
    {
        id: 'nanobanana-pro',
        name: 'Nano Banana Pro',
        providerId: 'nanobanana',
        contextWindow: 0,
        inputPrice: 0.05, // per image roughly
        outputPrice: 0,
        releaseDate: '2025-12-10',
        capabilities: { vision: true, toolCalling: false, reasoning: false, streaming: false },
        badges: ['Studio Quality', 'Image Gen']
    }
];

export const getModelDef = (id: string) => MODELS.find(m => m.id === id);
export const getProviderDef = (id: string) => PROVIDERS.find(p => p.id === id);
