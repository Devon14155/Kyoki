
import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { chatService } from '../services/chatService';
import { extractContext } from '../utils/contextExtraction';
import { Conversation, Message, Blueprint, Artifact, AppSettings, ModelType, AgentConfig } from '../types';

export const useChat = (blueprintId: string | undefined) => {
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    
    const isGeneralMode = blueprintId === 'GENERAL';

    // Load or Initialize Conversation
    useEffect(() => {
        if (!blueprintId) {
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            try {
                const existing = await db.getConversationByBlueprint(blueprintId);
                
                if (existing) {
                    setConversation(existing);
                } else {
                    const newConv: Conversation = {
                        id: isGeneralMode ? 'general-chat-v1' : crypto.randomUUID(),
                        blueprintId,
                        title: isGeneralMode ? 'General Assistant' : 'New Conversation',
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
        
        // Context Extraction Step
        let updatedContext = conversation.context;
        if (msg.role === 'user') {
            updatedContext = extractContext(msg.content, conversation.context);
        }

        const updatedMsgs = [...conversation.messages, msg];
        await saveConversation({ 
            ...conversation, 
            messages: updatedMsgs,
            context: updatedContext 
        });
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

    const updateConfig = async (newConfig: AgentConfig) => {
        if (!conversation) return;
        const updatedMetadata = {
            ...conversation.metadata,
            agentConfig: newConfig,
            modelUsed: newConfig.modelSelection
        };
        await saveConversation({ ...conversation, metadata: updatedMetadata });
    };

    // Main Chat Logic
    const sendMessage = async (
        text: string, 
        blueprint: Blueprint | null,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety'],
        startJobCallback?: () => Promise<void>,
        dispatchTaskCallback?: (role: string, prompt: string) => Promise<void>
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
        
        // CASE A: General Chat (No Blueprint Context)
        if (isGeneralMode) {
             await addMessage({
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                timestamp: Date.now()
            });
            
            try {
                let fullResponse = "";
                await chatService.streamChatResponse(
                    [...conversation.messages, { role: 'user', content: text }],
                    null,
                    apiKey,
                    modelType,
                    settings,
                    (chunk) => {
                        fullResponse += chunk;
                        setConversation(prev => {
                            if (!prev) return null;
                            const msgs = [...prev.messages];
                            msgs[msgs.length - 1].content = fullResponse;
                            return { ...prev, messages: msgs };
                        });
                    }
                );
                await updateLastMessage(fullResponse);
            } catch (e: any) {
                await updateLastMessage(`❌ Error: ${e.message}`, false);
            } finally {
                setIsTyping(false);
            }
            return;
        }

        // CASE B: Editor Mode - Blueprint Generation Trigger
        if (!blueprint || !blueprint.content || blueprint.content.length < 50) {
            await addMessage({
                id: crypto.randomUUID(),
                role: 'thinking',
                content: 'Initializing full engineering pipeline...',
                timestamp: Date.now()
            });
            if (startJobCallback) await startJobCallback();
            setIsTyping(false);
            return;
        }

        // CASE C: Editor Mode - Modification Trigger
        if (chatService.isModificationRequest(text)) {
            const role = chatService.detectAgentRole(text);
            await addMessage({
                id: crypto.randomUUID(),
                role: 'thinking',
                content: `Dispatching ${role.replace('_', ' ')} to handle modification...`,
                timestamp: Date.now()
            });
            
            try {
                if (dispatchTaskCallback) {
                    await dispatchTaskCallback(role, text);
                    await updateLastMessage(`✅ ${role} has processed your request.`, false);
                } else {
                    await updateLastMessage(`❌ Error: Dispatch callback missing.`, false);
                }
            } catch (e: any) {
                await updateLastMessage(`❌ Failed to execute agent task: ${e.message}`, false);
            }
            setIsTyping(false);
            return;
        }

        // CASE D: Editor Mode - Standard Q&A
        await addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
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
                    setConversation(prev => {
                        if (!prev) return null;
                        const msgs = [...prev.messages];
                        msgs[msgs.length - 1].content = fullResponse;
                        return { ...prev, messages: msgs };
                    });
                }
            );
            await updateLastMessage(fullResponse);
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
        updateConfig,
        sendMessage,
        clearHistory
    };
};
