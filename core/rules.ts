
import { Rule } from '../types';

export const RULEBOOK: Rule[] = [
    // Architecture Rules
    {
        id: 'R.ARCH.001',
        category: 'ARCH',
        severity: 'MAJOR',
        description: 'Missing High-Level Architecture section.',
        check: (c) => !c.includes('# High-Level Architecture'),
        suggestion: 'Add a section describing the system components and their interactions.'
    },
    {
        id: 'R.ARCH.002',
        category: 'ARCH',
        severity: 'MINOR',
        description: 'No explicit mention of Microservices or Monolith strategy.',
        check: (c) => !/microservice|monolith/i.test(c),
        suggestion: 'Explicitly state if the system is a Monolith or Microservices architecture.'
    },

    // Security Rules
    {
        id: 'R.SEC.001',
        category: 'SEC',
        severity: 'BLOCKER',
        description: 'Missing Authentication/Authorization strategy.',
        check: (c) => !/auth|oauth|jwt|openid/i.test(c),
        suggestion: 'Define how users will authenticate (OAuth, JWT, SSO).'
    },
    {
        id: 'R.SEC.002',
        category: 'SEC',
        severity: 'MAJOR',
        description: 'Data encryption at rest/transit not explicitly mentioned.',
        check: (c) => !/encryption|tls|aes|kms/i.test(c),
        suggestion: 'Specify TLS for transit and AES/KMS for data at rest.'
    },

    // Performance Rules
    {
        id: 'R.PERF.001',
        category: 'PERF',
        severity: 'MAJOR',
        description: 'Caching strategy missing.',
        check: (c) => !/redis|memcached|cdn|cache/i.test(c),
        suggestion: 'Define a caching layer (Redis, CDN) to reduce DB load.'
    },

    // Testing Rules
    {
        id: 'R.TEST.001',
        category: 'TEST',
        severity: 'MAJOR',
        description: 'No Testing Strategy section.',
        check: (c) => !c.includes('# Testing Strategy'),
        suggestion: 'Add a Testing Strategy section covering Unit, Integration, and E2E tests.'
    }
];
