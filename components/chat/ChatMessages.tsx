
import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';
import { ChatMessage } from './ChatMessage';

interface ChatMessagesProps {
    messages: Message[];
    isGenerating: boolean;
}

export const ChatMessages: React.FC<ChatMessagesProps> = ({ messages, isGenerating }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isGenerating]);

    return (
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 dark:bg-slate-950/50">
            <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-60">
                         <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4">
                             <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                             </svg>
                         </div>
                         <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Kyoki Chat</h3>
                         <p className="text-slate-500 dark:text-slate-400 max-w-sm mt-2">
                             Describe your software idea. Our 15 agents will collaborate to build your blueprint.
                         </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <ChatMessage key={msg.id} message={msg} />
                    ))
                )}
                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
};
