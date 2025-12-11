
import { RunPlan, Task } from '../../types';

export const planner = {
    // Hierarchical Task Decomposition (HTD)
    createRunPlan(projectId: string, seed: string): RunPlan {
        const planId = crypto.randomUUID();
        const tasks: Task[] = [];
        
        // The Elite 8-Step Engineering Pipeline
        // Ordered to allow resolution of dependencies (DAG)
        const pipeline = [
            {
                role: 'PRODUCT_ARCHITECT',
                section: 'Requirements',
                desc: 'Generate PRD: Functional/Non-functional Reqs, User Stories, and Executive Summary.'
            },
            {
                role: 'UX_ARCHITECT',
                section: 'Design System',
                desc: 'Design the interaction layer, Design System, and Screen Flows (Mermaid).',
                deps: ['Requirements']
            },
            // PARALLEL TRACK START: Frontend and Backend can now run simultaneously 
            // as they both depend on Requirements & Design, but not each other initially.
            {
                role: 'FRONTEND_ENGINEER',
                section: 'Frontend Architecture',
                desc: 'Plan browser execution, state management, routes, and performance strategy.',
                deps: ['Design System', 'Requirements']
            },
            {
                role: 'BACKEND_ARCHITECT',
                section: 'Backend Architecture',
                desc: 'Define API Specification (OpenAPI), Controller Logic, and Backend Topology.',
                deps: ['Design System', 'Requirements'] 
            },
            // PARALLEL TRACK END
            {
                role: 'DATA_MODELER',
                section: 'Data Model',
                desc: 'Design Database Schema (SQL/NoSQL), ER Diagrams, and Data Flow.',
                deps: ['Backend Architecture']
            },
            {
                role: 'SECURITY_ENGINEER',
                section: 'Security Model',
                desc: 'Perform STRIDE analysis, define AuthZ matrices, and Security Controls.',
                deps: ['Backend Architecture', 'Frontend Architecture', 'Data Model']
            },
            // PARALLEL TRACK: DevOps and QA can mostly run concurrently once Arch is defined
            {
                role: 'PLATFORM_ENGINEER',
                section: 'Infrastructure & DevOps',
                desc: 'Define Infrastructure as Code (Topology), CI/CD pipelines, and Roadmap.',
                deps: ['Backend Architecture', 'Security Model']
            },
            {
                role: 'SDET',
                section: 'Testing Strategy',
                desc: 'Define Test Pyramid, Critical Path Tests, and Quality Gates.',
                deps: ['Requirements', 'Frontend Architecture', 'Backend Architecture']
            }
        ];

        pipeline.forEach((step, index) => {
            // Resolve dependency names to task IDs
            // Note: This relies on topological ordering in the array above
            const deps = (step.deps || []).map(d => {
                const found = tasks.find(t => t.section === d);
                return found ? found.id : '';
            }).filter(d => d);

            tasks.push({
                id: `task-${index}`,
                role: step.role,
                section: step.section,
                description: step.desc,
                dependencies: deps,
                budget: { tokens: 3000, time_ms: 45000 },
                priority: 1,
                status: 'PENDING'
            });
        });

        return {
            id: planId,
            projectId,
            seed,
            createdAt: Date.now(),
            tasks
        };
    }
};
