
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { IntelligenceJob, RunPlan, JobStatus, EventEnvelope, AppSettings, ModelType, Blueprint, WorkerMessage } from '../types';

// --- Worker Instantiation ---
// We use a standard Worker here. SharedWorker is powerful but complex to bundle inline.
// A standard Worker achieves the "Performance Gap" fix (Off-main-thread).
// We use a Blob to load the worker code which imports the actual logic.
// However, since we have 'core/intelligence/worker.ts', we can try to import it.
// If the environment supports it:
// const worker = new Worker(new URL('../core/intelligence/worker.ts', import.meta.url), { type: 'module' });

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
            // Using standard module worker
            workerRef.current = new Worker(new URL('../core/intelligence/worker.ts', import.meta.url), { type: 'module' });
            
            workerRef.current.onmessage = (e) => {
                const msg = e.data;
                if (msg.type === 'EVENT') {
                    const event = msg.payload as EventEnvelope;
                    if (event.jobId === jobRef.current) {
                        setLiveEvents(prev => [...prev, event]);
                    }
                }
            };
        }

        return () => {
            // We keep the worker alive generally, or terminate if we want to kill the "Brain" on unmount
            // For a single-page app, keeping it alive is fine.
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
        workerRef.current?.postMessage(msg);
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
        
        // Optimistically create ID here? Or let worker do it?
        // Worker does it. But we need the ID to track.
        // Actually, supervisor.startJob returns the ID. 
        // We can't await response easily with simple postMessage.
        // We will generate the ID here for the worker to use, ensuring sync.
        // Wait, supervisor.startJob generates it.
        // Let's rely on polling to find the latest job for this blueprint?
        // Or better: Pass the ID we want to use.
        // Refactoring: Supervisor.startJob logic in worker can accept an ID? 
        // No, let's keep it simple: We find the job by project/blueprint in polling or 
        // we change the protocol to request start and wait for a 'JOB_STARTED' event.
        
        // Correct approach: Just trigger start. The first event 'PLAN' 'TASK_STARTED' will contain jobId in envelope.
        // We listen for that.
        
        postToWorker({ 
            type: 'START_JOB', 
            payload: { blueprint, prompt, apiKey, modelType, settings } 
        });
        
        // We temporarily set status to RUNNING to show spinner until real data comes
        setJobStatus('RUNNING');
        
        // We need to catch the JobID from the stream.
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
        if (!activeJobId) throw new Error("No active job session");
        
        return new Promise<string>((resolve, reject) => {
            const tempId = role; // Simple correlation
            
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
                payload: { activeJobId, role, instruction, context } 
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
