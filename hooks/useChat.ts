
import { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { Conversation, Message, Blueprint, Artifact } from '../types';

export const useChat = (blueprintId: string | undefined) => {
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [loading, setLoading] = useState(true);

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
        
        // If last message was thinking and we are done, remove thinking
        if (last.role === 'thinking' && !isThinking) {
             // Replace thinking with assistant response or just remove if we are adding a separate msg
             // Strategy: The 'Thinking' message acts as a placeholder.
             // If we update it, we can change role to assistant.
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

    const addArtifact = async (artifact: Artifact) => {
        if (!conversation) return;
        const exists = conversation.artifacts.some(a => a.filename === artifact.filename);
        let newArtifacts = conversation.artifacts;
        
        if (exists) {
            newArtifacts = conversation.artifacts.map(a => a.filename === artifact.filename ? artifact : a);
        } else {
            newArtifacts = [...conversation.artifacts, artifact];
        }
        
        await saveConversation({ ...conversation, artifacts: newArtifacts });
    };

    const clearHistory = async () => {
        if (!conversation) return;
        await saveConversation({ ...conversation, messages: [], artifacts: [] });
    };

    return {
        conversation,
        loading,
        addMessage,
        updateLastMessage,
        addArtifact,
        clearHistory
    };
};
