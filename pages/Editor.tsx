
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Blueprint, ChatMessage, ModelType, AppSettings } from '../types';
import { storageService } from '../services/storage';
import { explainSectionStream, regenerateSectionStream } from '../services/aiService';
import { Button, MarkdownView, Badge } from '../components/UI';
import { PipelineVisualizer } from '../components/PipelineVisualizer';
import { LogStream } from '../components/LogStream';
import { useIntelligence } from '../hooks/useIntelligence';
import { 
    Send, Cpu, Save, RefreshCw, Download, Printer, Layers, List, X, ShieldAlert, CheckCircle2 
} from 'lucide-react';

export const Editor = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  const pid = searchParams.get('pid');

  // UI State
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [loading, setLoading] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(true);
  const [headers, setHeaders] = useState<{ id: string, title: string, level: number }[]>([]);
  
  // Settings State
  const [apiKey, setApiKey] = useState<string>('');
  const [modelType, setModelType] = useState<ModelType>(storageService.getSettings().activeModel);
  const [availableKeys, setAvailableKeys] = useState<Record<string, string>>({});
  const [safetySettings, setSafetySettings] = useState<AppSettings['safety']>(storageService.getSettings().safety);

  // Intelligence Hook
  const { 
      isGenerating, jobStatus, runPlan, liveEvents, activeJobId, 
      startJob, pauseJob, resumeJob, retryTask, activeTaskId, setActiveTaskId
  } = useIntelligence(blueprint?.id);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
        const settings = storageService.getSettings();
        const keys = await storageService.getApiKeys();
        
        setAvailableKeys(keys);
        setApiKey(keys[settings.activeModel] || '');
        setModelType(settings.activeModel);
        setSafetySettings(settings.safety);

        if (id && id !== 'new') {
            const saved = await storageService.getBlueprint(id);
            if (saved) setBlueprint(saved);
        } else if (pid) {
            // New Draft
            setBlueprint({
                id: crypto.randomUUID(),
                projectId: pid,
                title: 'Untitled Architecture',
                description: 'New blueprint draft',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tags: [],
                content: '',
                status: 'draft',
                modelUsed: settings.activeModel,
                versions: []
            });
            // Auto-trigger if prompt exists and keys are ready
            if (initialPrompt && (keys[settings.activeModel] || settings.activeModel === 'gemini')) {
                // We need blueprint state to be set before triggering. 
                // Using a timeout is a hack; in a real app, use a refined effect or route state.
                setTimeout(() => handleGenerate(initialPrompt), 500);
            }
        }
        setLoading(false);
    };
    init();
  }, [id, pid]); 

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Sync blueprint on completion events
  useEffect(() => {
     if (activeJobId && blueprint) {
         const lastEvent = liveEvents[liveEvents.length - 1];
         if (lastEvent && (lastEvent.phase === 'FINALIZE' || lastEvent.eventType === 'CONSENSUS_READY')) {
             storageService.getBlueprint(blueprint.id).then(bp => {
                 if (bp) setBlueprint(bp);
             });
         }
     }
  }, [liveEvents, activeJobId, blueprint]);

  const handleGenerate = async (promptText: string) => {
      if (!promptText.trim() || isGenerating || !blueprint) return;
      
      if (!apiKey && modelType !== 'gemini') {
          setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'system',
              content: `⚠️ No API Key found for ${modelType}. Please configure in Settings.`,
              timestamp: Date.now()
          }]);
          return;
      }

      setInput('');
      setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'user',
          content: promptText,
          timestamp: Date.now()
      }]);

      try {
          await startJob(blueprint, promptText, apiKey, modelType, safetySettings);
      } catch (e: any) {
           setMessages(prev => [...prev, {
              id: crypto.randomUUID(),
              role: 'system',
              content: `Error starting job: ${e.message}`,
              timestamp: Date.now()
          }]);
      }
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

  const handleSectionAction = async (title: string, content: string, action: 'explain'|'regenerate') => {
      if (!apiKey && modelType !== 'gemini') return;

      setShowMobileChat(true);
      const msgId = crypto.randomUUID();
      setMessages(prev => [...prev, {
          id: msgId,
          role: 'assistant',
          content: `**${action === 'explain' ? 'Explaining' : 'Regenerating'}: ${title}**\n\nThinking...`,
          timestamp: Date.now()
      }]);

      let responseText = "";
      const updateMsg = (chunk: string) => {
          responseText += chunk;
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: responseText } : m));
      };

      try {
          if (action === 'explain') {
              await explainSectionStream(title, content, apiKey, modelType, safetySettings, updateMsg);
          } else {
              await regenerateSectionStream(title, content, blueprint?.content || '', apiKey, modelType, safetySettings, updateMsg);
          }
      } catch (e) {
          updateMsg(`\n\nError: ${e instanceof Error ? e.message : 'Failed.'}`);
      }
  };

  if (loading) return <div className="h-full flex items-center justify-center text-slate-500">Loading Workspace...</div>;
  if (!blueprint) return <div className="h-full flex items-center justify-center text-slate-500">Blueprint not found.</div>;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden relative">
      {/* Mobile Tabs */}
      <div className="md:hidden flex h-12 border-b border-slate-200 dark:border-slate-800 bg-surface shrink-0">
          <button onClick={() => setShowMobileChat(true)} className={`flex-1 font-medium text-sm ${showMobileChat ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500'}`}>Chat & Intel</button>
          <button onClick={() => setShowMobileChat(false)} className={`flex-1 font-medium text-sm ${!showMobileChat ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600' : 'text-slate-500'}`}>Blueprint</button>
      </div>

      {/* --- Left Panel: Chat & Intelligence --- */}
      <div className={`flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex transition-all duration-300 relative ${showMobileChat ? 'flex w-full md:w-[450px]' : 'hidden md:flex md:w-[450px]'}`}>
        
        {/* Controls */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between bg-white dark:bg-slate-950 shrink-0">
           <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
             <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-500" />
             <select 
                value={modelType} 
                onChange={(e) => {
                    const m = e.target.value as ModelType;
                    setModelType(m);
                    setApiKey(availableKeys[m] || '');
                }}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
             >
                 <option value="gemini">Gemini 3.0 Flash</option>
                 <option value="openai">GPT-4</option>
                 <option value="claude">Claude 3</option>
             </select>
           </div>
           <Badge color={jobStatus === 'RUNNING' ? 'green' : jobStatus === 'PAUSED' ? 'yellow' : 'slate'}>
               {jobStatus === 'RUNNING' ? 'Running' : jobStatus === 'PAUSED' ? 'Paused' : 'Idle'}
           </Badge>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {runPlan && (
              <PipelineVisualizer 
                  tasks={runPlan.tasks} 
                  jobStatus={jobStatus}
                  onPause={pauseJob}
                  onResume={resumeJob}
                  onRetry={retryTask}
                  activeTaskId={activeTaskId}
                  onTaskSelect={setActiveTaskId}
              />
          )}
          
          {liveEvents.length > 0 && (
              <LogStream 
                events={liveEvents} 
                isGenerating={isGenerating}
                filterTaskId={activeTaskId}
                onClearFilter={() => setActiveTaskId(null)}
              />
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none' 
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
              }`}>
                <MarkdownView content={msg.content} />
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
            <div className="relative">
                <textarea
                    className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-sm rounded-xl pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                    rows={2}
                    placeholder="Describe architecture or ask for changes..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(input); } }}
                    disabled={isGenerating && jobStatus !== 'PAUSED'}
                />
                <div className="absolute right-2 bottom-2">
                    <button 
                        onClick={() => handleGenerate(input)}
                        disabled={(isGenerating && jobStatus !== 'PAUSED') || !input.trim()}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* --- Right Panel: Document View --- */}
       <div className={`flex-1 flex flex-col h-full bg-background relative z-0 ${!showMobileChat ? 'flex' : 'hidden md:flex'}`}>
         
         {/* Toolbar */}
         <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur shrink-0 sticky top-0 z-10">
             <div className="flex items-center gap-4">
                <h1 className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px] md:max-w-md">{blueprint.title}</h1>
                <div className="flex gap-2">
                     <Badge color={blueprint.status === 'completed' ? 'green' : 'yellow'}>{blueprint.status}</Badge>
                     {blueprint.verification_report?.overall === 'FAIL' && <Badge color="red"><ShieldAlert className="w-3 h-3 mr-1"/> Issues Found</Badge>}
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
                 <button onClick={() => window.print()} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Print / PDF">
                    <Printer className="w-5 h-5" />
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
                        onSectionAction={handleSectionAction}
                     />
                 ) : (
                     <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 dark:text-slate-600 space-y-4">
                         <Layers className="w-16 h-16 opacity-20" />
                         <p className="text-lg font-medium">Ready to Architect</p>
                         <p className="text-sm max-w-xs text-center">Describe your system on the left to start the multi-agent generation pipeline.</p>
                     </div>
                 )}
             </div>
         </div>
       </div>
    </div>
  );
};
