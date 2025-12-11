
import { describe, it, expect, runner } from './testRunner';
import { planner } from '../core/intelligence/planner';
import { TOOLS } from '../core/intelligence/tools';
import { deterministic } from '../core/intelligence/deterministic';

export const registerCoreTests = () => {
    runner.describe('HTD Planner', () => {
        it('should create an 8-step engineering pipeline', () => {
            const plan = planner.createRunPlan('test-project', 'test-seed');
            expect(plan.tasks.length).toBe(8);
            expect(plan.tasks[0].role).toBe('PRODUCT_ARCHITECT');
            expect(plan.tasks[7].role).toBe('SDET');
        });

        it('should correctly link dependencies', () => {
            const plan = planner.createRunPlan('test-project', 'test-seed');
            const backendTask = plan.tasks.find(t => t.role === 'BACKEND_ARCHITECT');
            // Backend depends on Frontend and Reqs (indices 2 and 0)
            // IDs are task-0...task-7. Backend is task-3.
            // Dependencies should contain task-2 (Frontend)
            expect(backendTask?.dependencies.includes('task-2')).toBeTruthy();
        });
    });

    runner.describe('Deterministic Tools', () => {
        it('should detect AWS keys in SecurityScanner', () => {
            const leak = "Here is my key: AKIAIOSFODNN7EXAMPLE";
            const result = TOOLS.securityScanner(leak);
            expect(result.success).toBe(false);
            expect(result.warnings[0]).toContain('AWS Key');
        });

        it('should pass clean text in SecurityScanner', () => {
            const safe = "Just some config code.";
            const result = TOOLS.securityScanner(safe);
            expect(result.success).toBe(true);
        });

        it('should validate correct Mermaid syntax', () => {
            const diagram = "```mermaid\ngraph TD\nA-->B\n```";
            const result = TOOLS.mermaidValidator(diagram);
            expect(result.success).toBe(true);
        });

        it('should fail unbalanced Mermaid braces', () => {
            const bad = "```mermaid\ngraph { A \n```";
            const result = TOOLS.mermaidValidator(bad);
            expect(result.success).toBe(false);
        });
        
        it('should estimate costs correctly', () => {
            const infra = "We need 2 EC2 instances and 1 RDS database.";
            const result = TOOLS.costEstimator(infra);
            // 2*40 + 1*60 = 140
            expect(result.data.estimatedCost).toBe(140);
        });
    });

    runner.describe('Deterministic Controller', () => {
        it('should generate consistent seeds', async () => {
            const seed1 = await deterministic.generateSeed('proj-1', 'prompt A');
            const seed2 = await deterministic.generateSeed('proj-1', 'prompt A');
            const seed3 = await deterministic.generateSeed('proj-1', 'prompt B');
            
            expect(seed1).toBe(seed2);
            expect(seed1 !== seed3).toBeTruthy();
        });

        it('should generate consistent cache keys', async () => {
            const k1 = await deterministic.getCacheKey('seed', 't1', 'gemini', 'v1', 'Hello');
            const k2 = await deterministic.getCacheKey('seed', 't1', 'gemini', 'v1', 'Hello');
            expect(k1).toBe(k2);
        });
    });
};
