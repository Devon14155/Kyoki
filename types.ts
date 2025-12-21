

export type ModelType = 'gemini' | 'openai' | 'claude' | 'kimi' | 'glm';

export type JobStatus = 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

export interface AppSettings {
  theme: 'dark' | 'light';
  activeModel: ModelType;
  userName: string;
  safety: {
      blockHarmful: boolean;
      piiRedaction: boolean;
      customSystemPrompt?: string;
  };
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    createdAt: number;
    updatedAt: number;
    settings?: {
        providerOrder?: ModelType[];
        tokenCap?: number;
    };
}

export interface BlueprintVersion {
  id: string;
  timestamp: number;
  content: string;
  author: string;
  changeLog?: string;
}

export interface Folder {
    id: string;
    name: string;
    createdAt: number;
    updatedAt?: number;
}

export interface Blueprint {
  id: string;
  projectId: string; 
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  tags: string[];
  content: string; 
  status: 'draft' | 'generating' | 'completed' | 'archived';
  modelUsed: ModelType;
  folderId?: string;
  versions: BlueprintVersion[];
  
  // v3.0 Artifacts
  runplanId?: string;
  seed?: string;
  linter_report?: any;
  verification_report?: VerificationReport;
  critique_report?: any;
  metrics?: {
      clarity: number;
      coherence: number;
      evidence_coverage: number;
      consensus_confidence: number;
  };
}

export interface ContextItem {
  id: string;
  name: string;
  type: 'text' | 'file';
  content: string;
  size: number;
  createdAt: number;
  embeddingStatus?: 'pending' | 'embedded' | 'failed';
}

export interface VectorDocument {
    id: string; // chunk id
    contextId: string;
    text: string;
    vector: number[];
    metadata: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isThinking?: boolean;
}

export interface Rule {
    id: string;
    category: 'ARCH' | 'SEC' | 'PERF' | 'TEST';
    severity: 'BLOCKER' | 'MAJOR' | 'MINOR' | 'INFO';
    description: string;
    check: (content: string) => boolean;
    suggestion: string;
}

export interface IndustryPreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    promptTemplate: string;
}

// --- Intelligence Layer v3.0 Types ---

export interface Blackboard {
    requirements?: any;
    sections: Record<string, string>;
    critique?: any;
}

export interface Task {
    id: string;
    role: string; // Agent Role
    section: string; // Target Artifact/Section Name
    description: string;
    dependencies: string[]; // Task IDs
    budget: { tokens: number; time_ms: number };
    priority: number;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PAUSED';
    output?: string;
    error?: string;
    startTime?: number;
    endTime?: number;
}

export interface RunPlan {
    id: string;
    projectId: string;
    seed: string;
    createdAt: number;
    tasks: Task[];
}

export interface ConsensusItem {
    taskId: string;
    final: string; // The selected text
    confidence: number; // 0-1
    alternatives: { provider: string; content: string; score: number }[];
    evidence: { chunkId: string; similarity: number }[];
    provenance: {
        model: string;
        timestamp: number;
    };
}

export interface GroundingIssue {
    claimText: string;
    severity: 'MAJOR' | 'MINOR';
    evidenceNeeded: boolean;
}

export interface GroundingReport {
    taskId: string;
    ungroundedClaims: GroundingIssue[];
    status: 'PASS' | 'WARN' | 'FAIL';
}

export interface VerificationCheck {
    id: string;
    description: string;
    result: 'PASS' | 'FAIL' | 'WARN';
    severity: 'BLOCKER' | 'MAJOR' | 'MINOR';
    location?: string;
    suggestion?: string;
}

export interface VerificationReport {
    blueprintId: string;
    checks: VerificationCheck[];
    overall: 'PASS' | 'FAIL' | 'WARN';
}

export interface ToolOutput {
    toolId: string;
    success: boolean;
    data?: any;
    logs: string[];
    warnings: string[];
    findings?: string[];
    recommendations?: string[];
}

export interface EventEnvelope {
    traceId: string;
    jobId: string;
    timestamp: string;
    phase: 'PLAN' | 'DISPATCH' | 'CONSENSUS' | 'TOOL_EXECUTION' | 'GROUNDING' | 'VERIFY' | 'FINALIZE' | 'CONTROL';
    eventType: 'TASK_STARTED' | 'MODEL_RESPONSE' | 'CONSENSUS_READY' | 'TOOL_RESULT' | 'GROUNDING_ISSUE' | 'VERIFICATION_REPORT' | 'SUPERVISOR_ALERT' | 'METRICS_UPDATE' | 'LOG' | 'PIPELINE_PAUSED' | 'PIPELINE_RESUMED';
    level: 'INFO' | 'WARN' | 'ERROR';
    payload: any;
}

export interface IntelligenceJob {
    id: string;
    projectId: string;
    blueprintId: string;
    status: JobStatus;
    runPlanId?: string;
    seed?: string;
    createdAt: number;
    updatedAt: number;
    logs: EventEnvelope[]; // Transient logs for UI
    
    // For Resumability
    contextConfig?: {
        apiKey: string;
        modelType: ModelType;
        settings: AppSettings['safety'];
        prompt: string;
    }
}

// --- NEW CHAT TYPES ---

export interface Artifact {
  id: string;
  filename: string;
  content: string;
  type: 'markdown' | 'code' | 'json' | 'diagram';
  language?: string;
  generatedBy: string; // Agent Role
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'thinking';
  content: string;
  timestamp: number;
  agentName?: string;
  agentIcon?: string;
  artifacts?: Artifact[];
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    toolsUsed?: string[];
  };
}

export interface AgentConfig {
  enabledAgents: string[];
  modelSelection: string;
  tools: {
    webSearch: boolean;
    researchMode: boolean;
    thinkingMode: boolean;
  };
}

export interface ConversationContext {
    projectType?: string;
    techStack?: string[];
    requirements?: string[];
}

export interface Conversation {
  id: string;
  blueprintId: string; // Link to blueprint
  title: string;
  messages: Message[];
  artifacts: Artifact[];
  metadata: {
    createdAt: number;
    updatedAt: number;
    status: 'in-progress' | 'completed' | 'failed';
    agentConfig: AgentConfig;
    modelUsed: string;
  };
  context: ConversationContext;
}

export const BLUEPRINT_SECTIONS = [
  "Executive Summary",
  "Requirements Breakdown",
  "Product & Business Metrics",
  "Tech Stack Rationale",
  "High-Level Architecture",
  "Design System",
  "Accessibility Architecture",
  "Detailed Backend Architecture",
  "Detailed Frontend Architecture",
  "Integration Architecture",
  "Data Models / DB Schema",
  "Performance Architecture",
  "API Specification",
  "State Management",
  "Data Flow Diagrams",
  "Security Model",
  "Compliance Architecture",
  "Infrastructure & DevOps",
  "Observability Architecture",
  "SRE Operational Guide",
  "Testing Strategy",
  "Risks & Constraints",
  "Alternative Approaches",
  "Implementation Roadmap",
  "Glossary"
];