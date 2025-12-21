
import { useState, useEffect } from 'react';
import { eventBus } from '../core/intelligence/eventBus';
import { engine } from '../core/engine';
import { storageService } from '../services/storage';
import { AgentConfig, ModelType, AppSettings } from '../types';

export interface ProgressState {
    phase: string;
    currentAgent: string;
    completed: number;
    total: number;
}

export const useChatOrchestration = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState<ProgressState | null>(null);
    const [activeAgents, setActiveAgents] = useState<string[]>([]);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    useEffect(() => {
        if (!activeJobId) return;

        const unsub = eventBus.subscribe((env) => {
            if (env.jobId !== activeJobId) return;

            if (env.eventType === 'TASK_STARTED') {
                setActiveAgents(prev => [...prev, env.payload.role || 'System']);
                setProgress(prev => ({
                    phase: env.phase,
                    currentAgent: env.payload.role || 'Supervisor',
                    completed: prev?.completed || 0,
                    total: prev?.total || 10 // approximate
                }));
            }

            if (env.eventType === 'MODEL_RESPONSE') {
                // Task update logic can go here
            }

            if (env.phase === 'FINALIZE' && env.eventType === 'TASK_STARTED') {
                setIsGenerating(false);
                setProgress(null);
                setActiveAgents([]);
            }
        });

        return () => unsub();
    }, [activeJobId]);

    const startGeneration = async (
        userPrompt: string, 
        agentConfig: AgentConfig,
        conversationContext: string
    ) => {
        setIsGenerating(true);
        setActiveAgents([]);
        
        // Setup configuration
        const settings = storageService.getSettings();
        const keys = await storageService.getApiKeys();
        const apiKey = keys[agentConfig.modelSelection] || '';
        
        // 1. Create a temporary or linked project/blueprint for this generation
        // For Chat, we treat the conversation as the source. 
        // Ideally we link to a project. We'll use a Default Project for chat-driven flow if not specified.
        const projects = await storageService.getProjects();
        let projectId = projects[0]?.id;
        if (!projectId) {
            const p = await storageService.createProject('Chat Generated Project');
            projectId = p.id;
        }

        // Create a blueprint stub to hold the result
        // We use a specific ID based on conversation logic or random
        const blueprintId = crypto.randomUUID(); 
        const blueprint = {
            id: blueprintId,
            projectId,
            title: `Chat Generation ${new Date().toLocaleTimeString()}`,
            description: userPrompt.slice(0, 50),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: ['chat-generated'],
            content: '',
            status: 'generating' as const,
            modelUsed: agentConfig.modelSelection as ModelType,
            versions: []
        };
        await storageService.saveBlueprint(blueprint);

        // Enrich Prompt with Context
        const fullPrompt = `
        ${conversationContext}
        
        USER REQUEST:
        ${userPrompt}
        `;

        try {
            // 2. Start Job via Engine
            const jobId = await engine.startJob(
                projectId,
                blueprintId,
                fullPrompt,
                apiKey,
                agentConfig.modelSelection as ModelType,
                settings.safety
            );
            setActiveJobId(jobId);
        } catch (e) {
            console.error("Failed to start orchestration", e);
            setIsGenerating(false);
        }
    };

    const stopGeneration = () => {
        // Implementation to pause/stop via supervisor would go here
        setIsGenerating(false);
    };

    return { isGenerating, progress, activeAgents, startGeneration, stopGeneration, activeJobId };
};
