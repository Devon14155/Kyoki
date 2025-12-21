
import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storageService } from '../services/storage';
import { IntelligenceJob, RunPlan, EventEnvelope, Task } from '../types';
import { db } from '../services/db';
import { 
    Activity, Clock, AlertTriangle, CheckCircle2, 
    ArrowLeft, Search, ZoomIn, ZoomOut, Database, Code
} from 'lucide-react';
import { Badge, Card } from '../components/UI';

export const TraceViewer = () => {
    const [searchParams] = useSearchParams();
    const jobId = searchParams.get('jobId');
    
    const [job, setJob] = useState<IntelligenceJob | null>(null);
    const [plan, setPlan] = useState<RunPlan | null>(null);
    const [events, setEvents] = useState<EventEnvelope[]>([]);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (!jobId) return;
        const load = async () => {
            const j = await db.get<IntelligenceJob>('jobs', jobId);
            if (j) {
                setJob(j);
                if (j.runPlanId) {
                    const p = await db.get<RunPlan>('runplans', j.runPlanId);
                    setPlan(p || null);
                }
                // Hydrate transient logs from history (in-memory) or DB if we stored them (we don't persist logs to DB yet in v3 spec, but we can assume they are passed via context or we can fetch active)
                // For this viewer to work post-session, logs need to be persisted.
                // Assuming `logs` on job object is populated or we fetch from a 'traces' store if we added one. 
                // For now, we use job.logs which is in the type definition.
                setEvents(j.logs || []); 
            }
        };
        load();
    }, [jobId]);

    const taskEvents = useMemo(() => {
        if (!selectedTask) return [];
        return events.filter(e => e.payload?.taskId === selectedTask.id);
    }, [selectedTask, events]);

    if (!job || !plan) return <div className="p-12 text-center text-slate-500">Loading Trace Data...</div>;

    const startTime = plan.createdAt;
    const endTime = Math.max(...plan.tasks.map(t => t.endTime || t.startTime || Date.now()));
    const totalDuration = endTime - startTime;

    return (
        <div className="h-full flex flex-col bg-background text-slate-900 dark:text-slate-100 overflow-hidden">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-surface shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.history.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" />
                            Distributed Trace
                            <span className="font-mono text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">{jobId?.slice(0,8)}</span>
                        </h1>
                        <p className="text-xs text-slate-500">
                            {new Date(job.createdAt).toLocaleString()} • Duration: {(totalDuration/1000).toFixed(1)}s
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ZoomOut className="w-4 h-4"/></button>
                    <span className="text-xs font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ZoomIn className="w-4 h-4"/></button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Timeline Panel */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 border-r border-slate-200 dark:border-slate-800 relative">
                    <div className="relative min-h-full">
                        {/* Time Grid */}
                        <div className="absolute inset-0 pointer-events-none flex">
                            {[0, 0.25, 0.5, 0.75, 1].map(p => (
                                <div key={p} className="h-full border-r border-dashed border-slate-200 dark:border-slate-800/50 relative" style={{ left: `${p * 100}%`, position: 'absolute' }}>
                                    <span className="absolute -top-6 -translate-x-1/2 text-[10px] text-slate-400">
                                        {(totalDuration * p / 1000).toFixed(1)}s
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Lanes */}
                        <div className="space-y-4 pt-4">
                            {plan.tasks.map(task => {
                                const start = task.startTime ? task.startTime - startTime : 0;
                                const duration = (task.endTime || Date.now()) - (task.startTime || Date.now());
                                const left = (start / totalDuration) * 100;
                                const width = Math.max((duration / totalDuration) * 100, 0.5); // Min width visibility

                                return (
                                    <div 
                                        key={task.id} 
                                        onClick={() => setSelectedTask(task)}
                                        className={`group relative h-10 rounded-lg border cursor-pointer transition-all hover:shadow-lg ${
                                            selectedTask?.id === task.id 
                                            ? 'ring-2 ring-blue-500 z-10' 
                                            : 'border-slate-200 dark:border-slate-700'
                                        } ${
                                            task.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-900/20' :
                                            task.status === 'FAILED' ? 'bg-red-50 dark:bg-red-900/20' :
                                            'bg-blue-50 dark:bg-blue-900/20'
                                        }`}
                                        style={{ 
                                            marginLeft: `${left}%`, 
                                            width: `${width * zoom}%`,
                                            minWidth: '100px' // Ensure visible label
                                        }}
                                    >
                                        <div className="flex items-center h-full px-3 gap-2 overflow-hidden">
                                            {task.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-blue-500" />}
                                            <span className="text-xs font-semibold truncate text-slate-700 dark:text-slate-200">{task.role}</span>
                                            <span className="text-[10px] text-slate-500 truncate border-l border-slate-300 dark:border-slate-700 pl-2 ml-auto">
                                                {task.metrics ? `${task.metrics.tokensUsed} toks` : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Details Panel */}
                <div className="w-96 bg-surface flex flex-col border-l border-slate-200 dark:border-slate-800">
                    {selectedTask ? (
                        <div className="flex flex-col h-full">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                                <h2 className="font-bold text-lg">{selectedTask.role}</h2>
                                <p className="text-sm text-slate-500">{selectedTask.section}</p>
                                <div className="flex gap-2 mt-3">
                                    <Badge color={selectedTask.status === 'COMPLETED' ? 'green' : 'red'}>{selectedTask.status}</Badge>
                                    <Badge color="blue">{selectedTask.metrics?.latency ? `${(selectedTask.metrics.latency/1000).toFixed(2)}s` : 'N/A'}</Badge>
                                    <Badge color="purple">{selectedTask.metrics?.tokensUsed || 0} tokens</Badge>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div>
                                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Payload Output</h3>
                                    <div className="bg-slate-100 dark:bg-slate-900 p-3 rounded-lg text-xs font-mono max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800">
                                        {selectedTask.output || <span className="italic opacity-50">No output</span>}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Trace Logs</h3>
                                    <div className="space-y-2">
                                        {taskEvents.map((e, i) => (
                                            <div key={i} className="text-xs p-2 rounded border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{e.phase}</span>
                                                    <span className="text-slate-400">{e.timestamp.split('T')[1].slice(0,8)}</span>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 break-words">
                                                    {typeof e.payload === 'string' ? e.payload : (e.payload.message || JSON.stringify(e.payload))}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Activity className="w-12 h-12 mb-4 opacity-20" />
                            <p>Select a task to view trace details.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
