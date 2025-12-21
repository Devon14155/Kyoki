
import { ConversationContext } from '../types';

export const extractContext = (text: string, currentContext: ConversationContext): ConversationContext => {
    const newContext = { ...currentContext };
    const lowerText = text.toLowerCase();

    // 1. Detect Project Type
    const projectTypes = [
        'saas', 'ecommerce', 'marketplace', 'social network', 'crm', 'erp', 'cms', 
        'mobile app', 'game', 'fintech', 'healthtech', 'dashboard'
    ];
    for (const type of projectTypes) {
        if (lowerText.includes(type)) {
            newContext.projectType = type.charAt(0).toUpperCase() + type.slice(1);
            break;
        }
    }

    // 2. Detect Tech Stack
    const techKeywords = [
        'react', 'vue', 'angular', 'next.js', 'node', 'python', 'django', 'fastapi', 
        'go', 'rust', 'java', 'spring', 'aws', 'azure', 'gcp', 'firebase', 'supabase',
        'postgresql', 'mysql', 'mongodb', 'redis', 'graphql', 'docker', 'kubernetes'
    ];
    
    if (!newContext.techStack) newContext.techStack = [];
    
    techKeywords.forEach(tech => {
        if (lowerText.includes(tech) && !newContext.techStack?.includes(tech)) {
            newContext.techStack!.push(tech);
        }
    });

    // 3. Detect Requirements (Simple heuristic based on "need", "want", "must")
    const sentences = text.match(/[^.!?]+[.!?]/g) || [text];
    if (!newContext.requirements) newContext.requirements = [];
    
    sentences.forEach(s => {
        if (s.match(/\b(need|must|should|want|require)\b/i)) {
            const req = s.trim();
            if (!newContext.requirements?.includes(req) && req.length > 10) {
                newContext.requirements!.push(req);
            }
        }
    });

    return newContext;
};
