
import { ToolOutput } from '../../../types';

export function simulateScalability(artifacts: Record<string, string>): ToolOutput {
    const backendArch = artifacts['Backend Architecture'] || '';
    const dataSchema = artifacts['Data Model'] || '';
    const perfStrategy = artifacts['Performance Architecture'] || '';
  
    const bottlenecks: string[] = [];
    const recommendations: string[] = [];
  
    // Check for N+1 query patterns
    if (dataSchema.includes('has many') && !perfStrategy.includes('eager loading') && !backendArch.includes('batch')) {
        bottlenecks.push('⚠️ Potential N+1 query problem detected in database relationships');
        recommendations.push('Implement eager loading or batch queries (DataLoader pattern) to avoid N+1 issues');
    }
  
    // Check for single points of failure
    if (backendArch.includes('single server') || (backendArch.includes('monolith') && !backendArch.includes('load balancer'))) {
        bottlenecks.push('⚠️ Single point of failure: No load balancing detected for monolith/server');
        recommendations.push('Add a load balancer and horizontal scaling strategy');
    }
  
    // Check for synchronous long-running tasks
    if (backendArch.match(/(email|pdf generation|video processing|report)/i) && !backendArch.includes('queue')) {
        bottlenecks.push('⚠️ Long-running tasks detected without async queue mechanism');
        recommendations.push('Introduce a job queue (e.g., Redis Queue, AWS SQS) for background tasks');
    }
  
    // Estimate capacity based on database design
    const estimatedCapacity = estimateMaxCapacity(dataSchema, backendArch);
  
    return {
        toolId: 'Scalability Simulator',
        success: bottlenecks.length === 0,
        logs: [`Simulated Load: ${estimatedCapacity.requests_per_second} req/s`],
        warnings: bottlenecks,
        findings: [
            `Estimated capacity: ${estimatedCapacity.requests_per_second} req/s`,
            `Estimated concurrent users: ${estimatedCapacity.concurrent_users}`,
            ...bottlenecks
        ],
        recommendations
    };
}

function estimateMaxCapacity(dataSchema: string, backendArch: string): any {
    // Heuristic-based capacity estimation
    let baseCapacity = 1000; // req/s baseline
    
    if (backendArch.includes('Redis') || backendArch.includes('Cache')) baseCapacity *= 1.5; 
    if (backendArch.includes('CDN')) baseCapacity *= 2; 
    if (dataSchema.includes('unindexed') || !dataSchema.includes('INDEX')) baseCapacity *= 0.5; 
    
    return {
        requests_per_second: Math.round(baseCapacity),
        concurrent_users: Math.round(baseCapacity * 10) 
    };
}
