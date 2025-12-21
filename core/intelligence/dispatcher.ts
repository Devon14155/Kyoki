
import { generateBlueprintStream } from '../../services/aiService';
import { AppSettings, ModelType } from '../../types';
import { deterministic } from './deterministic';
import { SYSTEM_PROMPTS } from './systemPrompts';

export const dispatcher = {
    // Single Sample
    async dispatchTask(
        task: { id: string, role: string, description: string },
        context: string,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        seed: string,
        systemPromptOverride?: string
    ): Promise<string> {
        return this._executeCall(task, context, apiKey, modelType, settings, seed, systemPromptOverride);
    },

    // Multi-Sample for Consensus
    async dispatchConsensus(
        task: { id: string, role: string, description: string },
        context: string,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        seed: string
    ): Promise<{ provider: string, content: string }[]> {
        
        // In "FAANG" mode, we want robustness.
        // We generate 3 variations. 
        // If we had multiple keys (OpenAI + Claude), we'd use them.
        // For now, we simulate diverse thought via Temperature perturbation.
        
        const variations = [
            { label: `${modelType}-balanced`, temp: 0.7, seedSuffix: 'A' },
            { label: `${modelType}-creative`, temp: 0.9, seedSuffix: 'B' },
            { label: `${modelType}-focused`, temp: 0.5, seedSuffix: 'C' }
        ];

        const promises = variations.map(async (v) => {
            // Modify seed for variation
            const varSeed = `${seed}-${v.seedSuffix}`;
            // We append a small note to system prompt to encourage diversity? 
            // Or just rely on temp/seed. The _executeCall handles deterministic caching.
            // Note: `generateBlueprintStream` currently hardcodes temperature in `aiService`. 
            // For a *true* implementation, `aiService` needs to accept config. 
            // We will stick to seed variation which works with `deterministic` caching layer.
            
            const content = await this._executeCall(
                task, 
                context, 
                apiKey, 
                modelType, 
                settings, 
                varSeed
            );
            return { provider: v.label, content };
        });

        return Promise.all(promises);
    },

    async _executeCall(
        task: { id: string, role: string, description: string },
        context: string,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        seed: string,
        systemPromptOverride?: string
    ): Promise<string> {
        // 1. Construct System Prompt
        const roleKey = task.role as keyof typeof SYSTEM_PROMPTS;
        const baseSystemPrompt = systemPromptOverride || SYSTEM_PROMPTS[roleKey] || `You are an elite ${task.role}.`;
        
        const systemPrompt = `${baseSystemPrompt}
        
        Your specific task is: ${task.description}.
        Output strictly in Markdown format.
        Do not include preamble.`;

        // 2. Safety Truncation
        const MAX_CONTEXT_CHARS = 60000; 
        let safeContext = context;
        if (safeContext.length > MAX_CONTEXT_CHARS) {
            const head = safeContext.slice(0, 10000);
            const tail = safeContext.slice(-(MAX_CONTEXT_CHARS - 10000));
            safeContext = `${head}\n\n...[Context Truncated]...\n\n${tail}`;
        }

        const userPrompt = `CONTEXT (Previous Decisions):\n${safeContext}\n\nTASK:\n${task.description}`;

        // 3. Cache Check
        const cacheKey = await deterministic.getCacheKey(seed, task.id, modelType, modelType, userPrompt);
        const cached = await deterministic.getCachedResponse(cacheKey);
        
        if (cached) {
            return cached;
        }

        // 4. Live Call
        let response = "";
        await generateBlueprintStream(
            userPrompt,
            apiKey,
            modelType,
            settings,
            (chunk) => { response += chunk; },
            systemPrompt
        );

        // 5. Cache Result
        await deterministic.setCachedResponse(cacheKey, response);

        return response;
    }
};
