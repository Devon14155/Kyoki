
import { ToolOutput } from '../../../types';

export function validateTechStack(artifacts: Record<string, string>): ToolOutput {
    const allContent = Object.values(artifacts).join('\n');
    
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check for deprecated technologies
    const deprecatedTech = {
        'AngularJS': 'AngularJS (1.x) is deprecated. Migrate to Angular (2+) or React/Vue.',
        'Python 2': 'Python 2 reached end-of-life in 2020. Use Python 3.9+.',
        'Node.js 12': 'Node.js 12 is EOL. Use Node.js 18 LTS or 20 LTS.',
        'jQuery': 'jQuery is outdated for modern SPAs. Use React/Vue/Svelte instead.'
    };
    
    for (const [tech, warning] of Object.entries(deprecatedTech)) {
        if (allContent.includes(tech)) {
            warnings.push(`⚠️ ${warning}`);
        }
    }
    
    // Check for incompatible combinations
    if (allContent.includes('MongoDB') && allContent.includes('complex joins')) {
        warnings.push('⚠️ MongoDB is not ideal for complex relational joins. Consider PostgreSQL.');
        recommendations.push('If relational data is core, use PostgreSQL instead of MongoDB');
    }
    
    if (allContent.includes('REST') && allContent.includes('real-time') && !allContent.includes('WebSocket')) {
        warnings.push('⚠️ REST is not optimal for real-time features. Consider WebSockets or GraphQL subscriptions.');
        recommendations.push('Use Socket.io or GraphQL subscriptions for real-time updates');
    }
    
    // Check for missing critical technologies
    if (!allContent.includes('TypeScript') && (allContent.includes('React') || allContent.includes('Angular'))) {
        warnings.push('⚠️ TypeScript strongly recommended for large React/Angular projects');
        recommendations.push('Adopt TypeScript for better type safety and developer experience');
    }
    
    return {
        toolId: 'Tech Stack Validator',
        success: warnings.length === 0,
        logs: [],
        warnings,
        findings: warnings,
        recommendations
    };
}
