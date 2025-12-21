
import { ToolOutput } from '../../../types';

export function checkCompliance(artifacts: Record<string, string>): ToolOutput {
    const securityModel = artifacts['Security Model'] || '';
    const dataSchema = artifacts['Data Model'] || '';
    const complianceMatrix = artifacts['Compliance Architecture'] || '';
  
    const violations: string[] = [];
    const recommendations: string[] = [];
  
    // GDPR checks
    if (complianceMatrix.includes('GDPR')) {
        if (!dataSchema.match(/encrypt|hash/i) && !securityModel.match(/encrypt|hash/i)) {
            violations.push('❌ GDPR VIOLATION: PII data must be encrypted at rest');
            recommendations.push('Enable encryption at rest for all databases storing PII');
        }
        if (!securityModel.includes('audit log')) {
            violations.push('❌ GDPR VIOLATION: Must log access to personal data');
            recommendations.push('Implement audit logging for all PII access');
        }
        if (!complianceMatrix.includes('right to be forgotten') && !securityModel.includes('deletion')) {
            violations.push('⚠️ GDPR GAP: No data deletion mechanism specified');
            recommendations.push('Add API endpoints for user data deletion (GDPR Article 17)');
        }
    }
  
    // HIPAA checks
    if (complianceMatrix.includes('HIPAA')) {
        if (!securityModel.includes('MFA') && !securityModel.includes('multi-factor')) {
            violations.push('❌ HIPAA VIOLATION: Multi-factor authentication required for PHI access');
            recommendations.push('Enforce MFA for all users accessing protected health information');
        }
        if (!dataSchema.includes('encrypted') && !securityModel.includes('encrypted')) {
            violations.push('❌ HIPAA VIOLATION: PHI must be encrypted in transit and at rest');
            recommendations.push('Enable TLS 1.3 for transit and AES-256 for data at rest');
        }
    }
  
    // PCI-DSS checks (if payment data)
    if (dataSchema.match(/credit.?card|payment/i) && !dataSchema.includes('token')) {
        violations.push('⚠️ PCI-DSS: Do NOT store full credit card numbers. Use a payment gateway.');
        recommendations.push('Integrate with Stripe/PayPal/Square instead of storing card data. Store tokens only.');
    }
  
    return {
        toolId: 'Compliance Checker',
        success: violations.filter(v => v.startsWith('❌')).length === 0,
        logs: [],
        warnings: violations,
        findings: violations,
        recommendations
    };
}
