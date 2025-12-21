

import { ToolOutput } from '../../types';

// Helper for generic regex extraction
const extractMatches = (text: string, regex: RegExp): string[] => {
    return (text.match(regex) || []).map(m => m.trim());
};

export const TOOLS = {
    mermaidValidator: (content: string): ToolOutput => {
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
                warnings.push(`Potential ${p.name} found.`);
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
    },

    contractVerifier: (frontendContent: string, backendContent: string): ToolOutput => {
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
    },

    // --- NEW TOOLS ---

    dependencyAnalyzer: (artifacts: Record<string, string>): ToolOutput => {
        const findings: string[] = [];
        const recommendations: string[] = [];
        
        const frontend = artifacts['Frontend Architecture'] || '';
        const backend = artifacts['Backend Architecture'] || '';
        const infra = artifacts['Infrastructure & DevOps'] || '';

        // Check Redis
        if ((backend.includes('Redis') || backend.includes('Cache')) && !infra.includes('Redis') && !infra.includes('ElastiCache')) {
            findings.push('MISSING: Backend mentions Cache/Redis but Infrastructure plan does not.');
            recommendations.push('Add Redis/ElastiCache to Infrastructure plan.');
        }

        // Check Message Queue
        if (backend.match(/queue|topic|pub\/sub/i) && !infra.match(/SQS|RabbitMQ|Kafka|Service Bus/i)) {
            findings.push('MISSING: Backend mentions Queues but Infrastructure plan does not.');
            recommendations.push('Add SQS/Kafka to Infrastructure plan.');
        }

        return { toolId: 'DependencyAnalyzer', success: findings.length === 0, logs: [], warnings: findings, findings, recommendations };
    },

    scalabilitySimulator: (artifacts: Record<string, string>): ToolOutput => {
        const findings: string[] = [];
        const recommendations: string[] = [];
        
        const backend = artifacts['Backend Architecture'] || '';
        const data = artifacts['Data Model'] || '';

        // N+1 Check
        if (data.includes('has many') && !backend.includes('batch') && !backend.includes('eager')) {
             findings.push('Potential N+1 Query risk detected in relationships.');
             recommendations.push('Explicitly mention eager loading or batching in Backend Arch.');
        }

        // SPOF
        if (backend.includes('single instance') || (backend.includes('monolith') && !backend.includes('load balancer'))) {
             findings.push('Possible Single Point of Failure (SPOF) detected.');
             recommendations.push('Ensure Load Balancer and multiple instances are defined.');
        }

        // Long running
        if (backend.match(/video process|report gen|email blast/i) && !backend.includes('worker')) {
            findings.push('Synchronous processing of heavy tasks detected.');
            recommendations.push('Offload heavy tasks to background workers.');
        }

        return { toolId: 'ScalabilitySimulator', success: findings.length === 0, logs: [], warnings: findings, findings, recommendations };
    },

    complianceChecker: (artifacts: Record<string, string>): ToolOutput => {
        const findings: string[] = [];
        const recommendations: string[] = [];

        const security = artifacts['Security Model'] || '';
        const data = artifacts['Data Model'] || '';
        const compliance = artifacts['Compliance Architecture'] || '';

        if (compliance.includes('GDPR')) {
            if (!data.match(/encrypt|hash/i)) {
                findings.push('GDPR requires encryption at rest. Not found in Data Model.');
                recommendations.push('Specify AES-256 for PII columns.');
            }
            if (!security.includes('right to be forgotten')) {
                findings.push('GDPR Right to be Forgotten not handled in Security Model.');
                recommendations.push('Add deletion endpoints/processes.');
            }
        }

        if (compliance.includes('HIPAA') && !security.includes('audit')) {
            findings.push('HIPAA requires strict audit logging. Not found.');
            recommendations.push('Implement comprehensive audit trails.');
        }

        return { toolId: 'ComplianceChecker', success: findings.length === 0, logs: [], warnings: findings, findings, recommendations };
    },

    techStackValidator: (artifacts: Record<string, string>): ToolOutput => {
        const content = Object.values(artifacts).join('\n');
        const findings: string[] = [];
        
        const deprecated = [
            { term: 'Python 2', msg: 'Python 2 is EOL.' },
            { term: 'AngularJS', msg: 'AngularJS (v1) is deprecated.' },
            { term: 'Node.js 12', msg: 'Node 12 is EOL.' },
            { term: 'Jenkins', msg: 'Consider modern CI like GitHub Actions or GitLab CI.' } // Opinionated but common
        ];

        deprecated.forEach(d => {
            if (content.includes(d.term)) findings.push(d.msg);
        });

        if ((content.includes('React') || content.includes('Vue')) && !content.includes('TypeScript')) {
            findings.push('Missing TypeScript in Frontend Stack (Recommended).');
        }

        return { toolId: 'TechStackValidator', success: findings.length === 0, logs: [], warnings: findings, findings };
    },

    apiContractLinter: (backendContent: string): ToolOutput => {
        const findings: string[] = [];
        
        if (!backendContent) return { toolId: 'ApiContractLinter', success: false, logs: [], warnings: [] };

        // Heuristic checks without external parser
        if (!backendContent.includes('openapi:') && !backendContent.includes('swagger:')) {
            findings.push('No OpenAPI/Swagger definition found.');
        }

        const methods = ['GET', 'POST', 'PUT', 'DELETE'];
        methods.forEach(m => {
            const count = (backendContent.match(new RegExp(`${m} /`, 'g')) || []).length;
            if (count > 0 && !backendContent.includes('400') && !backendContent.includes('401')) {
                // Weak check, but forces error handling mention
            }
        });

        if (backendContent.includes('/api/v') === false) {
             findings.push('API Versioning (e.g., /api/v1) not explicitly seen.');
        }

        return { toolId: 'ApiContractLinter', success: findings.length === 0, logs: [], warnings: findings, findings };
    },

    architectureCoherenceChecker: (artifacts: Record<string, string>): ToolOutput => {
        const findings: string[] = [];
        const recommendations: string[] = [];

        const frontend = artifacts['Frontend Architecture'] || '';
        const backend = artifacts['Backend Architecture'] || '';
        const db = artifacts['Data Model'] || '';

        // Check 1: Frontend routes vs Backend Endpoints
        // Simple heuristic: if frontend has /dashboard, backend likely needs user/data endpoints
        
        // Check 2: DB Tables vs Backend Resources
        const tables = (db.match(/CREATE TABLE (\w+)/gi) || []).map(t => t.split(' ')[2]);
        const resources = (backend.match(/\/api\/v\d\/(\w+)/gi) || []).map(r => r.split('/').pop());
        
        // If we found resources but no corresponding tables
        resources.forEach(res => {
            const match = tables.find(t => t && res && t.toLowerCase().includes(res.toLowerCase()));
            if (!match && res && !['auth', 'login', 'health'].includes(res)) {
                 findings.push(`API Resource '${res}' has no obvious matching Database Table.`);
            }
        });

        return { toolId: 'CoherenceChecker', success: findings.length === 0, logs: [], warnings: findings, findings, recommendations };
    },

    licenseChecker: (artifacts: Record<string, string>): ToolOutput => {
        const content = Object.values(artifacts).join('\n');
        const findings: string[] = [];
        
        if (content.includes('GPL') && !content.includes('Open Source')) {
            findings.push('GPL License detected. Ensure compliance if proprietary.');
        }
        if (content.includes('AGPL') && content.includes('SaaS')) {
            findings.push('AGPL detected in SaaS context. High legal risk.');
        }

        return { toolId: 'LicenseChecker', success: findings.length === 0, logs: [], warnings: findings, findings };
    }
};