
import { Blueprint, Rule } from '../types';
import { RULEBOOK } from './rules';

export interface LintReport {
    score: number;
    issues: {
        ruleId: string;
        severity: string;
        message: string;
        suggestion: string;
    }[];
}

export const linter = {
    run: (blueprint: Blueprint): LintReport => {
        const issues = [];
        let passed = 0;

        for (const rule of RULEBOOK) {
            if (rule.check(blueprint.content)) {
                passed++;
            } else {
                issues.push({
                    ruleId: rule.id,
                    severity: rule.severity,
                    message: rule.description,
                    suggestion: rule.suggestion
                });
            }
        }

        const score = Math.round((passed / RULEBOOK.length) * 100);
        return { score, issues };
    }
};

export const selfCritique = {
    evaluate: (blueprint: Blueprint): string => {
        const report = linter.run(blueprint);
        if (report.score > 85) return "Blueprint Quality: EXCELLENT";
        if (report.score > 70) return "Blueprint Quality: GOOD. Minor improvements needed.";
        return "Blueprint Quality: NEEDS IMPROVEMENT. Critical sections missing.";
    }
};
