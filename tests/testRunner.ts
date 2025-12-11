
export type TestStatus = 'pending' | 'running' | 'pass' | 'fail';

export interface TestResult {
    suite: string;
    name: string;
    status: TestStatus;
    error?: string;
    duration: number;
}

interface TestDefinition {
    name: string;
    fn: () => Promise<void> | void;
}

interface SuiteDefinition {
    name: string;
    tests: TestDefinition[];
}

class TestRunner {
    private suites: SuiteDefinition[] = [];
    private currentSuite: SuiteDefinition | null = null;

    // API resembling Jest
    describe(name: string, fn: () => void) {
        this.currentSuite = { name, tests: [] };
        this.suites.push(this.currentSuite);
        fn();
        this.currentSuite = null;
    }

    it(name: string, fn: () => Promise<void> | void) {
        if (!this.currentSuite) {
            throw new Error("Tests must be defined within a describe block");
        }
        this.currentSuite.tests.push({ name, fn });
    }

    expect(actual: any) {
        return {
            toBe: (expected: any) => {
                if (actual !== expected) throw new Error(`Expected ${expected} but got ${actual}`);
            },
            toEqual: (expected: any) => {
                const sActual = JSON.stringify(actual);
                const sExpected = JSON.stringify(expected);
                if (sActual !== sExpected) throw new Error(`Expected ${sExpected} but got ${sActual}`);
            },
            toBeTruthy: () => {
                if (!actual) throw new Error(`Expected truthy but got ${actual}`);
            },
            toBeGreaterThan: (expected: number) => {
                if (actual <= expected) throw new Error(`Expected > ${expected} but got ${actual}`);
            },
            toContain: (expected: any) => {
                if (Array.isArray(actual)) {
                    if (!actual.includes(expected)) throw new Error(`Array did not contain ${expected}`);
                } else if (typeof actual === 'string') {
                    if (!actual.includes(expected)) throw new Error(`String did not contain "${expected}"`);
                }
            }
        };
    }

    async runAll(): Promise<TestResult[]> {
        const results: TestResult[] = [];
        
        for (const suite of this.suites) {
            for (const test of suite.tests) {
                const start = performance.now();
                try {
                    await test.fn();
                    results.push({
                        suite: suite.name,
                        name: test.name,
                        status: 'pass',
                        duration: performance.now() - start
                    });
                } catch (e: any) {
                    results.push({
                        suite: suite.name,
                        name: test.name,
                        status: 'fail',
                        error: e.message,
                        duration: performance.now() - start
                    });
                }
            }
        }
        return results;
    }
}

export const runner = new TestRunner();
export const { describe, it, expect } = runner;
