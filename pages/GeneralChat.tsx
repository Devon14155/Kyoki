
import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { useIntelligence } from '../hooks/useIntelligence';
import { ChatContainer } from '../components/chat/ChatContainer';
import { storageService } from '../services/storage';
import { AppSettings, Blueprint, Project } from '../types';
import { Trash2, MessageSquare, Plus, FolderOpen } from 'lucide-react';

export const GeneralChat = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const threadId = searchParams.get('thread');
    
    // State for the "Shadow" Blueprint backing this chat
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
        conversation, sendMessage, isTyping, clearHistory 
    } = useChat(activeBlueprint?.id);

    // 1. Initialization: Load or Create Blueprint
    useEffect(() => {
        const init = async () => {
            const keys = await storageService.getApiKeys();
            setAvailableKeys(keys);
            setSettings(storageService.getSettings().safety);

            // Load history of general chats
            const allBlueprints = await storageService.getBlueprints();
            const generalChats = allBlueprints.filter(b => b.type === 'general_chat').sort((a,b) => b.updatedAt - a.updatedAt);
            setHistory(generalChats);

            if (threadId) {
                // Load existing
                const existing = generalChats.find(b => b.id === threadId);
                if (existing) {
                    setActiveBlueprint(existing);
                } else {
                    navigate('/assist', { replace: true }); // Invalid ID, reset
                }
            } else {
                // No thread ID? Show "New Chat" state or empty
                // We don't auto-create until user sends a message or explicitly clicks new
                setActiveBlueprint(null);
            }
        };
        init();
    }, [threadId, navigate]);

    // 2. Create New Thread Logic
    const createNewThread = async () => {
        // Find or create default project
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
            type: 'general_chat', // MARKER
            modelUsed: storageService.getSettings().activeModel,
            versions: []
        };

        await storageService.saveBlueprint(newBp);
        setActiveBlueprint(newBp);
        navigate(`/assist?thread=${newBp.id}`);
        
        // Refresh history
        const all = await storageService.getBlueprints();
        setHistory(all.filter(b => b.type === 'general_chat').sort((a,b) => b.updatedAt - a.updatedAt));
        
        return newBp;
    };

    // 3. Handle Send
    const handleSend = async (text: string, files?: File[]) => {
        let currentBp = activeBlueprint;
        
        // Lazy creation if no active thread
        if (!currentBp) {
            currentBp = await createNewThread();
        }

        // Update Title if it's the first message
        if (currentBp.title === 'New Chat Session') {
            const summary = text.slice(0, 30) + (text.length > 30 ? '...' : '');
            currentBp.title = summary;
            await storageService.saveBlueprint(currentBp);
            setHistory(prev => prev.map(b => b.id === currentBp!.id ? {...b, title: summary} : b));
        }

        const settingsFull = storageService.getSettings();
        const apiKey = availableKeys[settingsFull.activeModel] || '';

        // Same logic as Editor: Use sendMessage which delegates to Supervisor if needed
        await sendMessage(
            text,
            currentBp,
            apiKey,
            settingsFull.activeModel,
            settings,
            // START JOB CALLBACK (For "Generate Blueprint" requests)
            async () => {
                await startJob(currentBp!, text, apiKey, settingsFull.activeModel, settings);
            },
            // DISPATCH TASK CALLBACK (For "Change X" requests)
            async (role, prompt) => {
                // Pass blueprint content as context
                const context = { 'Current Context': currentBp!.content };
                await dispatchTask(role, prompt, context);
                // Refresh blueprint after task
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
            await storageService.deleteConversation(id); // Clean up linked conversation
            setHistory(prev => prev.filter(b => b.id !== id));
            if (activeBlueprint?.id === id) {
                navigate('/assist');
                setActiveBlueprint(null);
            }
        }
    };

    return (
        <div className="h-full flex bg-[#0f0f0f] relative overflow-hidden">
            
            {/* Sidebar (History) */}
            <div className="w-64 border-r border-slate-800 bg-[#161616] flex flex-col shrink-0 hidden md:flex">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <span className="font-semibold text-slate-300 text-sm">Chat History</span>
                    <button onClick={createNewThread} className="p-1.5 bg-blue-600 text-white rounded hover:bg-blue-500 transition">
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {history.map(bp => (
                        <div key={bp.id} className="group relative">
                            <button
                                onClick={() => { setActiveBlueprint(bp); navigate(`/assist?thread=${bp.id}`); }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs truncate transition-all pr-8 ${
                                    activeBlueprint?.id === bp.id 
                                    ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' 
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                            >
                                {bp.title}
                            </button>
                            <button 
                                onClick={(e) => handleDelete(e, bp.id)}
                                className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    {history.length === 0 && (
                        <div className="text-center py-10 text-slate-600 text-xs italic">
                            No recent chats.
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 relative">
                
                {/* Mobile Header */}
                <div className="md:hidden h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-[#161616] shrink-0">
                    <span className="font-bold text-slate-200">Kyoki Assistant</span>
                    <button onClick={createNewThread} className="text-blue-400 font-medium text-sm">New Chat</button>
                </div>

                {/* Chat Container */}
                <div className="flex-1 relative overflow-hidden">
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
                        onConfigChange={(c) => { /* Optional: Update config in DB */ }}
                    />
                </div>
            </div>
        </div>
    );
};
