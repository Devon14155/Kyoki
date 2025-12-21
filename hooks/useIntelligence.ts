
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { IntelligenceJob, RunPlan, JobStatus, EventEnvelope, AppSettings, ModelType, Blueprint, WorkerMessage } from '../types';

export interface UseIntelligenceReturn {
    isGenerating: boolean;
    jobStatus: JobStatus;
    runPlan: RunPlan | null;
    liveEvents: EventEnvelope[];
    activeJobId: string | null;
    startJob: (blueprint: Blueprint, prompt: string, apiKey: string, modelType: ModelType, settings: AppSettings['safety']) => Promise<void>;
    pauseJob: () => Promise<void>;
    resumeJob: () => Promise<void>;
    retryTask: (taskId: string) => Promise<void>;
    dispatchTask: (role: string, instruction: string, context: Record<string, string>) => Promise<string>;
    activeTaskId: string | null; 
    setActiveTaskId: (id: string | null) => void;
}

export const useIntelligence = (blueprintId?: string): UseIntelligenceReturn => {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<JobStatus>('CREATED');
    const [runPlan, setRunPlan] = useState<RunPlan | null>(null);
    const [liveEvents, setLiveEvents] = useState<EventEnvelope[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    
    const workerRef = useRef<Worker | null>(null);
    const jobRef = useRef<string | null>(null);

    // Initialize Worker
    useEffect(() => {
        if (!workerRef.current) {
            try {
                let workerScriptUrl: URL | string;
                
                // Robust URL resolution
                try {
                    const metaUrl = typeof import.meta !== 'undefined' ? import.meta.url : undefined;
                    
                    // If we have a valid module URL that isn't a blob (blobs break relative paths)
                    if (metaUrl && !metaUrl.startsWith('blob:') && !metaUrl.startsWith('data:')) {
                        workerScriptUrl = new URL('../core/intelligence/worker.ts', metaUrl);
                    } else {
                        // Fallback to absolute path from root origin
                        // This assumes the app is served with /core/ available at root
                        workerScriptUrl = new URL('/core/intelligence/worker.ts', window.location.origin);
                    }
                } catch (e) {
                    console.warn("Worker URL construction failed, falling back to string path.");
                    workerScriptUrl = '/core/intelligence/worker.ts';
                }
                
                workerRef.current = new Worker(workerScriptUrl, { type: 'module' });
                
                workerRef.current.onmessage = (e) => {
                    const msg = e.data;
                    if (msg.type === 'EVENT') {
                        const event = msg.payload as EventEnvelope;
                        if (event.jobId === jobRef.current) {
                            setLiveEvents(prev => [...prev, event]);
                        }
                    } else if (msg.type === 'DISPATCH_RESULT') {
                        // Handled by dispatchTask promise logic
                    }
                };
                
                workerRef.current.onerror = (e) => {
                    const msg = e.message || "Unknown Worker Error";
                    const file = e.filename || "Unknown File";
                    const line = e.lineno || 0;
                    console.error(`Intelligence Worker Error in ${file}:${line}\n${msg}`);
                };
            } catch (e) {
                console.error("Failed to initialize Intelligence Worker:", e);
            }
        }

        return () => {
            // Cleanup if needed
        };
    }, []);

    // Sync State with DB (Polling still useful for persistent state, events for real-time)
    useEffect(() => {
        if (!activeJobId) return;
        jobRef.current = activeJobId;

        const poll = async () => {
            if (!jobRef.current) return; 
            try {
                const job = await db.get<IntelligenceJob>('jobs', jobRef.current);
                if (job) {
                    setJobStatus(job.status);
                    if (job.runPlanId) {
                        const plan = await db.get<RunPlan>('runplans', job.runPlanId);
                        setRunPlan(plan || null);
                    }
                }
            } catch (e) { console.error(e); }
        };

        const interval = setInterval(poll, 1000);
        poll(); 
        return () => {
            clearInterval(interval);
            jobRef.current = null;
        };
    }, [activeJobId]);

    const postToWorker = (msg: WorkerMessage) => {
        if (workerRef.current) {
            workerRef.current.postMessage(msg);
        } else {
            console.warn("Worker not initialized, cannot send message:", msg);
        }
    };

    const startJob = useCallback(async (
        blueprint: Blueprint, 
        prompt: string, 
        apiKey: string, 
        modelType: ModelType, 
        settings: AppSettings['safety']
    ) => {
        setLiveEvents([]);
        setRunPlan(null);
        setActiveTaskId(null);
        
        postToWorker({ 
            type: 'START_JOB', 
            payload: { blueprint, prompt, apiKey, modelType, settings } 
        });
        
        setJobStatus('RUNNING');
        
        // Listen for Job ID
        const handler = (e: MessageEvent) => {
            const msg = e.data;
            if (msg.type === 'EVENT' && msg.payload.phase === 'PLAN' && !activeJobId) {
                setActiveJobId(msg.payload.jobId);
                workerRef.current?.removeEventListener('message', handler);
            }
        };
        workerRef.current?.addEventListener('message', handler);

    }, [activeJobId]);

    const pauseJob = useCallback(async () => {
        if (activeJobId) postToWorker({ type: 'PAUSE_JOB', payload: { jobId: activeJobId } });
    }, [activeJobId]);

    const resumeJob = useCallback(async () => {
        if (activeJobId) {
            postToWorker({ type: 'RESUME_JOB', payload: { jobId: activeJobId } });
            setJobStatus('RUNNING');
        }
    }, [activeJobId]);

    const retryTask = useCallback(async (taskId: string) => {
        if (activeJobId) postToWorker({ type: 'RETRY_TASK', payload: { jobId: activeJobId, taskId } });
    }, [activeJobId]);

    const dispatchTask = useCallback(async (role: string, instruction: string, context: Record<string, string>) => {
        // Optimistic job ID usage or throw
        const jId = activeJobId || jobRef.current;
        if (!jId) {
             console.warn("No active job session for task dispatch. Using fallback/placeholder.");
             // Ideally start a transient job here, but for now we error to UI
             throw new Error("No active job session");
        }
        
        return new Promise<string>((resolve, reject) => {
            const tempId = role; 
            
            const handler = (e: MessageEvent) => {
                const msg = e.data;
                if (msg.type === 'DISPATCH_RESULT' && msg.payload.id === tempId) {
                    if (msg.payload.error) reject(new Error(msg.payload.error));
                    else resolve(msg.payload.response);
                    workerRef.current?.removeEventListener('message', handler);
                }
            };
            workerRef.current?.addEventListener('message', handler);
            
            postToWorker({ 
                type: 'DISPATCH_TASK', 
                payload: { activeJobId: jId, role, instruction, context } 
            });
        });
    }, [activeJobId]);

    return {
        isGenerating: jobStatus === 'RUNNING',
        jobStatus,
        runPlan,
        liveEvents,
        activeJobId,
        startJob,
        pauseJob,
        resumeJob,
        retryTask,
        dispatchTask,
        activeTaskId,
        setActiveTaskId
    };
};
