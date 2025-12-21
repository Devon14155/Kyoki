
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, Circle } from 'lucide-react';
import { ProgressState } from '../../hooks/useChatOrchestration';

interface ProgressIndicatorProps {
    phase: string;
    activeAgents: string[];
    completed: number;
    total: number;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ phase, activeAgents, completed, total }) => {
    const percentage = Math.min(100, Math.round((completed / total) * 100));

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-slate-700 w-[320px]"
            >
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-400">{phase}</span>
                    <span className="text-xs font-mono text-slate-400">{percentage}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden mb-4">
                    <motion.div 
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>

                {/* Active Agents */}
                <div className="space-y-2">
                    <p className="text-xs text-slate-400 mb-1">Active Agents:</p>
                    <div className="flex flex-wrap gap-2">
                        <AnimatePresence>
                            {activeAgents.map(agent => (
                                <motion.div 
                                    key={agent}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-md border border-slate-600"
                                >
                                    <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                                    <span className="text-[10px] font-medium">{agent}</span>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {activeAgents.length === 0 && <span className="text-[10px] text-slate-500 italic">Orchestrating next steps...</span>}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
