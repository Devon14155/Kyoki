
import { supervisor } from './supervisor';
import { eventBus } from './eventBus';
import { WorkerMessage } from '../../types';

// Setup EventBus Bridge to post messages back to Main thread
eventBus.setBridge((event) => {
    self.postMessage({ type: 'EVENT', payload: event });
});

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
    const { type, payload } = e.data;

    try {
        switch (type) {
            case 'START_JOB':
                const { blueprint, prompt, apiKey, modelType, settings } = payload;
                await supervisor.startJob(
                    blueprint.projectId,
                    blueprint.id,
                    prompt,
                    apiKey,
                    modelType,
                    settings
                );
                break;

            case 'PAUSE_JOB':
                await supervisor.pauseJob(payload.jobId);
                break;

            case 'RESUME_JOB':
                await supervisor.resumeJob(payload.jobId);
                break;

            case 'RETRY_TASK':
                await supervisor.retryTask(payload.jobId, payload.taskId);
                break;

            case 'DISPATCH_TASK':
                // Ad-hoc dispatch handling
                const result = await supervisor.dispatchAgentTask(
                    payload.activeJobId,
                    payload.role,
                    payload.instruction,
                    payload.context
                );
                // We need to send result back manually as it's a request/response, not just an event stream
                // However, dispatchAgentTask also emits events which UI picks up.
                // We can also send a dedicated result message.
                self.postMessage({ 
                    type: 'DISPATCH_RESULT', 
                    payload: { id: payload.role, response: result } 
                });
                break;
        }
    } catch (err: any) {
        console.error('Worker Error:', err);
        // We could emit a global error event here
    }
};
