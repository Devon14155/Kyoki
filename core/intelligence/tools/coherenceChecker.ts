
import { ToolOutput } from '../../../types';

export function checkArchitectureCoherence(artifacts: Record<string, string>): ToolOutput {
    const misalignments: string[] = [];
    const recommendations: string[] = [];
  
    const frontend = artifacts['Frontend Architecture'] || '';
    const backend = artifacts['Backend Architecture'] || '';
    const dataSchema = artifacts['Data Model'] || '';
    const security = artifacts['Security Model'] || '';
    const infrastructure = artifacts['Infrastructure & DevOps'] || '';
  
    // CHECK 1: Frontend state matches Backend DTOs (Heuristic)
    const frontendStateFields = (frontend.match(/state.*?{([^}]+)}/gs) || [])
        .flatMap(block => block.match(/\w+:/g) || [])
        .map(field => field.replace(':', '').trim());
    
    const backendDTOs = (backend.match(/interface.*?{([^}]+)}/gs) || [])
        .flatMap(block => block.match(/\w+:/g) || [])
        .map(field => field.replace(':', '').trim());
    
    // CHECK 2: Backend API endpoints match Database schema resources
    const apiResources = (backend.match(/\/api\/v\d\/(\w+)/gi) || []).map(r => r.split('/').pop()?.toLowerCase());
    const dbTables = (dataSchema.match(/CREATE TABLE (\w+)|Table: (\w+)|### (\w+) Table/gi) || [])
        .map(match => match.replace(/CREATE TABLE|Table:|###|Table/gi, '').trim().toLowerCase());
    
    apiResources.forEach(res => {
        if (res && !dbTables.some(t => t && t.includes(res)) && !['auth', 'login', 'health'].includes(res)) {
            misalignments.push(`⚠️ API Resource '${res}' has no obvious matching Database Table.`);
            recommendations.push(`Ensure a table exists for '${res}' or explain why it is not needed.`);
        }
    });
  
    // CHECK 3: Infrastructure supports Backend requirements
    if (backend.includes('Redis') && !infrastructure.includes('Redis') && !infrastructure.includes('ElastiCache')) {
        misalignments.push('❌ Backend requires Redis but Infrastructure plan doesn\'t include it');
        recommendations.push('Add Redis to Infrastructure topology (ElastiCache or self-hosted)');
    }
  
    if (backend.includes('message queue') && !infrastructure.match(/SQS|RabbitMQ|Kafka/)) {
        misalignments.push('⚠️ Backend mentions message queue but no queue service in Infrastructure');
        recommendations.push('Add message queue service (AWS SQS, RabbitMQ, or Kafka)');
    }
  
    // CHECK 4: Security model covers sensitive data
    const sensitiveKeywords = ['password', 'ssn', 'credit_card', 'salary'];
    for (const keyword of sensitiveKeywords) {
        if (dataSchema.toLowerCase().includes(keyword) && !security.toLowerCase().includes(keyword)) {
            misalignments.push(`❌ SECURITY GAP: Sensitive field "${keyword}" found in Data Model but not mentioned in Security Model.`);
            recommendations.push(`Add encryption/access controls for "${keyword}" in Security model.`);
        }
    }
  
    return {
        toolId: 'Architecture Coherence Checker',
        success: misalignments.filter(m => m.startsWith('❌')).length === 0,
        logs: [],
        warnings: misalignments,
        findings: misalignments,
        recommendations
    };
}
