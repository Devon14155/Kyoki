
import { ToolOutput } from '../../../types';

export function checkLicenseCompliance(artifacts: Record<string, string>): ToolOutput {
    const content = Object.values(artifacts).join('\n');
    const issues: string[] = [];
    const recommendations: string[] = [];
  
    // Known problematic licenses
    // const copyleftLicenses = ['GPL-3.0', 'AGPL-3.0', 'GPL-2.0'];
  
    // Extract mentioned libraries/frameworks (Simple regex)
    const dependencies = (content.match(/\b[\w-]+@[\d.]+|\b(React|Vue|Django|Flask|Express|MySQL|PostgreSQL|MongoDB)\b/gi) || []);
    const uniqueDeps = [...new Set(dependencies)];
  
    for (const dep of uniqueDeps) {
        if (dep.toLowerCase().includes('mysql') && content.includes('GPL') && !content.includes('MariaDB')) {
            issues.push('⚠️ MySQL GPL license may require your code to be GPL (copyleft) if modified/distributed.');
            recommendations.push('Consider MariaDB or PostgreSQL (permissive) if this is a closed-source product.');
        }
    
        if (dep.toLowerCase().includes('mongodb') && content.includes('commercial')) {
            issues.push('⚠️ MongoDB SSPL may be incompatible with commercial SaaS offerings without a license.');
            recommendations.push('Review MongoDB SSPL terms or consider PostgreSQL with JSONB.');
        }
    }
  
    // Check for license compatibility mentions
    if (content.includes('GPL') && content.includes('MIT') && !content.includes('dual license')) {
        issues.push('⚠️ Mixing GPL and MIT licenses requires careful compliance to avoid GPL viral effects.');
    }
  
    return {
        toolId: 'License Compliance Checker',
        success: issues.filter(i => i.startsWith('❌')).length === 0,
        logs: [],
        warnings: issues,
        findings: issues,
        recommendations
    };
}
