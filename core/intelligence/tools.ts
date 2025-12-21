
import { ToolOutput } from '../../types';
import { analyzeDependencies } from './tools/dependencyAnalyzer';
import { simulateScalability } from './tools/scalabilitySimulator';
import { checkCompliance } from './tools/complianceChecker';
import { validateTechStack } from './tools/techStackValidator';
import { lintAPIContract } from './tools/apiContractLinter';
import { checkArchitectureCoherence } from './tools/coherenceChecker';
import { checkLicenseCompliance } from './tools/licenseChecker';

// --- Legacy Inline Tools (kept for compatibility with original prompt tools) ---

const mermaidValidator = (content: string): ToolOutput => {
    const logs: string[] = [];
    const warnings: string[] = [];
    let success = true;

    const blocks = content.match(/```mermaid([\s\S]*?)```/g);
    if (blocks) {
        logs.push(`Found ${blocks.length} Mermaid blocks.`);
        blocks.forEach((block, i) => {
            if (block.includes('graph') && !block.includes('-->') && !block.includes('---')) {
                warnings.push(`Block ${i + 1}: Graph definition might be missing connections.`);
            }
            if ((block.match(/{/g) || []).length !== (block.match(/}/g) || []).length) {
                warnings.push(`Block ${i + 1}: Unbalanced braces detected.`);
                success = false;
            }
        });
    } else {
        logs.push("No Mermaid blocks found.");
    }
    return { toolId: 'MermaidValidator', success, logs, warnings };
};

const securityScanner = (content: string): ToolOutput => {
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
            warnings.push(`Potential ${p.name} found.`);
            success = false;
        }
    });
    if (success) logs.push("No secrets detected.");
    return { toolId: 'SecurityScanner', success, logs, warnings };
};

const costEstimator = (content: string): ToolOutput => {
    const logs: string[] = [];
    const warnings: string[] = [];
    let estimatedCost = 0;
    const keywords = [
        { term: 'EC2', cost: 40 }, { term: 'RDS', cost: 60 }, { term: 'Load Balancer', cost: 20 },
        { term: 'Kubernetes', cost: 100 }, { term: 'Redis', cost: 30 }, { term: 'Lambda', cost: 5 }
    ];

    keywords.forEach(k => {
        const matches = content.match(new RegExp(k.term, 'gi'));
        if (matches) {
            const count = matches.length;
            estimatedCost += count * k.cost;
            logs.push(`Found ${count} x ${k.term} (~$${k.cost}/mo)`);
        }
    });

    if (estimatedCost > 500) warnings.push(`Est. cost > $500 ($${estimatedCost}).`);
    return { toolId: 'CostEstimator', success: true, data: { estimatedCost }, logs, warnings };
};

const contractVerifier = (frontendContent: string, backendContent: string): ToolOutput => {
    const logs: string[] = [];
    const warnings: string[] = [];
    let success = true;

    if (!frontendContent || !backendContent) {
        return { toolId: 'ContractVerifier', success: false, logs: ['Missing content'], warnings: [] };
    }
    
    const endpoints = backendContent.match(/(GET|POST|PUT|DELETE) \/[\w\-/]+/g);
    if (endpoints) {
        endpoints.forEach(ep => {
            const path = ep.split(' ')[1];
            if (!frontendContent.includes(path)) {
                logs.push(`API ${ep} not explicitly found in Frontend text.`);
            }
        });
    }
    return { toolId: 'ContractVerifier', success, logs, warnings };
};

export const TOOLS = {
    // Legacy Inline
    mermaidValidator,
    securityScanner,
    costEstimator,
    contractVerifier,

    // New Modular Tools
    dependencyAnalyzer: analyzeDependencies,
    scalabilitySimulator: simulateScalability,
    complianceChecker: checkCompliance,
    techStackValidator: validateTechStack,
    apiContractLinter: lintAPIContract,
    architectureCoherenceChecker: checkArchitectureCoherence,
    licenseChecker: checkLicenseCompliance
};
