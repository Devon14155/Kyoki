
import React from 'react';
import { Task, JobStatus } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, PauseCircle, PlayCircle, RefreshCw, ArrowRight } from 'lucide-react';

interface Props {
    tasks: Task[];
    jobStatus: JobStatus;
    onRetry: (taskId: string) => void;
    onPause: () => void;
    onResume: () => void;
    currentActiveId?: string;
}

export const PipelineVisualizer: React.FC<Props> = ({ tasks, jobStatus, onRetry, onPause, onResume }) => {
    
    // Simple topological sort for visualization layers (Requirements -> Design -> Arch -> etc)
    // Hardcoded categories for visual grouping based on standard Planner
    const layers = [
        { name: "Product & Design", roles: ['PRODUCT_ARCHITECT', 'UX_ARCHITECT'] },
        { name: "Core Architecture", roles: ['FRONTEND_ENGINEER', 'BACKEND_ARCHITECT', 'DATA_MODELER'] },
        { name: "Reliability & Sec", roles: ['SECURITY_ENGINEER', 'PLATFORM_ENGINEER', 'SDET'] }
    ];

    const getStatusIcon = (status: Task['status']) => {
        switch(status) {
            case 'COMPLETED': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            case 'IN_PROGRESS': return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'FAILED': return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'PAUSED': return <PauseCircle className="w-5 h-5 text-amber-500" />;
            default: return <Circle className="w-5 h-5 text-slate-300 dark:text-slate-600" />;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Agent Pipeline
                </h3>
                <div className="flex gap-2">
                    {jobStatus === 'RUNNING' && (
                        <button onClick={onPause} className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full hover:bg-amber-200 transition-colors">
                            <PauseCircle className="w-3 h-3" /> Pause
                        </button>
                    )}
                    {(jobStatus === 'PAUSED' || jobStatus === 'FAILED') && (
                        <button onClick={onResume} className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full hover:bg-emerald-200 transition-colors">
                            <PlayCircle className="w-3 h-3" /> Resume
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-6 relative">
                {/* Connector Line Background */}
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800 -z-10"></div>

                {layers.map((layer, lIdx) => (
                    <div key={lIdx} className="relative pl-12">
                         {/* Layer Dot */}
                         <div className="absolute left-[22px] top-3 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                         
                         <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">{layer.name}</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                             {tasks.filter(t => layer.roles.includes(t.role)).map(task => (
                                 <div 
                                    key={task.id} 
                                    className={`relative p-3 rounded-lg border flex flex-col gap-2 transition-all ${
                                        task.status === 'IN_PROGRESS' ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-500 ring-1 ring-blue-500/20' :
                                        task.status === 'COMPLETED' ? 'bg-slate-50 dark:bg-slate-900 border-emerald-500/30' :
                                        task.status === 'FAILED' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' :
                                        'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-80'
                                    }`}
                                 >
                                     <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                             {getStatusIcon(task.status)}
                                             <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{task.role.replace(/_/g, ' ')}</span>
                                         </div>
                                         {(task.status === 'COMPLETED' || task.status === 'FAILED') && (
                                             <button 
                                                onClick={() => onRetry(task.id)}
                                                className="text-[10px] text-slate-400 hover:text-blue-500 underline"
                                                title="Retry this step"
                                             >
                                                 Retry
                                             </button>
                                         )}
                                     </div>
                                     <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                         {task.section}
                                     </div>
                                     {task.status === 'IN_PROGRESS' && (
                                         <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                             <div className="h-full bg-blue-500 animate-pulse w-2/3"></div>
                                         </div>
                                     )}
                                 </div>
                             ))}
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
