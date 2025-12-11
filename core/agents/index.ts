
import { ProductManagerAgent } from './product';
import { ArchitectAgent } from './architect';
import { ApiAgent } from './api';
import { SecurityAgent } from './security';
import { DevOpsAgent } from './devops';
import { SreAgent } from './sre';
import { StrategyAgent } from './strategy';
import { CriticAgent } from './critic';

export const AgentRegistry = {
    PRODUCT: ProductManagerAgent,
    ARCHITECT: ArchitectAgent,
    API: ApiAgent,
    SECURITY: SecurityAgent,
    DEVOPS: DevOpsAgent,
    SRE: SreAgent,
    STRATEGY: StrategyAgent,
    CRITIC: CriticAgent
};
