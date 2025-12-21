
import { ToolOutput } from '../../../types';

export function lintAPIContract(content: string): ToolOutput {
    const findings: string[] = [];
    const recommendations: string[] = [];
  
    if (!content) return { toolId: 'API Contract Linter', success: false, logs: [], warnings: [] };
  
    // Heuristic checks without external parser
    if (!content.includes('openapi:') && !content.includes('swagger:')) {
        findings.push('No OpenAPI/Swagger definition found.');
        recommendations.push('Define API using OpenAPI 3.0 Standard YAML/JSON.');
    }
  
    // Check for versioning
    if (!content.includes('/api/v')) {
        findings.push('❌ API versioning (e.g., /api/v1) not explicitly seen in endpoints.');
        recommendations.push('Add semantic versioning to API paths (v1, v2).');
    }
    
    // Check for consistent error responses
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    let methodCount = 0;
    methods.forEach(m => {
        const matches = content.match(new RegExp(`${m} /`, 'g'));
        if (matches) methodCount += matches.length;
    });

    if (methodCount > 0 && !content.includes('400') && !content.includes('500')) {
        findings.push(`⚠️ Missing error response definitions (400, 500) for ${methodCount} endpoints.`);
        recommendations.push('Document standard error envelopes and status codes.');
    }
    
    // Check for authentication
    if (!content.match(/security:|Authorization:|Bearer/)) {
        findings.push('⚠️ No authentication scheme defined in API spec.');
        recommendations.push('Add OAuth2, JWT, or API Key authentication definitions.');
    }
    
    // Check for pagination on list endpoints
    if (content.match(/GET \/[\w-]+s\b/) && !content.match(/limit|offset|page|cursor/)) {
        findings.push('⚠️ List endpoints should support pagination.');
        recommendations.push('Add limit/offset or cursor parameters to list endpoints.');
    }
  
    return {
        toolId: 'API Contract Linter',
        success: findings.filter(i => i.startsWith('❌')).length === 0,
        logs: [],
        warnings: findings,
        findings,
        recommendations
    };
}
