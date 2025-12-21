
import React from 'react';
import { RefreshCw, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '../../types';

interface ProgressIndicatorProps {
    tasks: Task[];
    activeTaskId: string | null;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ tasks, activeTaskId }) => {
    const completed = tasks.filter(t => t.status === 'COMPLETED').length;
    const total = tasks.length;
    const progress = total > 0 ? (completed / total) * 100 : 0;
    
    // Find active task details
    const activeTask = tasks.find(t => t.id === activeTaskId);
    const activeRole = activeTask?.role.replace(/_/g, ' ') || 'Initializing...';

    return (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] md:w-[600px] z-20 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-blue-500/30 shadow-2xl rounded-xl p-4 ring-1 ring-black/5">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                            {activeRole}
                        </span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                        {completed}/{total}
                    </span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Micro Steps */}
                <div className="flex gap-1 overflow-hidden opacity-50">
                    {tasks.map((t, i) => (
                        <div 
                            key={t.id} 
                            className={`h-1 flex-1 rounded-full transition-colors ${
                                t.status === 'COMPLETED' ? 'bg-emerald-500' :
                                t.status === 'IN_PROGRESS' ? 'bg-blue-500 animate-pulse' :
                                t.status === 'FAILED' ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-700'
                            }`}
                        />
                    ))}
                </div>
                
                {activeTask && (
                     <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 truncate">
                        Working on: {activeTask.section}
                     </p>
                )}
            </div>
        </div>
    );
};
