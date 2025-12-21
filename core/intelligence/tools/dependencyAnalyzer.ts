
import { ToolOutput } from '../../../types';

export function analyzeDependencies(artifacts: Record<string, string>): ToolOutput {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Extract artifacts
    // Map section names to what the planner outputs
    const backendContent = artifacts['Backend Architecture'] || '';
    const infraContent = artifacts['Infrastructure & DevOps'] || '';
    const frontendContent = artifacts['Frontend Architecture'] || '';
    const dataContent = artifacts['Data Model'] || '';

    // Check for circular dependencies logic placeholder
    // (Simulated as we don't have a full AST parser in this environment)
    
    // Check for missing dependencies
    if (backendContent.includes('Redis') && !infraContent.includes('Redis') && !infraContent.includes('ElastiCache')) {
        issues.push('MISSING: Backend mentions Redis/Cache but Infrastructure plan does not include it.');
        recommendations.push('Add Redis or ElastiCache to Infrastructure topology.');
    }
    
    if (backendContent.match(/queue|topic|pub\/sub/i) && !infraContent.match(/SQS|RabbitMQ|Kafka|Service Bus/i)) {
        issues.push('MISSING: Backend mentions Message Queues but Infrastructure plan does not.');
        recommendations.push('Add SQS/Kafka/RabbitMQ to Infrastructure plan.');
    }

    if (frontendContent.includes('WebSockets') && !backendContent.includes('WebSocket')) {
        issues.push('MISMATCH: Frontend plans for WebSockets but Backend does not explicitly mention WebSocket support.');
        recommendations.push('Ensure Backend Architecture includes WebSocket/Socket.io handling.');
    }

    return {
        toolId: 'Dependency Analyzer',
        success: issues.length === 0,
        logs: [],
        warnings: issues,
        findings: issues,
        recommendations
    };
}
