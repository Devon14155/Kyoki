
import React, { useEffect, useRef } from 'react';
import { EventEnvelope } from '../types';
import { RefreshCw, Filter } from 'lucide-react';

interface LogStreamProps {
    events: EventEnvelope[];
    isGenerating: boolean;
    filterTaskId: string | null;
    onClearFilter: () => void;
}

export const LogStream: React.FC<LogStreamProps> = ({ events, isGenerating, filterTaskId, onClearFilter }) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events]);

    const filteredEvents = filterTaskId 
        ? events.filter(e => e.payload?.taskId === filterTaskId || e.phase === 'PLAN' || e.phase === 'FINALIZE') 
        : events;

    return (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-blue-500/30 p-4 space-y-3 shadow-sm flex flex-col h-[250px]">
            <div className="flex items-center justify-between shrink-0">
                <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`}/> 
                    {filterTaskId ? 'Task Logs' : 'Intelligence Log'}
                </h3>
                {filterTaskId && (
                    <button onClick={onClearFilter} className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                        <Filter className="w-3 h-3" /> Clear Filter
                    </button>
                )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                {filteredEvents.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-8 italic">
                        {filterTaskId ? "No specific logs for this task yet..." : "Waiting for intelligence events..."}
                    </div>
                ) : (
                    filteredEvents.map((ev, i) => (
                        <div key={i} className="flex gap-2 text-xs animate-in slide-in-from-left-2 duration-300 group">
                            <span className="text-slate-400 dark:text-slate-600 font-mono shrink-0 w-12 select-none">
                                {ev.timestamp.split('T')[1].slice(0,8)}
                            </span>
                            <div className="flex-1 break-words">
                                <span className={`font-semibold mr-2 select-none ${
                                    ev.phase === 'PLAN' ? 'text-purple-600 dark:text-purple-400' :
                                    ev.phase === 'DISPATCH' ? 'text-blue-600 dark:text-blue-400' :
                                    ev.phase === 'CONSENSUS' ? 'text-emerald-600 dark:text-emerald-400' :
                                    ev.phase === 'TOOL_EXECUTION' ? 'text-amber-600 dark:text-amber-500' :
                                    ev.phase === 'GROUNDING' ? 'text-indigo-600 dark:text-indigo-400' : 
                                    ev.level === 'ERROR' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
                                }`}>
                                    [{ev.phase}]
                                </span>
                                <span className="text-slate-700 dark:text-slate-300 font-mono">
                                    {ev.eventType === 'MODEL_RESPONSE' ? (
                                        <span className="opacity-70">Generated {ev.payload.length} chars</span>
                                    ) : ev.eventType === 'TASK_STARTED' ? (
                                        <span className="text-blue-600 dark:text-blue-300">Started: {ev.payload.message || ev.payload.role}</span>
                                    ) : (
                                        ev.payload.message || JSON.stringify(ev.payload)
                                    )}
                                </span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
};
