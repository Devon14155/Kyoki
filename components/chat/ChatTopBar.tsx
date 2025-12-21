
import React from 'react';
import { Conversation } from '../../types';
import { Plus, Clock, MoreVertical, Layout, Settings } from 'lucide-react';
import { Button } from '../UI';

interface ChatTopBarProps {
    currentConversation: Conversation | null;
    onNewChat: () => void;
    onHistory: () => void;
}

export const ChatTopBar: React.FC<ChatTopBarProps> = ({ currentConversation, onNewChat, onHistory }) => {
    return (
        <div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-between px-4 sticky top-0 z-20">
            <div className="flex items-center gap-2 overflow-hidden">
                <Button variant="ghost" size="sm" onClick={onHistory} className="md:hidden">
                    <Clock className="w-5 h-5" />
                </Button>
                
                <div className="flex flex-col">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[200px] md:max-w-md">
                        {currentConversation?.title || 'New Conversation'}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className={`w-2 h-2 rounded-full ${currentConversation?.metadata.status === 'in-progress' ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        <span>{currentConversation?.metadata.modelUsed}</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={onNewChat}>
                    <Plus className="w-4 h-4 mr-2" />
                    <span className="hidden md:inline">New Chat</span>
                </Button>
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <Layout className="w-5 h-5" />
                </button>
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <Settings className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};
