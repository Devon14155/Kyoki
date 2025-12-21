
import { generateBlueprintStream } from './aiService';
import { Blueprint, ModelType, AppSettings } from '../types';

export const chatService = {
    async streamChatResponse(
        messages: { role: string; content: string }[],
        blueprint: Blueprint | null,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        onChunk: (chunk: string) => void
    ) {
        // 1. Construct System Prompt
        let systemPrompt = `You are the Lead Solutions Architect for Kyoki.
        You are orchestrating a team of specialized agents (Frontend, Backend, Security, etc.).
        
        Your Goal:
        - Answer the user's questions about the current blueprint.
        - Explain architectural decisions.
        - If the user asks for changes, analyze the impact and suggest a plan.
        - Be concise, professional, and helpful.
        `;

        // 2. Build Context from Blueprint
        let context = "";
        if (blueprint && blueprint.content) {
            // Truncate if too large, prioritize latest sections
            const content = blueprint.content.length > 20000 
                ? blueprint.content.slice(0, 20000) + "\n...(truncated)..." 
                : blueprint.content;
                
            context = `CURRENT BLUEPRINT CONTEXT:\n${content}\n\n`;
        } else {
            context = `NO BLUEPRINT GENERATED YET. The user is in the drafting phase.\n`;
        }

        // 3. Format Messages
        // We only take the last 10 messages to keep context window manageable
        const recentMessages = messages.slice(-10);
        
        const fullPrompt = `${context}
        
        USER CONVERSATION HISTORY:
        ${recentMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}
        
        ASSISTANT:`;

        // 4. Call AI Service
        await generateBlueprintStream(
            fullPrompt,
            apiKey,
            modelType,
            settings,
            onChunk,
            systemPrompt
        );
    },

    // Simple heuristic to check if user wants to modify blueprint
    isModificationRequest(text: string): boolean {
        const triggers = ['change', 'update', 'modify', 'switch to', 'use', 'refactor', 'replace', 'add'];
        return triggers.some(t => text.toLowerCase().includes(t));
    },

    // Identify which agent fits the request best
    detectAgentRole(text: string): string {
        const t = text.toLowerCase();
        if (t.includes('database') || t.includes('schema') || t.includes('sql')) return 'DATA_MODELER';
        if (t.includes('frontend') || t.includes('ui') || t.includes('react') || t.includes('component')) return 'FRONTEND_ENGINEER';
        if (t.includes('api') || t.includes('backend') || t.includes('endpoint')) return 'BACKEND_ARCHITECT';
        if (t.includes('security') || t.includes('auth')) return 'SECURITY_ENGINEER';
        if (t.includes('deploy') || t.includes('ci/cd') || t.includes('aws')) return 'PLATFORM_ENGINEER';
        return 'ARCHITECT'; // Default
    }
};
