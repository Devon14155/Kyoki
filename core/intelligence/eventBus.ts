
import { EventEnvelope } from '../../types';

type Listener = (event: EventEnvelope) => void;

class EventBus {
    private listeners: Listener[] = [];
    private history: EventEnvelope[] = []; // In-memory buffer for immediate replay

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit(event: EventEnvelope) {
        this.history.push(event);
        if (this.history.length > 500) this.history.shift(); // Keep buffer manageable
        this.listeners.forEach(l => l(event));
    }

    getHistory(jobId: string): EventEnvelope[] {
        return this.history.filter(e => e.jobId === jobId);
    }

    // Factory for creating envelopes
    createEnvelope(
        jobId: string, 
        phase: EventEnvelope['phase'], 
        eventType: EventEnvelope['eventType'], 
        payload: any, 
        level: EventEnvelope['level'] = 'INFO'
    ): EventEnvelope {
        return {
            traceId: crypto.randomUUID(),
            jobId,
            timestamp: new Date().toISOString(),
            phase,
            eventType,
            level,
            payload
        };
    }
}

export const eventBus = new EventBus();
