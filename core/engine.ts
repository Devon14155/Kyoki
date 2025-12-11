
import { supervisor } from './intelligence/supervisor';
import { ModelType, AppSettings } from '../types';

// The Engine now acts as a simplified Gateway to the Intelligence Layer v3.0
export class Engine {
    async startJob(
        projectId: string,
        blueprintId: string,
        prompt: string,
        apiKey: string,
        modelType: ModelType,
        settings: AppSettings['safety']
    ): Promise<string> {
        return supervisor.startJob(projectId, blueprintId, prompt, apiKey, modelType, settings);
    }
}

export const engine = new Engine();
