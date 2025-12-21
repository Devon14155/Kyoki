
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { IntelligenceJob, RunPlan, JobStatus, EventEnvelope, AppSettings, ModelType, Blueprint } from '../types';
import { supervisor } from '../core/intelligence/supervisor';
import { eventBus } from '../core/intelligence/eventBus';

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
    
    // Use a Ref to track the current active job for the subscription callback
    const jobRef = useRef<string | null>(null);

    // Subscribe to EventBus (Main Thread)
    useEffect(() => {
        const unsubscribe = eventBus.subscribe((event: EventEnvelope) => {
            // Only update state if the event belongs to the active job we are watching
            if (event.jobId === jobRef.current) {
                setLiveEvents(prev => [...prev, event]);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync State with DB
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
        setJobStatus('RUNNING');
        
        try {
            // Call Supervisor Directly
            const jobId = await supervisor.startJob(
                blueprint.projectId,
                blueprint.id,
                prompt,
                apiKey,
                modelType,
                settings
            );
            setActiveJobId(jobId);
        } catch (e) {
            console.error("Failed to start job via Supervisor:", e);
            setJobStatus('FAILED');
        }
    }, []);

    const pauseJob = useCallback(async () => {
        if (activeJobId) await supervisor.pauseJob(activeJobId);
    }, [activeJobId]);

    const resumeJob = useCallback(async () => {
        if (activeJobId) {
            await supervisor.resumeJob(activeJobId);
            setJobStatus('RUNNING');
        }
    }, [activeJobId]);

    const retryTask = useCallback(async (taskId: string) => {
        if (activeJobId) await supervisor.retryTask(activeJobId, taskId);
    }, [activeJobId]);

    const dispatchTask = useCallback(async (role: string, instruction: string, context: Record<string, string>) => {
        const jId = activeJobId || jobRef.current;
        if (!jId) {
             console.warn("No active job session for task dispatch.");
             throw new Error("No active job session");
        }
        
        // Call Supervisor Directly
        return await supervisor.dispatchAgentTask(jId, role, instruction, context);
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
