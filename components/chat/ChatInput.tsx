
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Sparkles, CornerDownLeft, Globe, Mic, X } from 'lucide-react';
import { AgentConfig } from '../../types';

interface ChatInputProps {
    onSend: (text: string, files?: File[]) => void;
    onStop: () => void;
    isGenerating: boolean;
    config: AgentConfig;
    onConfigChange: (cfg: AgentConfig) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, onStop, isGenerating, config, onConfigChange }) => {
    const [input, setInput] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    const handleSend = () => {
        if ((!input.trim() && files.length === 0) || isGenerating) return;
        onSend(input, files);
        setInput('');
        setFiles([]);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const removeFile = (idx: number) => {
        setFiles(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 pb-6">
            <div className="relative bg-[#1E1E1E] dark:bg-[#1E1E1E] bg-white border border-gray-200 dark:border-[#333] rounded-2xl shadow-2xl transition-all focus-within:ring-1 focus-within:ring-blue-500/50">
                
                {/* File Chips */}
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pt-3">
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-[#2A2A2A] px-3 py-1.5 rounded-lg text-xs text-gray-300 border border-[#333]">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(i)} className="hover:text-red-400"><X className="w-3 h-3"/></button>
                            </div>
                        ))}
                    </div>
                )}

                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your system requirements, tech stack, or scalability goals..."
                    className="w-full bg-transparent border-none focus:ring-0 px-5 py-4 min-h-[60px] max-h-[300px] resize-none text-gray-900 dark:text-gray-100 placeholder-gray-500 text-[15px] leading-relaxed"
                    disabled={isGenerating}
                />

                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-[#2A2A2A] rounded-lg transition-colors"
                            title="Attach Context"
                        >
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={e => setFiles([...files, ...Array.from(e.target.files || [])])}
                        />
                        
                        <button 
                            onClick={() => onConfigChange({...config, tools: {...config.tools, thinkingMode: !config.tools.thinkingMode}})}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                config.tools.thinkingMode 
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#2A2A2A]'
                            }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Use Blueprint</span>
                        </button>

                        <button
                             onClick={() => onConfigChange({...config, tools: {...config.tools, webSearch: !config.tools.webSearch}})}
                             className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                config.tools.webSearch 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'text-gray-400 hover:text-gray-200 hover:bg-[#2A2A2A]'
                            }`}
                        >
                            <Globe className="w-4 h-4" />
                            <span className="hidden sm:inline">Web Search</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium">
                            <span>Return</span>
                            <div className="bg-[#2A2A2A] border border-[#333] rounded px-1.5 py-0.5">
                                <CornerDownLeft className="w-3 h-3" />
                            </div>
                        </div>
                        <button
                            onClick={isGenerating ? onStop : handleSend}
                            disabled={!input.trim() && files.length === 0 && !isGenerating}
                            className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                                isGenerating
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : (input.trim() || files.length > 0)
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'
                                    : 'bg-[#2A2A2A] text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isGenerating ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowUp className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            <p className="text-center text-[11px] text-gray-500 mt-4">
                Kyoki generates architectural advice and blueprints. Please verify critical infrastructure decisions.
            </p>
        </div>
    );
};
