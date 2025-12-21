
import React, { useState } from 'react';
import { Message, Artifact } from '../../types';
import { MarkdownView, CodeBlock } from '../UI'; // Reuse existing
import { Copy, Check, FileText, ChevronDown, ChevronRight, Bot, User, Sparkles } from 'lucide-react';

interface ChatMessageProps {
    message: Message;
}

const ArtifactCard: React.FC<{ artifact: Artifact }> = ({ artifact }) => {
    const [expanded, setExpanded] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(artifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-3 mb-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all hover:border-blue-400/50">
            <div 
                className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-800/50 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{artifact.filename}</span>
                    <span className="text-[10px] uppercase text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{artifact.type}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500"
                    >
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {expanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
            </div>
            {expanded && (
                <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-xs font-mono overflow-x-auto">
                    <pre className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{artifact.content.slice(0, 1000)}{artifact.content.length > 1000 && '...'}</pre>
                    {artifact.content.length > 1000 && (
                        <div className="mt-2 text-center text-slate-400 italic">Content truncated in preview.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message }) => {
    const isUser = message.role === 'user';
    const isThinking = message.role === 'thinking';
    const [copied, setCopied] = useState(false);

    const handleCopyMsg = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                
                {/* Agent Badge for AI */}
                {!isUser && !isThinking && (
                    <div className="flex items-center gap-2 mb-1.5 ml-1">
                        <div className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            {message.agentIcon ? <span className="text-xs">{message.agentIcon}</span> : <Bot className="w-3 h-3" />}
                        </div>
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {message.agentName || 'Kyoki AI'}
                        </span>
                    </div>
                )}

                <div 
                    className={`relative group px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border transition-all duration-200
                    ${isUser 
                        ? 'bg-blue-600 text-white border-blue-600 rounded-br-sm' 
                        : isThinking
                            ? 'bg-slate-50 dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 rounded-bl-sm animate-pulse'
                            : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                >
                    {isThinking ? (
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                            <Sparkles className="w-4 h-4 animate-spin-slow text-amber-500" />
                            <span className="font-medium">Thinking...</span>
                        </div>
                    ) : (
                        <>
                             <div className={isUser ? 'prose-invert' : ''}>
                                <MarkdownView content={message.content} />
                             </div>
                             
                             {/* Artifacts Attachment */}
                             {message.artifacts && message.artifacts.length > 0 && (
                                 <div className="mt-3 pt-3 border-t border-slate-200/20">
                                     {message.artifacts.map((art, i) => (
                                         <ArtifactCard key={i} artifact={art} />
                                     ))}
                                 </div>
                             )}

                             {/* Copy Button (Hover) */}
                             {!isThinking && (
                                 <button 
                                     onClick={handleCopyMsg}
                                     className={`absolute bottom-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-90 active:scale-95
                                     ${isUser ? 'bg-blue-700 text-blue-200 hover:bg-blue-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
                                     title="Copy message"
                                 >
                                     {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                 </button>
                             )}
                        </>
                    )}
                </div>
                
                <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
        </div>
    );
});
