
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Blueprint, ModelType, AppSettings, AgentConfig, Message } from '../types';
import { storageService } from '../services/storage';
import { Button, MarkdownView, Badge } from '../components/UI';
import { useIntelligence } from '../hooks/useIntelligence';
import { useChat } from '../hooks/useChat';
import { ChatContainer } from '../components/chat/ChatContainer';
import { getModelDef } from '../services/modelRegistry';
import { 
    Save, RefreshCw, Download, List, X, ShieldAlert, CheckCircle2, Bot 
} from 'lucide-react';

export const Editor = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  const pid = searchParams.get('pid');

  // UI State
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(true);
  const [headers, setHeaders] = useState<{ id: string, title: string, level: number }[]>([]);
  
  // Settings State
  const [availableKeys, setAvailableKeys] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<AppSettings['safety']>(storageService.getSettings().safety);

  // Load Settings
  useEffect(() => {
    storageService.getApiKeys().then(setAvailableKeys);
    setSettings(storageService.getSettings().safety);
  }, []);

  // Initialization
  useEffect(() => {
    const init = async () => {
        if (id && id !== 'new') {
            const saved = await storageService.getBlueprint(id);
            if (saved) setBlueprint(saved);
        } else {
            // New Draft
            let projectId = pid;
            if (!projectId) {
                const projects = await storageService.getProjects();
                if (projects.length > 0) {
                    projectId = projects[0].id;
                } else {
                    const p = await storageService.createProject('Default Project');
                    projectId = p.id;
                }
            }

            setBlueprint({
                id: crypto.randomUUID(),
                projectId: projectId!,
                title: 'Untitled Architecture',
                description: 'New blueprint draft',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: [],
                content: '',
                status: 'draft',
                modelUsed: 'gemini',
                versions: []
            });
        }
    };
    init();
  }, [id, pid]); 

  // --- Hooks ---
  const { 
      isGenerating, jobStatus, runPlan, liveEvents, activeTaskId, 
      startJob, pauseJob, dispatchTask 
  } = useIntelligence(blueprint?.id);

  const {
      conversation,
      addMessage,
      updateLastMessage,
      sendMessage,
      isTyping,
      updateConfig
  } = useChat(blueprint?.id);

  // --- Auto-Trigger Initial Prompt ---
  const initialTriggered = React.useRef(false);
  useEffect(() => {
      if (initialPrompt && blueprint && !initialTriggered.current) {
          initialTriggered.current = true;
          handleSend(initialPrompt);
      }
  }, [blueprint, initialPrompt]);

  // --- Sync Intelligence Events to Chat UI ---
  useEffect(() => {
      if (liveEvents.length === 0) return;
      
      const lastEvent = liveEvents[liveEvents.length - 1];

      // If a task starts, show it in chat if it's relevant
      if (lastEvent.eventType === 'TASK_STARTED' && lastEvent.phase === 'DISPATCH') {
          // We could update the 'Thinking' bubble here to show exactly what's happening
          // For now, we rely on the ChatContainer's ProgressIndicator overlay
      }
      
      // If job finishes, refresh the blueprint document
      if (lastEvent.phase === 'FINALIZE') {
          if (blueprint) storageService.getBlueprint(blueprint.id).then(b => b && setBlueprint(b));
      }

  }, [liveEvents]);


  const handleSend = async (text: string, files?: File[]) => {
      if (!blueprint) return;
      
      // Determine Model: Chat Config > Blueprint > Global Default
      const globalDefault = storageService.getSettings().activeModel;
      const configModel = conversation?.metadata.agentConfig.modelSelection;
      const selectedModelId = configModel || blueprint.modelUsed || globalDefault;

      // Get Provider Key
      const modelDef = getModelDef(selectedModelId);
      const providerId = modelDef?.providerId || 'google';
      const apiKey = availableKeys[providerId] || '';

      // Delegate to Chat Hook which handles Routing (Chat vs Agent Job)
      await sendMessage(
          text,
          blueprint,
          apiKey,
          selectedModelId,
          settings,
          // Callback to start full pipeline
          async () => {
              await startJob(blueprint, text, apiKey, selectedModelId, settings);
          },
          // Callback to dispatch single task
          async (role, prompt) => {
              // We need an active job ID to dispatch tasks. 
              // If none exists (e.g. chat only session), we might need to start a "shell" job or attach to previous.
              // For robustness, if no active job, we start one in background.
              // However, useIntelligence handles this state internally usually.
              // We'll pass the Blueprint content as context.
              const context = { 'Current Blueprint': blueprint.content };
              await dispatchTask(role, prompt, context);
              // Refresh blueprint after task
              storageService.getBlueprint(blueprint.id).then(b => b && setBlueprint(b));
          }
      );
  };

  const handleStop = async () => {
      await pauseJob();
      updateLastMessage("🛑 Generation paused by user.", false);
  };

  const handleSave = async (snapshot = true) => {
      if (blueprint) {
          await storageService.saveBlueprint(blueprint, snapshot);
          const saved = await storageService.getBlueprint(blueprint.id);
          if (saved) setBlueprint(saved);
      }
  };

  const downloadMarkdown = () => {
    if (!blueprint) return;
    const blob = new Blob([blueprint.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blueprint.title.replace(/\s+/g, '_').toLowerCase()}.md`;
    a.click();
  };

  if (!blueprint) return <div className="h-full flex items-center justify-center text-slate-500">Loading Workspace...</div>;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden relative">
      {/* Mobile Tabs */}
      <div className="md:hidden flex h-12 border-b border-slate-200 dark:border-slate-800 bg-surface shrink-0">
          <button onClick={() => setShowMobileChat(true)} className={`flex-1 font-medium text-sm ${showMobileChat ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500'}`}>Team Chat</button>
          <button onClick={() => setShowMobileChat(false)} className={`flex-1 font-medium text-sm ${!showMobileChat ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500'}`}>Blueprint</button>
      </div>

      {/* --- Left Panel: Chat Interface --- */}
      <div className={`flex-col border-r border-slate-200 dark:border-slate-800 bg-[#0f0f0f] flex transition-all duration-300 relative ${showMobileChat ? 'flex w-full md:w-[450px] lg:w-[500px]' : 'hidden md:flex md:w-[450px] lg:w-[500px]'}`}>
          <ChatContainer 
            messages={conversation?.messages || []}
            tasks={runPlan?.tasks || []}
            activeTaskId={activeTaskId}
            isGenerating={isGenerating || isTyping}
            onSend={handleSend}
            onStop={handleStop}
            config={conversation?.metadata.agentConfig || {
                enabledAgents: [],
                modelSelection: storageService.getSettings().activeModel,
                tools: { webSearch: false, researchMode: false, thinkingMode: false }
            }}
            onConfigChange={updateConfig}
          />
      </div>

      {/* --- Right Panel: Document View --- */}
       <div className={`flex-1 flex flex-col h-full bg-background relative z-0 ${!showMobileChat ? 'flex' : 'hidden md:flex'}`}>
         
         {/* Toolbar */}
         <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur shrink-0 sticky top-0 z-10">
             <div className="flex items-center gap-4">
                <h1 className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px] md:max-w-md">{blueprint.title}</h1>
                <div className="flex gap-2">
                     <Badge color={blueprint.status === 'completed' ? 'green' : 'yellow'}>{blueprint.status}</Badge>
                     {blueprint.verification_report?.overall === 'FAIL' && <Badge color="red"><ShieldAlert className="w-3 h-3 mr-1"/> Issues</Badge>}
                     {blueprint.verification_report?.overall === 'PASS' && <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>}
                </div>
             </div>
             <div className="flex items-center gap-2">
                 <div className="relative">
                     <button 
                        onClick={() => setShowToc(!showToc)} 
                        className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Table of Contents"
                     >
                        <List className="w-5 h-5" />
                     </button>
                     {showToc && (
                         <div className="absolute top-full right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto bg-surface border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                             <div className="flex justify-between items-center px-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                                 <span className="text-xs font-semibold text-slate-500 uppercase">Contents</span>
                                 <button onClick={() => setShowToc(false)}><X className="w-3 h-3 text-slate-400"/></button>
                             </div>
                             {headers.length === 0 ? <p className="text-xs text-slate-400 px-2">No headers found.</p> : headers.map((h, i) => (
                                 <button
                                    key={i}
                                    onClick={() => { document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); setShowToc(false); }}
                                    className={`block w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 truncate ${h.level === 1 ? 'font-medium' : 'pl-4'}`}
                                 >
                                     {h.title}
                                 </button>
                             ))}
                         </div>
                     )}
                 </div>

                 <button onClick={downloadMarkdown} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Download Markdown">
                    <Download className="w-5 h-5" />
                 </button>
                 <Button variant="primary" size="sm" onClick={() => handleSave(true)}><Save className="w-4 h-4 mr-2" /> Save</Button>
             </div>
         </div>

         {/* Document Body */}
         <div className="flex-1 overflow-y-auto p-4 lg:p-12">
             <div className="max-w-4xl mx-auto min-h-full bg-surface shadow-sm dark:shadow-2xl p-8 rounded-xl border border-slate-200 dark:border-slate-800">
                 {blueprint.content ? (
                     <MarkdownView 
                        content={blueprint.content} 
                        onHeadersParsed={setHeaders}
                        onSectionAction={() => {}}
                     />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 dark:text-slate-600 space-y-4">
                         <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center">
                             <Bot className="w-10 h-10 opacity-30" />
                         </div>
                         <p className="text-lg font-medium">Blueprint Canvas</p>
                         <p className="text-sm max-w-xs text-center">Chat with the engineering team on the left to generate your architecture.</p>
                     </div>
                 )}
             </div>
         </div>
       </div>
    </div>
  );
};
