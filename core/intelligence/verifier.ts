
import { VerificationReport, Blueprint } from '../../types';
import { RULEBOOK } from '../rules';

export const verifier = {
    verify(blueprint: Blueprint): VerificationReport {
        const checks = [];
        let failed = false;

        for (const rule of RULEBOOK) {
            const pass = rule.check(blueprint.content);
            checks.push({
                id: rule.id,
                description: rule.description,
                result: pass ? 'PASS' : 'FAIL',
                severity: rule.severity,
                suggestion: rule.suggestion
            });
            if (!pass && rule.severity === 'BLOCKER') failed = true;
        }

        return {
            blueprintId: blueprint.id,
            checks: checks as any,
            overall: failed ? 'FAIL' : 'PASS'
        };
    }
};
