
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useIntelligence } from '../hooks/useIntelligence';
import { ChatContainer } from '../components/chat/ChatContainer';
import { storageService } from '../services/storage';
import { AppSettings, Blueprint } from '../types';
import { Trash2, Plus, MessageSquare, History, X, Download } from 'lucide-react';

export const GeneralChat = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const threadId = searchParams.get('thread');
    
    // UI State
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Data State
    const [activeBlueprint, setActiveBlueprint] = useState<Blueprint | null>(null);
    const [history, setHistory] = useState<Blueprint[]>([]);
    const [availableKeys, setAvailableKeys] = useState<Record<string, string>>({});
    const [settings, setSettings] = useState<AppSettings['safety']>(storageService.getSettings().safety);
    
    // Hooks initialized with the active blueprint ID
    const { 
        isGenerating, jobStatus, runPlan, liveEvents, activeTaskId, 
        startJob, pauseJob, dispatchTask 
    } = useIntelligence(activeBlueprint?.id);

    const { 
        conversation, sendMessage, isTyping, clearHistory, updateConfig 
    } = useChat(activeBlueprint?.id);

    // 1. Initialization
    useEffect(() => {
        const init = async () => {
            const keys = await storageService.getApiKeys();
            setAvailableKeys(keys);
            setSettings(storageService.getSettings().safety);

            const allBlueprints = await storageService.getBlueprints();
            const generalChats = allBlueprints.filter(b => b.type === 'general_chat').sort((a,b) => b.updatedAt - a.updatedAt);
            setHistory(generalChats);

            if (threadId) {
                const existing = generalChats.find(b => b.id === threadId);
                if (existing) setActiveBlueprint(existing);
                else navigate('/assist', { replace: true });
            } else {
                setActiveBlueprint(null);
            }
        };
        init();
    }, [threadId, navigate]);

    // 2. Create New Thread Logic
    const createNewThread = async () => {
        const projects = await storageService.getProjects();
        let pid = projects[0]?.id;
        if (!pid) {
            const p = await storageService.createProject('General Chat Project');
            pid = p.id;
        }

        const newBp: Blueprint = {
            id: crypto.randomUUID(),
            projectId: pid,
            title: 'New Chat Session',
            description: 'General assistance chat',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tags: ['general-chat'],
            content: '',
            status: 'draft',
            type: 'general_chat', 
            modelUsed: storageService.getSettings().activeModel,
            versions: []
        };

        await storageService.saveBlueprint(newBp);
        setActiveBlueprint(newBp);
        navigate(`/assist?thread=${newBp.id}`);
        setHistory(prev => [newBp, ...prev]);
        setIsHistoryOpen(false); // Close history on new chat
        return newBp;
    };

    // 3. Handle Send
    const handleSend = async (text: string, files?: File[]) => {
        let currentBp = activeBlueprint;
        if (!currentBp) {
            currentBp = await createNewThread();
        }

        if (currentBp.title === 'New Chat Session') {
            const summary = text.slice(0, 30) + (text.length > 30 ? '...' : '');
            currentBp.title = summary;
            await storageService.saveBlueprint(currentBp);
            setHistory(prev => prev.map(b => b.id === currentBp!.id ? {...b, title: summary} : b));
        }

        const settingsFull = storageService.getSettings();
        const apiKey = availableKeys[settingsFull.activeModel] || '';

        await sendMessage(
            text,
            currentBp,
            apiKey,
            settingsFull.activeModel,
            settings,
            async () => {
                await startJob(currentBp!, text, apiKey, settingsFull.activeModel, settings);
            },
            async (role, prompt) => {
                const context = { 'Current Context': currentBp!.content };
                await dispatchTask(role, prompt, context);
                const updated = await storageService.getBlueprint(currentBp!.id);
                if (updated) setActiveBlueprint(updated);
            }
        );
    };

    const handleStop = async () => {
        await pauseJob();
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Delete this chat?")) {
            await storageService.deleteBlueprint(id);
            await storageService.deleteConversation(id);
            setHistory(prev => prev.filter(b => b.id !== id));
            if (activeBlueprint?.id === id) {
                navigate('/assist');
                setActiveBlueprint(null);
            }
        }
    };

    const handleExport = () => {
        if (!conversation) return;
        const text = conversation.messages.map(m => `[${m.role.toUpperCase()} - ${new Date(m.timestamp).toLocaleString()}]\n${m.content}\n`).join('\n---\n');
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat_export_${new Date().toISOString()}.txt`;
        a.click();
    };

    return (
        <div className="h-full flex flex-col bg-background relative overflow-hidden">
            
            {/* --- Top Bar --- */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-surface shrink-0 z-30">
                <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-slate-900 dark:text-gray-100 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                        AI Assistant
                    </span>
                    {activeBlueprint && (
                        <span className="text-xs text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-[#2A2A2A] px-2 py-1 rounded hidden md:inline-block truncate max-w-[200px]">
                            {activeBlueprint.title}
                        </span>
                    )}
                </div>
                
                <div className="flex items-center gap-2">
                    {/* New Chat */}
                    <button 
                        onClick={createNewThread}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">New Chat</span>
                    </button>

                    {/* History Toggle */}
                    <button 
                        onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                        className={`p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A2A2A] transition-colors ${isHistoryOpen ? 'bg-slate-100 dark:bg-[#2A2A2A] text-slate-900 dark:text-white' : ''}`}
                        title="Chat History"
                    >
                        <History className="w-5 h-5" />
                    </button>

                    {/* Export */}
                    {activeBlueprint && (
                        <button 
                            onClick={handleExport}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#2A2A2A] transition-colors"
                            title="Export Chat"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* --- Main Content with Overlay Drawer --- */}
            <div className="flex-1 relative overflow-hidden flex">
                
                {/* Chat Container */}
                <div className="flex-1 h-full relative z-10">
                    <ChatContainer
                        messages={conversation?.messages || []}
                        tasks={runPlan?.tasks || []}
                        activeTaskId={activeTaskId}
                        isGenerating={isGenerating || isTyping}
                        onSend={handleSend}
                        onStop={handleStop}
                        config={conversation?.metadata.agentConfig || { 
                            enabledAgents: [], 
                            modelSelection: 'gemini', 
                            tools: { webSearch: false, researchMode: false, thinkingMode: false } 
                        }}
                        onConfigChange={updateConfig}
                    />
                </div>

                {/* History Drawer (Slide Over) */}
                <div 
                    className={`absolute top-0 right-0 bottom-0 w-80 bg-surface border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 z-40 shadow-2xl flex flex-col ${
                        isHistoryOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <span className="font-semibold text-slate-800 dark:text-gray-200">Recent Chats</span>
                        <button onClick={() => setIsHistoryOpen(false)} className="text-slate-500 hover:text-slate-900 dark:text-gray-500 dark:hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {history.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 dark:text-gray-600 text-sm">No history yet.</div>
                        ) : (
                            history.map(bp => (
                                <div key={bp.id} className="group relative">
                                    <button
                                        onClick={() => { 
                                            setActiveBlueprint(bp); 
                                            navigate(`/assist?thread=${bp.id}`); 
                                            setIsHistoryOpen(false); 
                                        }}
                                        className={`w-full text-left px-3 py-3 rounded-lg text-sm transition-all pr-8 flex flex-col gap-1 ${
                                            activeBlueprint?.id === bp.id 
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' 
                                            : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-[#2A2A2A] hover:text-slate-900 dark:hover:text-gray-200'
                                        }`}
                                    >
                                        <span className="truncate font-medium">{bp.title}</span>
                                        <span className="text-[10px] text-slate-500 dark:text-gray-600">{new Date(bp.updatedAt).toLocaleDateString()}</span>
                                    </button>
                                    <button 
                                        onClick={(e) => handleDelete(e, bp.id)}
                                        className="absolute right-2 top-3 opacity-0 group-hover:opacity-100 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-opacity p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Backdrop for Drawer on Mobile */}
                {isHistoryOpen && (
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
                        onClick={() => setIsHistoryOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};
