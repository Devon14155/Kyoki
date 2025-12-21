
import { generateBlueprintStream } from '../../services/aiService';
import { AppSettings, ModelType } from '../../types';
import { deterministic } from './deterministic';
import { SYSTEM_PROMPTS } from './systemPrompts';

export const dispatcher = {
    async dispatchTask(
        task: { id: string, role: string, description: string },
        context: string,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        seed: string,
        systemPromptOverride?: string // New Parameter
    ): Promise<string> {
        // 1. Construct System Prompt based on Role using Elite Prompts
        const roleKey = task.role as keyof typeof SYSTEM_PROMPTS;
        const baseSystemPrompt = systemPromptOverride || SYSTEM_PROMPTS[roleKey] || `You are an elite ${task.role}.`;
        
        const systemPrompt = `${baseSystemPrompt}
        
        Your specific task is: ${task.description}.
        Output strictly in Markdown format.
        Do not include preamble.`;

        // 2. Construct User Prompt with Safety Truncation
        // Approx 15k tokens safe buffer (char count heuristic)
        const MAX_CONTEXT_CHARS = 60000; 
        let safeContext = context;
        
        if (safeContext.length > MAX_CONTEXT_CHARS) {
            // Keep the intro (usually Requirements) and the tail (latest decisions)
            const head = safeContext.slice(0, 10000);
            const tail = safeContext.slice(-(MAX_CONTEXT_CHARS - 10000));
            safeContext = `${head}\n\n...[Context Truncated for Memory Safety]...\n\n${tail}`;
        }

        const userPrompt = `CONTEXT (Previous Decisions):\n${safeContext}\n\nTASK:\n${task.description}`;

        // 3. Deterministic Cache Check
        const cacheKey = await deterministic.getCacheKey(seed, task.id, modelType, modelType, userPrompt);
        const cached = await deterministic.getCachedResponse(cacheKey);
        
        if (cached) {
            return cached;
        }

        // 4. Live Call (Streamed but collected for consensus)
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
