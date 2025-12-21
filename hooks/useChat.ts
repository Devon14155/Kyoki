
import { useState, useCallback, useEffect } from 'react';
import { useMemory } from './useMemory';
import { useChatOrchestration } from './useChatOrchestration';
import { extractContext } from '../utils/contextExtraction';
import { storageService } from '../services/storage';
import type { Message, Conversation, ConversationContext, Artifact, AgentConfig } from '../types';

export const useChat = () => {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [context, setContext] = useState<ConversationContext>({});
  
  const { saveConversation, loadConversation: loadFromDB } = useMemory();
  const { startGeneration, isGenerating, activeJobId } = useChatOrchestration();
  
  // Watch for Blueprint Artifact generation from Supervisor
  useEffect(() => {
      if (activeJobId && currentConversation) {
          // Poll for completed blueprint to add as artifact
          // This relies on the blueprint being saved by Supervisor.
          // In a real event-driven system, we'd listen to 'FINALIZE' event payload containing content.
          // For now, we simulate artifact arrival when generation stops.
          if (!isGenerating) {
             // Logic to fetch generated blueprint and add as artifact
             // This is a simplified integration point
          }
      }
  }, [isGenerating, activeJobId]);

  const createNewConversation = useCallback(async () => {
    const settings = storageService.getSettings();
    const newConversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'New Conversation',
      messages: [],
      artifacts: [],
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'in-progress',
        agentConfig: {
          enabledAgents: ['ALL'],
          modelSelection: settings.activeModel,
          tools: { webSearch: false, researchMode: false, thinkingMode: false }
        },
        modelUsed: settings.activeModel
      },
      context: {}
    };
    
    setCurrentConversation(newConversation);
    setMessages([]);
    setContext({});
    await saveConversation(newConversation);
    
    return newConversation;
  }, []);
  
  const addMessage = useCallback(async (content: string, role: 'user' | 'assistant' = 'user') => {
    let convo = currentConversation;
    if (!convo) {
      convo = await createNewConversation();
    }
    
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Optimistic Update
    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    
    // Extract context
    let newContext = { ...context };
    if (role === 'user') {
      const extracted = extractContext(content);
      newContext = { ...context, ...extracted };
      setContext(newContext);
      
      // AI Response Trigger
      const thinkingId = crypto.randomUUID();
      const thinkingMsg: Message = { id: thinkingId, role: 'thinking', content: 'Orchestrating Agents...', timestamp: new Date().toISOString() };
      setMessages(prev => [...prev, thinkingMsg]);

      // Construct Context String
      const contextStr = `
      Project Type: ${newContext.projectType || 'Unspecified'}
      Tech Stack: ${newContext.techStack?.join(', ') || 'Unspecified'}
      Requirements: ${newContext.requirements?.join('; ') || 'None'}
      `;

      // Start Generation
      await startGeneration(content, convo!.metadata.agentConfig, contextStr);
      
      // Note: In a real app, we'd remove 'Thinking' and add 'Assistant' response when done.
      // Here we rely on the orchestration hook or manual effect to update UI.
      // For this demo, we'll remove thinking after a delay to simulate ack if no immediate response
      setTimeout(() => {
          setMessages(prev => prev.filter(m => m.id !== thinkingId));
          // Add acknowledgment if generation is async background
          const ackMsg: Message = { 
              id: crypto.randomUUID(), 
              role: 'assistant', 
              content: "I've started the engineering agents to work on your request. Check the progress indicator for details. The blueprint will appear as an artifact when complete.", 
              timestamp: new Date().toISOString() 
          };
          setMessages(prev => [...prev, ackMsg]);
          
          // Update conversation with new messages
          if (convo) {
              const updatedConvo = {
                  ...convo,
                  messages: [...newMessages, ackMsg],
                  context: newContext,
                  metadata: { ...convo.metadata, updatedAt: new Date().toISOString() }
              };
              if (updatedConvo.messages.length === 2 && role === 'user') { // User msg + Ack
                  updatedConvo.title = content.slice(0, 30) + '...';
              }
              setCurrentConversation(updatedConvo);
              saveConversation(updatedConvo);
          }
      }, 1500);
    } else {
        // Save assistant message immediately
        if (convo) {
             const updatedConvo = {
                  ...convo,
                  messages: newMessages,
                  context: newContext,
                  metadata: { ...convo.metadata, updatedAt: new Date().toISOString() }
              };
              setCurrentConversation(updatedConvo);
              saveConversation(updatedConvo);
        }
    }
    
  }, [currentConversation, messages, context, createNewConversation, saveConversation, startGeneration]);
  
  const loadConversation = useCallback(async (id: string) => {
    const conversation = await loadFromDB(id);
    if (conversation) {
      setCurrentConversation(conversation);
      setMessages(conversation.messages);
      setContext(conversation.context);
    }
  }, [loadFromDB]);
  
  return {
    currentConversation,
    messages,
    context,
    addMessage,
    loadConversation,
    createNewConversation,
    isGenerating
  };
};
