

import { RunPlan, Task } from '../../types';

interface PhaseStep {
    role: string;
    section: string;
    desc: string;
    deps?: string[];
}

export const planner = {
    // Enhanced Hierarchical Task Decomposition (HTD)
    createRunPlan(projectId: string, seed: string): RunPlan {
        const planId = crypto.randomUUID();
        const tasks: Task[] = [];
        
        // The Enhanced 15-Step Engineering Pipeline
        // Mapped from the Phased Orchestration logic
        const phases: PhaseStep[][] = [
            // Phase 1: Requirements
            [
                { role: 'PRODUCT_ARCHITECT', section: 'Requirements', desc: 'Generate PRD: Functional/Non-functional Reqs, User Stories.' }
            ],
            // Phase 2: Design & Strategy
            [
                { role: 'UX_ARCHITECT', section: 'Design System', desc: 'Design interaction layer and Design System.', deps: ['Requirements'] },
                { role: 'STRATEGY_AGENT', section: 'Product & Business Metrics', desc: 'Define KPIs, Analytics, and A/B Testing.', deps: ['Requirements'] }
            ],
            // Phase 3: Core Architecture & Integration
            [
                { role: 'FRONTEND_ENGINEER', section: 'Frontend Architecture', desc: 'Plan browser execution, state, and routes.', deps: ['Design System'] },
                { role: 'BACKEND_ARCHITECT', section: 'Backend Architecture', desc: 'Define API Spec, Controllers, and Topology.', deps: ['Requirements', 'Design System'] },
                { role: 'INTEGRATION_ARCHITECT', section: 'Integration Architecture', desc: 'Design integrations, API Gateway, and Events.', deps: ['Backend Architecture'] }, // Note: Dependent on Backend, strictly needs to wait or run conceptually parallel but logically after
                { role: 'ACCESSIBILITY_ENGINEER', section: 'Accessibility Architecture', desc: 'Ensure WCAG compliance and inclusive design.', deps: ['Design System', 'Frontend Architecture'] }
            ],
            // Phase 4: Data & Performance
            [
                { role: 'DATA_MODELER', section: 'Data Model', desc: 'Design DB Schema, ER Diagrams, and Data Flow.', deps: ['Backend Architecture'] },
                { role: 'PERFORMANCE_ARCHITECT', section: 'Performance Architecture', desc: 'Budgets, Caching, and Optimization.', deps: ['Frontend Architecture', 'Backend Architecture'] }
            ],
            // Phase 5: Security & Compliance
            [
                { role: 'SECURITY_ENGINEER', section: 'Security Model', desc: 'STRIDE analysis, AuthZ, and Controls.', deps: ['Backend Architecture', 'Data Model'] },
                { role: 'COMPLIANCE_ENGINEER', section: 'Compliance Architecture', desc: 'GDPR/HIPAA mappings and data residency.', deps: ['Security Model', 'Data Model'] }
            ],
            // Phase 6: Infrastructure & Ops
            [
                { role: 'PLATFORM_ENGINEER', section: 'Infrastructure & DevOps', desc: 'IaC, CI/CD, and Roadmap.', deps: ['Backend Architecture', 'Security Model'] },
                { role: 'OBSERVABILITY_ENGINEER', section: 'Observability Architecture', desc: 'Logging, Metrics, Tracing, and Alerting.', deps: ['Backend Architecture', 'Infrastructure & DevOps'] },
                { role: 'SRE', section: 'SRE Operational Guide', desc: 'Runbooks, DR Plans, and Incident Response.', deps: ['Infrastructure & DevOps', 'Observability Architecture'] }
            ],
            // Phase 7: Quality & Validation
            [
                { role: 'SDET', section: 'Testing Strategy', desc: 'Test Pyramid, Gherkin, and Quality Gates.', deps: ['Requirements', 'Frontend Architecture', 'Backend Architecture'] },
                { role: 'ARCHITECTURE_COHERENCE_CHECKER', section: 'Coherence Report', desc: 'Validate consistency across all artifacts.', deps: ['Testing Strategy', 'SRE Operational Guide', 'Compliance Architecture'] } // Wait for essentially everything
            ]
        ];

        const sectionToIdMap = new Map<string, string>();
        
        // Pass 1: Generate IDs
        phases.flat().forEach(step => {
            const taskId = crypto.randomUUID();
            sectionToIdMap.set(step.section, taskId);
            
            tasks.push({
                id: taskId,
                role: step.role,
                section: step.section,
                description: step.desc,
                dependencies: [], // Filled in Pass 2
                budget: { tokens: 4000, time_ms: 60000 },
                priority: 1,
                status: 'PENDING'
            });
        });

        // Pass 2: Link Dependencies
        phases.flat().forEach(step => {
            if (step.deps) {
                const currentTaskId = sectionToIdMap.get(step.section);
                const task = tasks.find(t => t.id === currentTaskId);
                if (task) {
                    // Filter out deps that might not exist in map (safety)
                    task.dependencies = step.deps.map(d => sectionToIdMap.get(d)).filter(Boolean) as string[];
                    
                    // Special case for 'INTEGRATION_ARCHITECT' in Phase 3 which depends on 'Backend Architecture' in same phase list but technically parallel block
                    // The dependencies array handles the execution order DAG regardless of phase grouping.
                }
            }
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