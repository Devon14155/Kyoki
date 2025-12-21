
import { EventEnvelope } from '../../types';

type Listener = (event: EventEnvelope) => void;

class EventBus {
    private listeners: Listener[] = [];
    private history: EventEnvelope[] = []; // In-memory buffer for immediate replay
    private broadcastChannel: BroadcastChannel | null = null; // Optional browser broadcast

    constructor() {
        if (typeof BroadcastChannel !== 'undefined') {
            this.broadcastChannel = new BroadcastChannel('kyoki_events');
        }
    }

    subscribe(listener: Listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // New: Bridge for Worker -> Main communication
    setBridge(bridgeFn: (event: EventEnvelope) => void) {
        this.subscribe(bridgeFn);
    }

    emit(event: EventEnvelope) {
        this.history.push(event);
        if (this.history.length > 500) this.history.shift(); // Keep buffer manageable
        
        this.listeners.forEach(l => l(event));
        
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(event);
        }
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
