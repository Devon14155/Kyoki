

import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { chatService } from '../services/chatService';
import { Conversation, Message, Blueprint, Artifact, AppSettings, ModelType } from '../types';

export const useChat = (blueprintId: string | undefined) => {
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);

    // Load or Initialize Conversation
    useEffect(() => {
        if (!blueprintId) {
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            try {
                // Try to find existing conversation for this blueprint
                const existing = await db.getConversationByBlueprint(blueprintId);
                
                if (existing) {
                    setConversation(existing);
                } else {
                    // Create new
                    const newConv: Conversation = {
                        id: crypto.randomUUID(),
                        blueprintId,
                        title: 'New Conversation',
                        messages: [],
                        artifacts: [],
                        metadata: {
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            status: 'in-progress',
                            agentConfig: {
                                enabledAgents: [],
                                modelSelection: 'gemini',
                                tools: { webSearch: false, researchMode: false, thinkingMode: false }
                            },
                            modelUsed: 'gemini'
                        },
                        context: {}
                    };
                    await db.put('conversations', newConv);
                    setConversation(newConv);
                }
            } catch (e) {
                console.error("Failed to load chat", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [blueprintId]);

    const saveConversation = async (conv: Conversation) => {
        const updated = {
            ...conv,
            metadata: {
                ...conv.metadata,
                updatedAt: Date.now()
            }
        };
        await db.put('conversations', updated);
        setConversation(updated);
    };

    const addMessage = async (msg: Message) => {
        if (!conversation) return;
        const updatedMsgs = [...conversation.messages, msg];
        await saveConversation({ ...conversation, messages: updatedMsgs });
    };

    const updateLastMessage = async (content: string, isThinking?: boolean) => {
        if (!conversation || conversation.messages.length === 0) return;
        
        const msgs = [...conversation.messages];
        const last = msgs[msgs.length - 1];
        
        if (last.role === 'thinking' && !isThinking) {
             const updated = { 
                 ...last, 
                 content: content, 
                 role: 'assistant' as const, 
                 isThinking: false, 
                 timestamp: Date.now() 
             };
             msgs[msgs.length - 1] = updated;
        } else {
            const updated = { ...last, content };
            msgs[msgs.length - 1] = updated;
        }
        
        await saveConversation({ ...conversation, messages: msgs });
    };

    // Main Chat Logic
    const sendMessage = async (
        text: string, 
        blueprint: Blueprint | null,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        startJobCallback: () => Promise<void>,
        dispatchTaskCallback: (role: string, prompt: string) => Promise<void>
    ) => {
        if (!conversation) return;

        // 1. User Message
        await addMessage({
            id: crypto.randomUUID(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        });

        setIsTyping(true);

        // 2. Decision Logic
        // Case A: Blueprint is empty or very short -> Treat as "Generate New"
        if (!blueprint || !blueprint.content || blueprint.content.length < 50) {
            await addMessage({
                id: crypto.randomUUID(),
                role: 'thinking',
                content: 'Initializing full engineering pipeline...',
                timestamp: Date.now()
            });
            await startJobCallback(); // Triggers the Supervisor Pipeline
            setIsTyping(false);
            return;
        }

        // Case B: Modification Request -> Trigger specific agent
        if (chatService.isModificationRequest(text)) {
            const role = chatService.detectAgentRole(text);
            await addMessage({
                id: crypto.randomUUID(),
                role: 'thinking',
                content: `Dispatching ${role.replace('_', ' ')} to handle modification...`,
                timestamp: Date.now()
            });
            
            try {
                await dispatchTaskCallback(role, text);
                await updateLastMessage(`✅ ${role} has processed your request.`, false);
            } catch (e: any) {
                await updateLastMessage(`❌ Failed to execute agent task: ${e.message}`, false);
            }
            setIsTyping(false);
            return;
        }

        // Case C: Standard Q&A (Chat)
        await addMessage({
            id: crypto.randomUUID(),
            role: 'assistant', // Start directly as assistant for streaming
            content: '',
            timestamp: Date.now()
        });

        try {
            let fullResponse = "";
            await chatService.streamChatResponse(
                [...conversation.messages, { role: 'user', content: text }],
                blueprint,
                apiKey,
                modelType,
                settings,
                (chunk) => {
                    fullResponse += chunk;
                    // Real-time update (debounced in UI ideally, but here direct)
                    // We directly mutate state for stream speed, then save final
                    setConversation(prev => {
                        if (!prev) return null;
                        const msgs = [...prev.messages];
                        msgs[msgs.length - 1].content = fullResponse;
                        return { ...prev, messages: msgs };
                    });
                }
            );
            // Final Save
            if (conversation) {
                // Fetch fresh state to avoid closure staleness issues
                // (Simplified: We rely on the setConversation updater pattern above)
                const msgs = [...conversation.messages];
                msgs[msgs.length - 1].content = fullResponse;
                await saveConversation({ ...conversation, messages: msgs });
            }
        } catch (e: any) {
            await updateLastMessage(`❌ Chat Error: ${e.message}`, false);
        } finally {
            setIsTyping(false);
        }
    };
    
    const clearHistory = async () => {
        if (!conversation) return;
        const updated = { ...conversation, messages: [] };
        await saveConversation(updated);
    };

    return {
        conversation,
        loading,
        isTyping,
        addMessage,
        updateLastMessage,
        sendMessage,
        clearHistory
    };
};