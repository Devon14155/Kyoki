
import { db } from '../../services/db';
import { eventBus } from './eventBus';
import { planner } from './planner';
import { dispatcher } from './dispatcher';
import { mmce } from './mmce';
import { grounding } from './grounding';
import { verifier } from './verifier';
import { deterministic } from './deterministic';
import { TOOLS } from './tools';
import { IntelligenceJob, AppSettings, ModelType, ToolOutput, Task, RunPlan, ConsensusItem } from '../../types';

export class Supervisor {
    
    async startJob(
        projectId: string, 
        blueprintId: string, 
        prompt: string, 
        apiKey: string, 
        modelType: ModelType, 
        settings: AppSettings['safety']
    ): Promise<string> {
        
        const jobId = crypto.randomUUID();
        const job: IntelligenceJob = {
            id: jobId,
            projectId,
            blueprintId,
            status: 'RUNNING',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            logs: [],
            // Save config for resumability
            contextConfig: {
                apiKey,
                modelType,
                settings,
                prompt
            }
        };
        await db.put('jobs', job);

        // Run async without blocking UI
        this.runPipeline(jobId).catch(err => {
            console.error("Pipeline Crash", err);
            this.emit(jobId, 'PLAN', 'SUPERVISOR_ALERT', { error: err.message }, 'ERROR');
        });

        return jobId;
    }

    async pauseJob(jobId: string) {
        const job = await db.get<IntelligenceJob>('jobs', jobId);
        if (job && job.status === 'RUNNING') {
            job.status = 'PAUSED';
            await db.put('jobs', job);
            this.emit(jobId, 'CONTROL', 'PIPELINE_PAUSED', { message: 'Pipeline pausing after current tasks...' });
        }
    }

    async resumeJob(jobId: string) {
        const job = await db.get<IntelligenceJob>('jobs', jobId);
        if (job && job.status === 'PAUSED') {
            job.status = 'RUNNING';
            await db.put('jobs', job);
            this.emit(jobId, 'CONTROL', 'PIPELINE_RESUMED', { message: 'Resuming pipeline...' });
            this.runPipeline(jobId);
        }
    }

    async retryTask(jobId: string, taskId: string) {
        // Reset task status to PENDING in RunPlan
        const job = await db.get<IntelligenceJob>('jobs', jobId);
        if (!job || !job.runPlanId) return;

        const plan = await db.get<RunPlan>('runplans', job.runPlanId);
        if (!plan) return;

        const task = plan.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = 'PENDING';
            task.output = undefined;
            await db.put('runplans', plan);
            
            // If job is COMPLETED or FAILED, restart it. If PAUSED, just ready it.
            if (job.status !== 'RUNNING') {
                await this.resumeJob(jobId);
            }
        }
    }

    private emit(jobId: string, phase: any, type: any, payload: any, level: 'INFO'|'WARN'|'ERROR' = 'INFO') {
        const env = eventBus.createEnvelope(jobId, phase, type, payload, level);
        eventBus.emit(env);
    }

    // --- Core State Machine ---

    private async runPipeline(jobId: string) {
        let job = await db.get<IntelligenceJob>('jobs', jobId);
        if (!job || !job.contextConfig) throw new Error("Job not found or corrupt");

        const { apiKey, modelType, settings, prompt } = job.contextConfig;

        // 1. Initialize Plan if needed
        let plan: RunPlan;
        if (!job.runPlanId) {
            this.emit(job.id, 'PLAN', 'TASK_STARTED', { message: 'Initializing Intelligence Layer v3.0...' });
            const seed = await deterministic.generateSeed(job.projectId, prompt);
            plan = planner.createRunPlan(job.projectId, seed);
            await db.put('runplans', plan);
            job.runPlanId = plan.id;
            job.seed = seed;
            await db.put('jobs', job);
            this.emit(job.id, 'PLAN', 'TASK_STARTED', { message: `Planner assigned ${plan.tasks.length} agents.` });
        } else {
            // Load existing plan (Resuming)
            const p = await db.get<RunPlan>('runplans', job.runPlanId);
            if (!p) throw new Error("RunPlan missing");
            plan = p;
        }

        // 2. Hydrate Artifacts from Consensus Store (State Recovery)
        // This ensures if user edited an artifact while PAUSED, we use the new version
        const artifacts: Record<string, string> = {};
        for (const t of plan.tasks) {
            if (t.status === 'COMPLETED') {
                const c = await db.get<ConsensusItem>('consensus', t.id);
                if (c) artifacts[t.section] = c.final;
            }
        }
        
        let baseContext = prompt;

        // 3. Execution Loop (State Machine)
        // We reload the job each iter to check for Pause signals
        while (true) {
            job = await db.get<IntelligenceJob>('jobs', jobId);
            if (!job || job.status === 'PAUSED' || job.status === 'FAILED') {
                break; // Exit loop, state is saved
            }

            // Identify Runnable Tasks
            const completedIds = new Set(plan.tasks.filter(t => t.status === 'COMPLETED').map(t => t.id));
            const inProgressIds = new Set(plan.tasks.filter(t => t.status === 'IN_PROGRESS').map(t => t.id));

            // Check completion
            if (completedIds.size === plan.tasks.length) {
                await this.finalizeJob(job, plan, artifacts);
                break;
            }

            const runnableTasks = plan.tasks.filter(t => 
                t.status === 'PENDING' &&
                t.dependencies.every(d => completedIds.has(d))
            );

            // Deadlock Check
            if (runnableTasks.length === 0 && inProgressIds.size === 0 && completedIds.size < plan.tasks.length) {
                 this.emit(job.id, 'PLAN', 'SUPERVISOR_ALERT', { error: 'Pipeline Deadlock detected.' }, 'ERROR');
                 job.status = 'FAILED';
                 await db.put('jobs', job);
                 break;
            }

            // If nothing new to run, wait for in-progress ones (Polling/Promise Race handled by parallel calls below)
            if (runnableTasks.length === 0) {
                // Just wait a bit and re-loop (polling state)
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }

            // Launch Tasks
            const promises = runnableTasks.map(async (task) => {
                // A. Mark IN_PROGRESS
                task.status = 'IN_PROGRESS';
                task.startTime = Date.now();
                await this.updateTaskInPlan(plan); // Persist status

                try {
                     await this.executeAgentTask(
                        job!, task, plan, artifacts, baseContext, apiKey, modelType, settings, job!.seed!
                    );
                    
                    // B. Mark COMPLETED
                    task.status = 'COMPLETED';
                    task.endTime = Date.now();
                    task.output = artifacts[task.section]; // Mirror for UI
                    await this.updateTaskInPlan(plan); // Persist
                } catch (e: any) {
                    task.status = 'FAILED';
                    task.error = e.message;
                    await this.updateTaskInPlan(plan);
                    this.emit(job!.id, 'DISPATCH', 'SUPERVISOR_ALERT', { error: `Task ${task.role} Failed: ${e.message}` }, 'ERROR');
                    // We don't fail the whole job immediately, allowing retry
                }
            });

            // Wait for at least one to finish or fail
            await Promise.all(promises);
        }
    }

    private async updateTaskInPlan(plan: RunPlan) {
        await db.put('runplans', plan);
    }

    private async finalizeJob(job: IntelligenceJob, plan: RunPlan, artifacts: Record<string, string>) {
        // Stitch Content
        let fullContent = "";
        plan.tasks.forEach(t => {
            if (artifacts[t.section]) {
                fullContent += `# ${t.section}\n\n${artifacts[t.section]}\n\n`;
            }
        });

        // Verify
        const bp = await db.get<any>('blueprints', job.blueprintId);
        if (bp) {
            bp.content = fullContent;
            bp.status = 'completed';
            bp.updatedAt = Date.now();
            bp.runplanId = plan.id; // Link for future traceability
            
            const verifyReport = verifier.verify(bp);
            bp.verification_report = verifyReport;
            await db.put('verification', verifyReport);
            this.emit(job.id, 'VERIFY', 'VERIFICATION_REPORT', { status: verifyReport.overall, checks: verifyReport.checks.length });

            await db.put('blueprints', bp);
        }

        job.status = 'COMPLETED';
        job.updatedAt = Date.now();
        await db.put('jobs', job);
        this.emit(job.id, 'FINALIZE', 'TASK_STARTED', { message: 'Engineering Blueprint Generated Successfully.' });
    }

    private async executeAgentTask(
        job: IntelligenceJob, 
        task: Task, 
        plan: RunPlan,
        artifacts: Record<string, string>, 
        baseContext: string,
        apiKey: string, 
        modelType: ModelType, 
        settings: any, 
        seed: string
    ) {
        this.emit(job.id, 'DISPATCH', 'TASK_STARTED', { taskId: task.id, role: task.role, section: task.section });

        // Build Context
        let taskContext = baseContext;
        if (artifacts['Requirements'] && task.section !== 'Requirements') {
             taskContext += `\n\n# Requirements\n${artifacts['Requirements']}`;
        }
        task.dependencies.forEach(depId => {
            const depTask = plan.tasks.find((t: Task) => t.id === depId);
            if (depTask && artifacts[depTask.section]) {
                taskContext += `\n\n# ${depTask.section}\n${artifacts[depTask.section]}`;
            }
        });

        // 1. Dispatch
        const response = await dispatcher.dispatchTask(task, taskContext, apiKey, modelType, settings, seed);
        this.emit(job.id, 'DISPATCH', 'MODEL_RESPONSE', { taskId: task.id, length: response.length });

        // 2. Consensus & Store
        const consensus = mmce.process(task.id, response, modelType);
        await db.put('consensus', consensus); // Single Source of Truth
        
        // 3. Tools
        const toolResults = this.executeTools(task.role, consensus.final, artifacts);
        toolResults.forEach(res => {
            this.emit(job.id, 'TOOL_EXECUTION', 'TOOL_RESULT', res, res.success ? 'INFO' : 'WARN');
        });

        // 4. Grounding
        const groundReport = await grounding.validate(consensus, apiKey, modelType);
        await db.put('grounding', groundReport);
        if (groundReport.status === 'WARN') {
            this.emit(job.id, 'GROUNDING', 'GROUNDING_ISSUE', { taskId: task.id, issues: groundReport.ungroundedClaims.length });
        }

        // 5. Update Local Artifact Map
        artifacts[task.section] = consensus.final;
    }

    private executeTools(role: string, content: string, artifacts: Record<string, string>): ToolOutput[] {
        const results: ToolOutput[] = [];

        results.push(TOOLS.securityScanner(content));

        if (content.includes('```mermaid')) {
            results.push(TOOLS.mermaidValidator(content));
        }

        if (role === 'PLATFORM_ENGINEER') {
            results.push(TOOLS.costEstimator(content));
        }

        if (role === 'BACKEND_ARCHITECT' && artifacts['Frontend Architecture']) {
            results.push(TOOLS.contractVerifier(artifacts['Frontend Architecture'], content));
        }

        return results;
    }
}

export const supervisor = new Supervisor();
