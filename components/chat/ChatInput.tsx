
import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Sparkles, CornerDownLeft, Globe, Mic, X, Bot, Cpu, Zap, ChevronDown, Check } from 'lucide-react';
import { AgentConfig, ModelType } from '../../types';
import { useVoiceInput } from '../../hooks/useVoiceInput';

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
    const [showAgentMenu, setShowAgentMenu] = useState(false);
    const [showModelMenu, setShowModelMenu] = useState(false);
    const [showToolsMenu, setShowToolsMenu] = useState(false);
    
    const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported } = useVoiceInput();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const menusRef = useRef<HTMLDivElement>(null);

    // Sync Voice Transcript to Input
    useEffect(() => {
        if (transcript) {
            setInput(prev => {
                const prefix = prev.trim() ? prev + ' ' : '';
                return transcript; 
            });
        }
    }, [transcript]);

    // Auto-resize
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [input]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menusRef.current && !menusRef.current.contains(event.target as Node)) {
                setShowAgentMenu(false);
                setShowModelMenu(false);
                setShowToolsMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSend = () => {
        if ((!input.trim() && files.length === 0) || isGenerating) return;
        onSend(input, files);
        setInput('');
        setFiles([]);
        resetTranscript();
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

    const agentsList = [
        "Product Architect", "UX Architect", "Frontend Engineer", "Backend Architect", 
        "Data Modeler", "Security Engineer", "DevOps Engineer", "SRE"
    ];

    const models: {id: ModelType, name: string}[] = [
        { id: 'gemini', name: 'Gemini 3.0 Pro' },
        { id: 'openai', name: 'GPT-4 Turbo' },
        { id: 'claude', name: 'Claude 3.5 Sonnet' },
        { id: 'kimi', name: 'Kimi (Moonshot)' },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto px-4 pb-6" ref={menusRef}>
            {/* Popovers */}
            <div className="relative">
                {showAgentMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-50 animate-in slide-in-from-bottom-2 fade-in">
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">Active Agents</span>
                            <button 
                                onClick={() => onConfigChange({...config, enabledAgents: []})}
                                className="text-[10px] text-blue-500 hover:underline"
                            >
                                Reset
                            </button>
                        </div>
                        <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                            {agentsList.map(agent => (
                                <button
                                    key={agent}
                                    onClick={() => {
                                        const exists = config.enabledAgents.includes(agent);
                                        const newAgents = exists 
                                            ? config.enabledAgents.filter(a => a !== agent)
                                            : [...config.enabledAgents, agent];
                                        onConfigChange({...config, enabledAgents: newAgents});
                                    }}
                                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs transition-colors ${config.enabledAgents.includes(agent) ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]'}`}
                                >
                                    <span>{agent}</span>
                                    {config.enabledAgents.includes(agent) && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {showModelMenu && (
                    <div className="absolute bottom-full left-20 mb-2 w-48 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-1 z-50 animate-in slide-in-from-bottom-2 fade-in">
                        {models.map(m => (
                            <button
                                key={m.id}
                                onClick={() => {
                                    onConfigChange({...config, modelSelection: m.id});
                                    setShowModelMenu(false);
                                }}
                                className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs transition-colors ${config.modelSelection === m.id ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]'}`}
                            >
                                <span>{m.name}</span>
                                {config.modelSelection === m.id && <Check className="w-3 h-3" />}
                            </button>
                        ))}
                    </div>
                )}
                
                {showToolsMenu && (
                    <div className="absolute bottom-full left-40 mb-2 w-48 bg-surface border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 animate-in slide-in-from-bottom-2 fade-in">
                        {[
                            { id: 'webSearch', label: 'Web Search', icon: Globe },
                            { id: 'thinkingMode', label: 'Reasoning Mode', icon: Sparkles },
                            { id: 'researchMode', label: 'Deep Research', icon: Zap }
                        ].map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => onConfigChange({
                                    ...config, 
                                    tools: { ...config.tools, [tool.id]: !config.tools[tool.id as keyof typeof config.tools] }
                                })}
                                className={`flex items-center w-full px-3 py-2 rounded-lg text-xs transition-colors mb-1 gap-2 ${
                                    config.tools[tool.id as keyof typeof config.tools] ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]'
                                }`}
                            >
                                <tool.icon className="w-3 h-3" />
                                <span>{tool.label}</span>
                                {config.tools[tool.id as keyof typeof config.tools] && <Check className="w-3 h-3 ml-auto" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative bg-surface border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl transition-all focus-within:ring-1 focus-within:ring-blue-500/50">
                
                {/* File Chips */}
                {files.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-4 pt-3">
                        {files.map((f, i) => (
                            <div key={i} className="flex items-center gap-2 bg-slate-100 dark:bg-[#2A2A2A] px-3 py-1.5 rounded-lg text-xs text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-slate-800">
                                <span className="truncate max-w-[150px]">{f.name}</span>
                                <button onClick={() => removeFile(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
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
                    className="w-full bg-transparent border-none focus:ring-0 px-5 py-4 min-h-[60px] max-h-[300px] resize-none text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 text-[15px] leading-relaxed"
                    disabled={isGenerating}
                />

                <div className="flex items-center justify-between px-3 pb-3 pt-1">
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-slate-400 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-[#2A2A2A] rounded-lg transition-colors"
                            title="Attach Context"
                        >
                            <Paperclip className="w-4 h-4" />
                        </button>
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={e => setFiles([...files, ...Array.from(e.target.files || [])])}
                        />
                        
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>

                        {/* Agent Selector Toggle */}
                        <button 
                            onClick={() => setShowAgentMenu(!showAgentMenu)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                showAgentMenu || config.enabledAgents.length > 0
                                ? 'text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' 
                                : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]'
                            }`}
                        >
                            <Bot className="w-4 h-4" />
                            <span className="hidden sm:inline">Agents</span>
                            <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>

                        {/* Model Selector Toggle */}
                        <button 
                            onClick={() => setShowModelMenu(!showModelMenu)}
                            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A] transition-all"
                        >
                            <Cpu className="w-4 h-4" />
                            <span className="hidden sm:inline">{models.find(m => m.id === config.modelSelection)?.name.split(' ')[0]}</span>
                        </button>

                        {/* Tools Toggle */}
                        <button 
                            onClick={() => setShowToolsMenu(!showToolsMenu)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                Object.values(config.tools).some(Boolean) ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' : 'text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]'
                            }`}
                        >
                            <Zap className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        {isSupported && (
                            <button
                                onClick={isListening ? stopListening : startListening}
                                className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                                    isListening 
                                    ? 'bg-red-500/20 text-red-500 animate-pulse' 
                                    : 'text-slate-400 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A]'
                                }`}
                                title={isListening ? "Stop Recording" : "Start Voice Input"}
                            >
                                <Mic className="w-5 h-5" />
                            </button>
                        )}

                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 dark:text-gray-500 font-medium">
                            <span>Return</span>
                            <div className="bg-slate-100 dark:bg-[#2A2A2A] border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5">
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
                                    : 'bg-slate-100 dark:bg-[#2A2A2A] text-slate-400 dark:text-gray-500 cursor-not-allowed'
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
            
            <p className="text-center text-[11px] text-slate-400 dark:text-gray-500 mt-4">
                Kyoki 15-Agent System • {config.enabledAgents.length > 0 ? `${config.enabledAgents.length} Agents Active` : 'Auto-Orchestration Mode'}
            </p>
        </div>
    );
};
