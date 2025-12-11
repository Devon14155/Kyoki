
import { Blackboard } from '../types';

export class AgentRuntime {
    public blackboard: Blackboard;
    private logCallback: (msg: string, source: string) => void;

    constructor(initialRequirements?: any, logger?: (msg: string, source: string) => void) {
        this.blackboard = {
            requirements: initialRequirements,
            sections: {}
        };
        this.logCallback = logger || (() => {});
    }

    log(message: string, source: string) {
        this.logCallback(message, source);
    }

    updateSection(title: string, content: string) {
        this.blackboard.sections[title] = content;
    }

    getSection(title: string): string | undefined {
        return this.blackboard.sections[title];
    }
    
    getAllSections(): string {
        return Object.values(this.blackboard.sections).join('\n\n');
    }
}
