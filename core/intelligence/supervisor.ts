import { db } from '../../services/db';
import { eventBus } from './eventBus';
import { planner } from './planner';
import { dispatcher } from './dispatcher';
import { mmce } from './mmce';
import { grounding } from './grounding';
import { verifier } from './verifier';
import { deterministic } from './deterministic';
import { TOOLS } from './tools';
import { IntelligenceJob, AppSettings, ModelType, ToolOutput, Task } from '../../types';

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
            logs: []
        };
        await db.put('jobs', job);

        // Run async without blocking UI
        this.runPipeline(job, prompt, apiKey, modelType, settings).catch(err => {
            console.error("Pipeline Crash", err);
            this.emit(jobId, 'PLAN', 'SUPERVISOR_ALERT', { error: err.message }, 'ERROR');
        });

        return jobId;
    }

    private emit(jobId: string, phase: any, type: any, payload: any, level: 'INFO'|'WARN'|'ERROR' = 'INFO') {
        const env = eventBus.createEnvelope(jobId, phase, type, payload, level);
        eventBus.emit(env);
    }

    private async runPipeline(job: IntelligenceJob, prompt: string, apiKey: string, modelType: ModelType, settings: any) {
        this.emit(job.id, 'PLAN', 'TASK_STARTED', { message: 'Initializing Intelligence Layer v3.0 (Elite Engineering Squad)...' });

        // 1. Plan
        const seed = await deterministic.generateSeed(job.projectId, prompt);
        const plan = planner.createRunPlan(job.projectId, seed);
        await db.put('runplans', plan);
        this.emit(job.id, 'PLAN', 'TASK_STARTED', { message: `Planner assigned ${plan.tasks.length} specialized agents.` });

        // 2. Execute Tasks (DAG Parallel Execution)
        // We track completed task IDs and artifacts
        const artifacts: Record<string, string> = {};
        const completedTaskIds = new Set<string>();
        const inProgressTaskIds = new Set<string>();
        // Track promises of running tasks [TaskId -> Promise<TaskId>]
        const executingTasks = new Map<string, Promise<string>>();
        
        // Initial context is just the prompt
        let baseContext = prompt; 

        // Main DAG Loop: Continues until all tasks are complete
        while (completedTaskIds.size < plan.tasks.length) {
            
            // A. Identify new runnable tasks (Deps met, not done, not running)
            const runnableTasks = plan.tasks.filter(t => 
                !completedTaskIds.has(t.id) &&
                !inProgressTaskIds.has(t.id) &&
                t.dependencies.every(d => completedTaskIds.has(d))
            );

            // B. Launch new tasks immediately
            for (const task of runnableTasks) {
                inProgressTaskIds.add(task.id);
                
                const taskPromise = this.executeAgentTask(
                    job, task, plan, artifacts, baseContext, apiKey, modelType, settings, seed
                )
                .then(() => task.id)
                .catch(err => {
                    // Propagate error to crash the pipeline safely
                    throw err; 
                });

                executingTasks.set(task.id, taskPromise);
            }

            // C. Check for Deadlock or Completion
            if (executingTasks.size === 0) {
                if (completedTaskIds.size < plan.tasks.length) {
                    throw new Error(`Pipeline Deadlock: ${plan.tasks.length - completedTaskIds.size} tasks pending with unmet dependencies.`);
                }
                break; // All done
            }

            // D. Wait for the *next* task to finish (Race)
            // This enables true parallel DAG execution: as soon as one finishes, we loop to check if it unblocked others.
            const finishedTaskId = await Promise.race(executingTasks.values());

            // E. Update State
            executingTasks.delete(finishedTaskId);
            inProgressTaskIds.delete(finishedTaskId);
            completedTaskIds.add(finishedTaskId);
        }

        // 3. Final Assembly
        // Stitch in the order defined by the plan array (logical reading order)
        let fullContent = "";
        plan.tasks.forEach(t => {
            fullContent += `# ${t.section}\n\n${artifacts[t.section]}\n\n`;
        });

        // 4. Verify
        const bp = await db.get<any>('blueprints', job.blueprintId);
        if (bp) {
            bp.content = fullContent;
            bp.status = 'completed';
            bp.updatedAt = Date.now();
            
            const verifyReport = verifier.verify(bp);
            bp.verification_report = verifyReport;
            await db.put('verification', verifyReport);
            this.emit(job.id, 'VERIFY', 'VERIFICATION_REPORT', { status: verifyReport.overall, checks: verifyReport.checks.length });

            await db.put('blueprints', bp);
        }

        // 5. Complete
        job.status = 'COMPLETED';
        job.updatedAt = Date.now();
        await db.put('jobs', job);
        this.emit(job.id, 'FINALIZE', 'TASK_STARTED', { message: 'Engineering Blueprint Generated Successfully.' });
    }

    private async executeAgentTask(
        job: IntelligenceJob, 
        task: Task, 
        plan: any,
        artifacts: Record<string, string>, 
        baseContext: string,
        apiKey: string, 
        modelType: ModelType, 
        settings: any, 
        seed: string
    ) {
        this.emit(job.id, 'DISPATCH', 'TASK_STARTED', { taskId: task.id, role: task.role, section: task.section });

        // Construct context specifically for this task based on its dependencies
        // This ensures the agent sees what it depends on, plus the base requirement context
        let taskContext = baseContext;
        
        // Always include Requirements if available (usually task 0)
        if (artifacts['Requirements'] && task.section !== 'Requirements') {
             taskContext += `\n\n# Requirements\n${artifacts['Requirements']}`;
        }

        // Append specific dependencies
        task.dependencies.forEach(depId => {
            const depTask = plan.tasks.find((t: Task) => t.id === depId);
            if (depTask && artifacts[depTask.section]) {
                taskContext += `\n\n# ${depTask.section}\n${artifacts[depTask.section]}`;
            }
        });

        // A. Dispatch
        const response = await dispatcher.dispatchTask(task, taskContext, apiKey, modelType, settings, seed);
        this.emit(job.id, 'DISPATCH', 'MODEL_RESPONSE', { taskId: task.id, length: response.length });

        // B. Consensus
        const consensus = mmce.process(task.id, response, modelType);
        await db.put('consensus', consensus);
        this.emit(job.id, 'CONSENSUS', 'CONSENSUS_READY', { taskId: task.id, confidence: consensus.confidence });

        // C. Tool Execution
        const toolResults = this.executeTools(task.role, consensus.final, artifacts);
        toolResults.forEach(res => {
            this.emit(job.id, 'TOOL_EXECUTION', 'TOOL_RESULT', res, res.success ? 'INFO' : 'WARN');
        });

        // D. Grounding
        const groundReport = await grounding.validate(consensus, apiKey, modelType);
        await db.put('grounding', groundReport);
        if (groundReport.status === 'WARN') {
            this.emit(job.id, 'GROUNDING', 'GROUNDING_ISSUE', { taskId: task.id, issues: groundReport.ungroundedClaims.length });
        }

        // E. Save Artifact
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
