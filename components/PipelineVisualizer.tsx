
import React from 'react';
import { Task, JobStatus } from '../types';
import { CheckCircle2, Circle, Clock, AlertCircle, PauseCircle, PlayCircle, RefreshCw, ArrowRight, MousePointer2 } from 'lucide-react';

interface Props {
    tasks: Task[];
    jobStatus: JobStatus;
    onRetry: (taskId: string) => void;
    onPause: () => void;
    onResume: () => void;
    onTaskSelect: (taskId: string) => void;
    activeTaskId: string | null;
}

export const PipelineVisualizer: React.FC<Props> = ({ 
    tasks, 
    jobStatus, 
    onRetry, 
    onPause, 
    onResume, 
    onTaskSelect,
    activeTaskId 
}) => {
    
    const layers = [
        { name: "Product & Design", roles: ['PRODUCT_ARCHITECT', 'UX_ARCHITECT'] },
        { name: "Core Architecture", roles: ['FRONTEND_ENGINEER', 'BACKEND_ARCHITECT', 'DATA_MODELER'] },
        { name: "Reliability & Sec", roles: ['SECURITY_ENGINEER', 'PLATFORM_ENGINEER', 'SDET'] }
    ];

    const getStatusIcon = (status: Task['status']) => {
        switch(status) {
            case 'COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'IN_PROGRESS': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'FAILED': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'PAUSED': return <PauseCircle className="w-4 h-4 text-amber-500" />;
            default: return <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600" />;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-4 shadow-sm transition-all duration-200">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${jobStatus === 'RUNNING' ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`}></span>
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
                <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-slate-100 dark:bg-slate-800 -z-10"></div>

                {layers.map((layer, lIdx) => (
                    <div key={lIdx} className="relative pl-12">
                         <div className="absolute left-[22px] top-3 w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                         
                         <h4 className="text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">{layer.name}</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                             {tasks.filter(t => layer.roles.includes(t.role)).map(task => {
                                 const isActive = activeTaskId === task.id;
                                 return (
                                     <div 
                                        key={task.id}
                                        onClick={() => onTaskSelect(task.id)}
                                        className={`relative p-3 rounded-lg border flex flex-col gap-2 transition-all cursor-pointer group hover:shadow-md ${
                                            isActive 
                                              ? 'ring-2 ring-blue-500 border-transparent bg-blue-50 dark:bg-blue-900/20' 
                                              : task.status === 'IN_PROGRESS' 
                                                ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-500/50' 
                                                : task.status === 'COMPLETED'
                                                  ? 'bg-slate-50 dark:bg-slate-900 border-emerald-500/20 hover:border-emerald-500/50'
                                                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-blue-400/50'
                                        }`}
                                     >
                                         <div className="flex items-center justify-between">
                                             <div className="flex items-center gap-2">
                                                 {getStatusIcon(task.status)}
                                                 <span className={`text-xs font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                                     {task.role.replace(/_/g, ' ')}
                                                 </span>
                                             </div>
                                             {(task.status === 'COMPLETED' || task.status === 'FAILED') && (
                                                 <button 
                                                    onClick={(e) => { e.stopPropagation(); onRetry(task.id); }}
                                                    className="text-[10px] text-slate-400 hover:text-blue-500 underline opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Retry this step"
                                                 >
                                                     Retry
                                                 </button>
                                             )}
                                         </div>
                                         <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate pl-6">
                                             {task.section}
                                         </div>
                                         {task.status === 'IN_PROGRESS' && (
                                             <div className="w-full bg-slate-200 dark:bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                                                 <div className="h-full bg-blue-500 animate-pulse w-2/3"></div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
