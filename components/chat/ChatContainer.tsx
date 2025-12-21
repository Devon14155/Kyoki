
import React, { useEffect } from 'react';
import { ChatTopBar } from './ChatTopBar';
import { ChatMessages } from './ChatMessages';
import { ChatInputBar } from './ChatInputBar';
import { ProgressIndicator } from './ProgressIndicator';
import { useChat } from '../../hooks/useChat';
import { useChatOrchestration } from '../../hooks/useChatOrchestration';

export const ChatContainer: React.FC = () => {
  const { 
    messages, 
    addMessage, 
    currentConversation,
    createNewConversation,
    loadConversation 
  } = useChat();
  
  const { 
    isGenerating, 
    progress, 
    activeAgents 
  } = useChatOrchestration();
  
  // Load conversation from URL param if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('id');
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, []);
  
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
        <ChatTopBar 
          currentConversation={currentConversation}
          onNewChat={createNewConversation}
          onHistory={() => {}} // TODO: Implement Sidebar toggle
        />
        
        <ChatMessages 
          messages={messages}
          isGenerating={isGenerating}
        />
        
        {isGenerating && progress && (
          <ProgressIndicator 
            phase={progress.phase}
            activeAgents={activeAgents}
            completed={progress.completed}
            total={progress.total}
          />
        )}
        
        <ChatInputBar 
          onSendMessage={addMessage}
          isGenerating={isGenerating}
        />
    </div>
  );
};
