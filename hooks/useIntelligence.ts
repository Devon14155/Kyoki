
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { engine } from '../core/engine';
import { supervisor } from '../core/intelligence/supervisor';
import { eventBus } from '../core/intelligence/eventBus';
import { IntelligenceJob, RunPlan, JobStatus, EventEnvelope, AppSettings, ModelType, Blueprint } from '../types';

export interface UseIntelligenceReturn {
    // State
    isGenerating: boolean;
    jobStatus: JobStatus;
    runPlan: RunPlan | null;
    liveEvents: EventEnvelope[];
    activeJobId: string | null;
    
    // Actions
    startJob: (blueprint: Blueprint, prompt: string, apiKey: string, modelType: ModelType, settings: AppSettings['safety']) => Promise<void>;
    pauseJob: () => Promise<void>;
    resumeJob: () => Promise<void>;
    retryTask: (taskId: string) => Promise<void>;
    
    // Derived
    activeTaskId: string | null; // The task currently selected or running
    setActiveTaskId: (id: string | null) => void;
}

export const useIntelligence = (blueprintId?: string): UseIntelligenceReturn => {
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<JobStatus>('CREATED');
    const [runPlan, setRunPlan] = useState<RunPlan | null>(null);
    const [liveEvents, setLiveEvents] = useState<EventEnvelope[]>([]);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    
    // Polling ref to prevent closure staleness
    const jobRef = useRef<string | null>(null);

    // Subscribe to EventBus
    useEffect(() => {
        if (!activeJobId) return;
        jobRef.current = activeJobId;

        const unsub = eventBus.subscribe((event) => {
            if (event.jobId === activeJobId) {
                setLiveEvents(prev => [...prev, event]);
            }
        });

        // Hydrate history immediately
        setLiveEvents(eventBus.getHistory(activeJobId));

        return () => {
            unsub();
            jobRef.current = null;
        };
    }, [activeJobId]);

    // Poll for Job State & Plan Updates
    useEffect(() => {
        if (!activeJobId) return;

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
            } catch (e) {
                console.error("Polling error", e);
            }
        };

        const interval = setInterval(poll, 1000);
        poll(); // Initial call

        return () => clearInterval(interval);
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
        
        try {
            const jobId = await engine.startJob(
                blueprint.projectId,
                blueprint.id,
                prompt,
                apiKey,
                modelType,
                settings
            );
            setActiveJobId(jobId);
            setJobStatus('RUNNING');
        } catch (e) {
            console.error(e);
            throw e;
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
        activeTaskId,
        setActiveTaskId
    };
};
