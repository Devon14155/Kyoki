
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Blueprint, ChatMessage, ContextItem, ModelType, BlueprintVersion, AppSettings, EventEnvelope } from '../types';
import { storageService } from '../services/storage';
import { engine } from '../core/engine';
import { eventBus } from '../core/intelligence/eventBus';
import { explainSectionStream, regenerateSectionStream } from '../services/aiService';
import { Button, MarkdownView, Badge, DiffViewer } from '../components/UI';
import { KYOKI_TOOLS } from '../services/toolPrompts';
import { 
    Send, Cpu, Save, PanelRightClose, PanelRightOpen, 
    RefreshCw, Download, Printer, Layers, History, Wrench, ShieldAlert, CheckCircle2, AlertTriangle, Terminal, List, X
} from 'lucide-react';

export const Editor = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get('prompt');
  const pid = searchParams.get('pid');

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  const [showToc, setShowToc] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(true);
  const [headers, setHeaders] = useState<{ id: string, title: string, level: number }[]>([]);
  
  const [liveEvents, setLiveEvents] = useState<EventEnvelope[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [apiKey, setApiKey] = useState<string>('');
  const [modelType, setModelType] = useState<ModelType>(storageService.getSettings().activeModel);
  const [availableKeys, setAvailableKeys] = useState<Record<string, string>>({});
  const [safetySettings, setSafetySettings] = useState<AppSettings['safety']>(storageService.getSettings().safety);

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
            if (initialPrompt && (keys[settings.activeModel] || settings.activeModel === 'gemini')) {
                setTimeout(() => handleGenerate(initialPrompt), 500);
            }
        }
        setLoading(false);
    };
    init();
  }, [id, pid]); 

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveEvents]);

  useEffect(() => {
      if (!activeJobId) return;

      const unsub = eventBus.subscribe((event) => {
          if (event.jobId === activeJobId) {
              setLiveEvents(prev => [...prev, event]);
              if (event.phase === 'FINALIZE' || event.eventType === 'CONSENSUS_READY') {
                 storageService.getBlueprint(blueprint!.id).then(bp => {
                     if (bp) setBlueprint(bp);
                 });
              }
              
              if (event.phase === 'FINALIZE' && event.eventType === 'TASK_STARTED') {
                  setIsGenerating(false);
                  setActiveJobId(null);
              }
          }
      });
      return () => unsub();
  }, [activeJobId, blueprint]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newModel = e.target.value as ModelType;
      setModelType(newModel);
      setApiKey(availableKeys[newModel] || '');
  };

  const handleSave = async (snapshot = true) => {
      if (blueprint) {
          await storageService.saveBlueprint(blueprint, snapshot);
          const saved = await storageService.getBlueprint(blueprint.id);
          if (saved) setBlueprint(saved);
      }
  };

  const handleGenerate = async (promptText: string) => {
    if (!promptText.trim() || isGenerating || !blueprint) return;
    
    // For Gemini, apiKey is ignored by aiService so it's fine if empty string here
    if (!apiKey && modelType !== 'gemini') {
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'system',
            content: `⚠️ No API Key found for ${modelType}. Please configure in Settings.`,
            timestamp: Date.now()
        }]);
        return;
    }

    setIsGenerating(true);
    setInput('');
    setLiveEvents([]);
    
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content: promptText,
      timestamp: Date.now()
    }]);

    try {
        const jobId = await engine.startJob(
            blueprint.projectId,
            blueprint.id,
            promptText,
            apiKey, // Service handles environment key for Gemini
            modelType,
            safetySettings
        );
        setActiveJobId(jobId);
    } catch (e) {
        setIsGenerating(false);
        setMessages(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'system',
            content: `Error: ${e instanceof Error ? e.message : 'Unknown error'}`,
            timestamp: Date.now()
        }]);
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
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => window.print();

  const scrollToSection = (id: string) => { 
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setShowToc(false);
  };

  const handleSectionAction = async (title: string, content: string, action: 'explain'|'regenerate') => {
      if (!apiKey && modelType !== 'gemini') {
          alert("Please configure API key in settings first.");
          return;
      }
      
      // We switch to chat view to show the result
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
          updateMsg(`\n\nError: ${e instanceof Error ? e.message : 'Failed to process request.'}`);
      }
  };

  if (loading) return <div className="h-full flex items-center justify-center text-slate-500">Loading Intelligence Layer...</div>;
  if (!blueprint) return <div className="h-full flex items-center justify-center text-slate-500">Blueprint not found.</div>;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden relative">
      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex h-12 border-b border-slate-200 dark:border-slate-800 bg-surface print:hidden">
          <button onClick={() => setShowMobileChat(true)} className={`flex-1 font-medium text-sm ${showMobileChat ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500' : 'text-slate-500'}`}>Chat & Intel</button>
          <button onClick={() => setShowMobileChat(false)} className={`flex-1 font-medium text-sm ${!showMobileChat ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500' : 'text-slate-500'}`}>Blueprint</button>
      </div>

      {/* --- Chat Panel (Left) --- */}
      <div className={`flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex transition-all duration-300 print:hidden relative ${showMobileChat ? 'flex w-full md:w-[450px]' : 'hidden md:flex md:w-[450px]'}`}>
        
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 justify-between bg-white dark:bg-slate-950 shrink-0">
           <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
             <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-500" />
             <select 
                value={modelType} 
                onChange={handleModelChange}
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
             >
                 <option value="gemini">Gemini 3.0 Flash (Thinking)</option>
                 <option value="openai">GPT-4</option>
                 <option value="claude">Claude 3</option>
                 <option value="kimi">Kimi</option>
                 <option value="glm">GLM-4</option>
             </select>
           </div>
           <Badge color={isGenerating ? 'green' : 'slate'}>{isGenerating ? 'Active' : 'Idle'}</Badge>
        </div>

        {/* Messages / Logs Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Active Intelligence Job Visualization */}
          {liveEvents.length > 0 && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-500/30 p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                          <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`}/> Intelligence Layer v3.0
                      </h3>
                      <span className="text-[10px] text-slate-500">Trace: {liveEvents[0]?.traceId.slice(0,6)}</span>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {liveEvents.map((ev, i) => (
                          <div key={i} className="flex gap-2 text-xs animate-in slide-in-from-left-2 duration-300">
                              <span className="text-slate-500 dark:text-slate-600 font-mono shrink-0 w-16">
                                  {ev.timestamp.split('T')[1].slice(0,8)}
                              </span>
                              <div className="flex-1">
                                  <span className={`font-semibold mr-2 ${
                                      ev.phase === 'PLAN' ? 'text-purple-600 dark:text-purple-400' :
                                      ev.phase === 'DISPATCH' ? 'text-blue-600 dark:text-blue-400' :
                                      ev.phase === 'CONSENSUS' ? 'text-emerald-600 dark:text-emerald-400' :
                                      ev.phase === 'TOOL_EXECUTION' ? 'text-amber-600 dark:text-amber-500' :
                                      ev.phase === 'GROUNDING' ? 'text-indigo-600 dark:text-indigo-400' : 
                                      ev.level === 'ERROR' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                                  }`}>
                                      [{ev.phase}]
                                  </span>
                                  
                                  {ev.eventType === 'TOOL_RESULT' ? (
                                      <div className="mt-1 p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800">
                                          <div className="flex items-center gap-2 mb-1">
                                              <Terminal className="w-3 h-3 text-amber-500"/>
                                              <span className="font-mono text-amber-600 dark:text-amber-400">{ev.payload.toolId}</span>
                                              {ev.payload.success ? 
                                                <Badge color="green">PASS</Badge> : 
                                                <Badge color="red">ISSUES</Badge>
                                              }
                                          </div>
                                          {ev.payload.warnings?.length > 0 && (
                                              <ul className="list-disc list-inside text-red-600/80 dark:text-red-300/80 pl-1 mt-1">
                                                  {ev.payload.warnings.map((w: string, idx: number) => (
                                                      <li key={idx}>{w}</li>
                                                  ))}
                                              </ul>
                                          )}
                                          {ev.payload.data?.estimatedCost && (
                                              <div className="text-emerald-600 dark:text-emerald-400 font-mono pl-1">
                                                  Est. Cost: ${ev.payload.data.estimatedCost}/mo
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                    <span className="text-slate-700 dark:text-slate-300">
                                        {ev.eventType === 'MODEL_RESPONSE' ? `Generated ${ev.payload.length} chars` :
                                        ev.eventType === 'TASK_STARTED' ? ev.payload.message || ev.payload.role :
                                        ev.eventType === 'CONSENSUS_READY' ? `Consensus Confidence: ${(ev.payload.confidence*100).toFixed(0)}%` :
                                        ev.eventType === 'VERIFICATION_REPORT' ? `Verification: ${ev.payload.status}` :
                                        JSON.stringify(ev.payload)}
                                    </span>
                                  )}
                              </div>
                          </div>
                      ))}
                      <div ref={logsEndRef} />
                  </div>
              </div>
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
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
            <div className="relative">
                <textarea
                    className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 text-sm rounded-xl pl-4 pr-12 py-3 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                    rows={2}
                    placeholder="Describe architecture or ask for changes..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(input); } }}
                    disabled={isGenerating}
                />
                <div className="absolute right-2 bottom-2">
                    <button 
                        onClick={() => handleGenerate(input)}
                        disabled={isGenerating || !input.trim()}
                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                        {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* --- Blueprint Preview (Right/Main) --- */}
       <div className={`flex-1 flex flex-col h-full bg-background relative z-0 ${!showMobileChat ? 'flex' : 'hidden md:flex'}`}>
         
         <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur shrink-0 print:hidden sticky top-0 z-10">
             <div className="flex items-center gap-4">
                <h1 className="font-semibold text-slate-900 dark:text-slate-200 truncate max-w-[150px] md:max-w-md">{blueprint.title}</h1>
                <Badge color={blueprint.status === 'completed' ? 'green' : 'yellow'}>{blueprint.status}</Badge>
                {blueprint.verification_report?.overall === 'FAIL' && <Badge color="red"><ShieldAlert className="w-3 h-3 mr-1"/> Verification Failed</Badge>}
                {blueprint.verification_report?.overall === 'PASS' && <Badge color="green"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>}
             </div>
             <div className="flex items-center gap-2">
                 {/* Table of Contents Toggle */}
                 <div className="relative">
                     <button 
                        onClick={() => setShowToc(!showToc)} 
                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        title="Table of Contents"
                     >
                        <List className="w-5 h-5" />
                     </button>
                     {showToc && (
                         <div className="absolute top-full right-0 mt-2 w-64 max-h-[70vh] overflow-y-auto bg-surface border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl p-2 z-50">
                             <div className="flex justify-between items-center px-2 pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                                 <span className="text-xs font-semibold text-slate-500 uppercase">Contents</span>
                                 <button onClick={() => setShowToc(false)}><X className="w-3 h-3 text-slate-400"/></button>
                             </div>
                             {headers.length === 0 ? <p className="text-xs text-slate-400 px-2">No headers found.</p> : headers.map((h, i) => (
                                 <button
                                    key={i}
                                    onClick={() => scrollToSection(h.id)}
                                    className={`block w-full text-left px-2 py-1.5 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 truncate ${h.level === 1 ? 'font-medium' : 'pl-4'}`}
                                 >
                                     {h.title}
                                 </button>
                             ))}
                         </div>
                     )}
                 </div>

                 <button onClick={downloadMarkdown} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Download Markdown">
                    <Download className="w-5 h-5" />
                 </button>
                 <button onClick={handlePrint} className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" title="Print / PDF">
                    <Printer className="w-5 h-5" />
                 </button>
                 <Button variant="primary" size="sm" onClick={() => handleSave(true)}><Save className="w-4 h-4 mr-2" /> Save</Button>
             </div>
         </div>

         <div className="flex-1 flex overflow-hidden relative">
             <div className="flex-1 overflow-y-auto p-4 lg:p-12">
                 <div className="max-w-4xl mx-auto min-h-full bg-surface shadow-sm dark:shadow-2xl p-8 rounded-xl print:bg-white print:p-0 border border-slate-200 dark:border-slate-800">
                     {blueprint.content ? (
                         <MarkdownView 
                            content={blueprint.content} 
                            onHeadersParsed={setHeaders}
                            onSectionAction={handleSectionAction}
                         />
                     ) : (
                         <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 dark:text-slate-600 space-y-4">
                             <Layers className="w-10 h-10 opacity-30" />
                             <p>Generated blueprint will appear here.</p>
                         </div>
                     )}
                 </div>
             </div>
         </div>
       </div>
    </div>
  );
};
