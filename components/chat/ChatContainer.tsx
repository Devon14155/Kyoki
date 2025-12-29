
import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ProgressIndicator } from './ProgressIndicator';
import { Message, Task, AgentConfig } from '../../types';
import { Zap, Server, Code, Bot } from 'lucide-react';

interface ChatContainerProps {
    messages: Message[];
    tasks: Task[];
    activeTaskId: string | null;
    isGenerating: boolean;
    onSend: (text: string, files?: File[]) => void;
    onStop: () => void;
    config: AgentConfig;
    onConfigChange: (c: AgentConfig) => void;
}

const PresetCard = ({ icon: Icon, title, desc, onClick }: { icon: any, title: string, desc: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="text-left p-4 rounded-xl bg-surface border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-gray-600 transition-all hover:shadow-lg group flex flex-col gap-3 h-full"
    >
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#2A2A2A] flex items-center justify-center group-hover:bg-blue-600/10 dark:group-hover:bg-blue-600/20 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors text-slate-500 dark:text-gray-400">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-500 leading-relaxed">{desc}</p>
        </div>
    </button>
);

export const ChatContainer: React.FC<ChatContainerProps> = ({ 
    messages, tasks, activeTaskId, isGenerating, onSend, onStop, config, onConfigChange 
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showProgress, setShowProgress] = useState(true);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTaskId]);

    useEffect(() => {
        if (isGenerating) setShowProgress(true);
    }, [isGenerating]);

    return (
        <div className="flex flex-col h-full relative bg-background text-slate-900 dark:text-gray-100">
            
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
                        <div className="max-w-2xl w-full flex flex-col items-center text-center space-y-8">
                            
                            {/* Hero Icon */}
                            <div className="w-20 h-20 bg-surface rounded-2xl flex items-center justify-center shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Bot className="w-10 h-10 text-slate-400 dark:text-gray-200" />
                            </div>

                            {/* Headings */}
                            <div className="space-y-3">
                                <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-slate-900 to-slate-500 dark:from-white dark:to-gray-400">
                                    Design Enterprise-Grade<br/>Software Architecture
                                </h1>
                                <p className="text-slate-500 dark:text-gray-500 text-sm md:text-base">
                                    Powered by 15 specialized AI agents working in unison.
                                </p>
                            </div>

                            {/* Preset Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4">
                                <PresetCard 
                                    icon={Zap}
                                    title="Event-Driven System"
                                    desc="Draft an event-driven architecture for a fintech ledger"
                                    onClick={() => onSend("Design an event-driven architecture for a high-frequency fintech ledger system.")}
                                />
                                <PresetCard 
                                    icon={Server}
                                    title="Kubernetes Cluster"
                                    desc="Outline a multi-region K8s deployment strategy"
                                    onClick={() => onSend("Create a deployment strategy for a multi-region Kubernetes cluster with failover.")}
                                />
                                <PresetCard 
                                    icon={Code}
                                    title="SaaS Boilerplate"
                                    desc="Generate a Next.js + Supabase B2B SaaS structure"
                                    onClick={() => onSend("Scaffold a B2B SaaS architecture using Next.js, Supabase, and Stripe.")}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6 pb-32">
                        {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} />
                        ))}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* Progress Overlay */}
            {isGenerating && showProgress && (
                <ProgressIndicator 
                    tasks={tasks} 
                    activeTaskId={activeTaskId} 
                    onDismiss={() => setShowProgress(false)}
                />
            )}

            {/* Input Area */}
            <div className="shrink-0 z-10 bg-gradient-to-t from-background via-background to-transparent pt-10">
                <ChatInput 
                    onSend={onSend} 
                    onStop={onStop} 
                    isGenerating={isGenerating} 
                    config={config}
                    onConfigChange={onConfigChange}
                />
            </div>
        </div>
    );
};
