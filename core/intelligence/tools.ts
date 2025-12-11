
import { ToolOutput } from '../../types';

export const TOOLS = {
    mermaidValidator: (content: string): ToolOutput => {
        const logs: string[] = [];
        const warnings: string[] = [];
        let success = true;

        // Extract Mermaid blocks
        const blocks = content.match(/```mermaid([\s\S]*?)```/g);
        if (blocks) {
            logs.push(`Found ${blocks.length} Mermaid blocks.`);
            blocks.forEach((block, i) => {
                // Heuristic checks
                if (block.includes('graph') && !block.includes('-->') && !block.includes('---')) {
                    warnings.push(`Block ${i + 1}: Graph definition might be missing connections.`);
                }
                if ((block.match(/{/g) || []).length !== (block.match(/}/g) || []).length) {
                    warnings.push(`Block ${i + 1}: Unbalanced braces detected.`);
                    success = false;
                }
            });
        } else {
            logs.push("No Mermaid blocks found to validate.");
        }

        return { toolId: 'MermaidValidator', success, logs, warnings };
    },

    securityScanner: (content: string): ToolOutput => {
        const logs: string[] = [];
        const warnings: string[] = [];
        let success = true;

        const patterns = [
            { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/ },
            { name: 'Generic Secret', regex: /"client_secret"\s*:\s*"[^"]+"/i },
            { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/ }
        ];

        patterns.forEach(p => {
            if (p.regex.test(content)) {
                warnings.push(`Potential ${p.name} found in content.`);
                success = false;
            }
        });

        if (success) logs.push("No secrets detected.");

        return { toolId: 'SecurityScanner', success, logs, warnings };
    },

    costEstimator: (content: string): ToolOutput => {
        const logs: string[] = [];
        const warnings: string[] = [];
        
        let estimatedCost = 0;
        const keywords = [
            { term: 'EC2', cost: 40 },
            { term: 'RDS', cost: 60 },
            { term: 'Load Balancer', cost: 20 },
            { term: 'Kubernetes', cost: 100 },
            { term: 'Redis', cost: 30 },
            { term: 'Lambda', cost: 5 }
        ];

        keywords.forEach(k => {
            const matches = content.match(new RegExp(k.term, 'gi'));
            if (matches) {
                const count = matches.length;
                estimatedCost += count * k.cost;
                logs.push(`Found ${count} x ${k.term} (~$${k.cost}/mo)`);
            }
        });

        if (estimatedCost > 500) {
            warnings.push(`Estimated monthly cloud cost > $500 ($${estimatedCost}). Consider optimizations.`);
        }

        return { toolId: 'CostEstimator', success: true, data: { estimatedCost }, logs, warnings };
    },

    contractVerifier: (frontendContent: string, backendContent: string): ToolOutput => {
        const logs: string[] = [];
        const warnings: string[] = [];
        let success = true;

        if (!frontendContent || !backendContent) {
            return { toolId: 'ContractVerifier', success: false, logs: ['Missing content to verify'], warnings: [] };
        }

        // Heuristic: Check if Frontend mentions endpoints that Backend defines
        const endpoints = backendContent.match(/(GET|POST|PUT|DELETE) \/[\w\-/]+/g);
        if (endpoints) {
            endpoints.forEach(ep => {
                const path = ep.split(' ')[1];
                if (!frontendContent.includes(path)) {
                    // This is just a warning, maybe frontend doesn't use all APIs
                    logs.push(`API ${ep} defined but not explicitly found in Frontend text (heuristic).`);
                }
            });
        }

        return { toolId: 'ContractVerifier', success, logs, warnings };
    }
};
