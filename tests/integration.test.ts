
import { describe, it, expect, runner } from './testRunner';
import { eventBus } from '../core/intelligence/eventBus';
import { db } from '../services/db';

export const registerIntegrationTests = () => {
    runner.describe('Event Bus', () => {
        it('should broadcast events to subscribers', async () => {
            let received = null;
            const unsub = eventBus.subscribe((e) => {
                received = e;
            });

            const env = eventBus.createEnvelope('job-1', 'PLAN', 'TASK_STARTED', { foo: 'bar' });
            eventBus.emit(env);

            // Wait a tick
            await new Promise(r => setTimeout(r, 10));

            expect(received).toBeTruthy();
            if (received) {
                // @ts-ignore
                expect(received.jobId).toBe('job-1');
            }
            unsub();
        });

        it('should maintain history buffer', () => {
            const env = eventBus.createEnvelope('job-hist', 'PLAN', 'TASK_STARTED', {});
            eventBus.emit(env);
            const hist = eventBus.getHistory('job-hist');
            expect(hist.length).toBeGreaterThan(0);
        });
    });

    runner.describe('Storage Integration', () => {
        it('should persist and retrieve KV pairs', async () => {
            await db.setVal('test-key', 'test-value');
            const val = await db.getVal('test-key');
            expect(val).toBe('test-value');
        });
    });
};
