
import type { ConversationContext } from '../types';

export const extractContext = (userMessage: string): Partial<ConversationContext> => {
  const context: Partial<ConversationContext> = {};
  
  // Extract project type
  const projectTypePatterns = [
    { pattern: /saas|dashboard|admin panel/i, type: 'SaaS Dashboard' },
    { pattern: /e-?commerce|online store|shop/i, type: 'E-Commerce Platform' },
    { pattern: /mobile app|ios|android/i, type: 'Mobile Application' },
    { pattern: /game|multiplayer/i, type: 'Game Backend' },
    { pattern: /financial|fintech|trading|stock/i, type: 'Financial Tool' },
    { pattern: /crm|customer relationship/i, type: 'CRM System' },
    { pattern: /social|network|community/i, type: 'Social Platform' }
  ];
  
  for (const { pattern, type } of projectTypePatterns) {
    if (pattern.test(userMessage)) {
      context.projectType = type;
      break;
    }
  }
  
  // Extract tech stack preferences
  const techStack: string[] = [];
  const techPatterns = [
    { pattern: /\breact\b/i, tech: 'React' },
    { pattern: /\bvue\b/i, tech: 'Vue' },
    { pattern: /\bangular\b/i, tech: 'Angular' },
    { pattern: /\bnext\.?js\b/i, tech: 'Next.js' },
    { pattern: /\bnode\.?js\b/i, tech: 'Node.js' },
    { pattern: /\bpython\b/i, tech: 'Python' },
    { pattern: /\bdjango\b/i, tech: 'Django' },
    { pattern: /\bflask\b/i, tech: 'Flask' },
    { pattern: /\bpostgres/i, tech: 'PostgreSQL' },
    { pattern: /\bmongo/i, tech: 'MongoDB' },
    { pattern: /\bredis\b/i, tech: 'Redis' },
    { pattern: /\bgraphql\b/i, tech: 'GraphQL' },
    { pattern: /\brest\b/i, tech: 'REST API' },
    { pattern: /\baws\b|amazon web services/i, tech: 'AWS' },
    { pattern: /\bgcp\b|google cloud/i, tech: 'GCP' },
    { pattern: /\bazure\b/i, tech: 'Azure' },
    { pattern: /serverless/i, tech: 'Serverless' },
    { pattern: /kubernetes|k8s/i, tech: 'Kubernetes' },
    { pattern: /docker/i, tech: 'Docker' }
  ];
  
  for (const { pattern, tech } of techPatterns) {
    if (pattern.test(userMessage)) {
      techStack.push(tech);
    }
  }
  
  if (techStack.length > 0) {
    context.techStack = techStack;
  }
  
  // Extract requirements (simple extraction)
  const requirements: string[] = [];
  const requirementPatterns = [
    /I (want|need) (.+?)(?:\.|$)/gi,
    /should (have|include|support) (.+?)(?:\.|$)/gi,
    /with (.+?)(?:\.|$)/gi
  ];
  
  for (const pattern of requirementPatterns) {
    const matches = userMessage.matchAll(pattern);
    for (const match of matches) {
      const requirement = match[2]?.trim();
      if (requirement && requirement.length > 5 && requirement.length < 100) {
        requirements.push(requirement);
      }
    }
  }
  
  if (requirements.length > 0) {
    context.requirements = requirements;
  }
  
  return context;
};
