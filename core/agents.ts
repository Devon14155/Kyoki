
import { ModelType } from '../types';

export interface SubAgent {
    id: string;
    role: string;
    description: string;
    systemPrompt: string;
}

export const AGENTS: Record<string, SubAgent> = {
    PRODUCT: {
        id: 'product_pm',
        role: 'Product Manager',
        description: 'Defines requirements, scope, and user stories.',
        systemPrompt: 'You are an elite Product Manager at a FAANG company. Define clear, scoped functional and non-functional requirements.'
    },
    ARCHITECT: {
        id: 'sys_architect',
        role: 'System Architect',
        description: 'Designs high-level topology and component interactions.',
        systemPrompt: 'You are a Principal System Architect. Design scalable, resilient systems. Focus on trade-offs, bottlenecks, and component decoupling.'
    },
    SECURITY: {
        id: 'sec_engineer',
        role: 'Security Engineer',
        description: 'Analyzes threats and defines security controls.',
        systemPrompt: 'You are a Security Engineer. Apply the STRIDE model. Ensure zero-trust principles, encryption, and robust auth patterns.'
    },
    DBA: {
        id: 'db_admin',
        role: 'Database Architect',
        description: 'Designs schemas and data models.',
        systemPrompt: 'You are a Database Specialist. Design normalized schemas for SQL or optimized patterns for NoSQL. Focus on consistency and access patterns.'
    }
};

export const promptOptimizer = {
    optimizeForModel: (prompt: string, model: ModelType): string => {
        // Model-specific tweaks
        if (model === 'claude') {
            // Claude prefers XML tags for structure
            return `<instruction>${prompt}</instruction>\n<format>Markdown</format>`;
        }
        if (model === 'gemini') {
            // Gemini likes clear context separation
            return `CONTEXT:\n${prompt}\n\nTASK:\nGenerate the requested output.`;
        }
        return prompt;
    }
};
