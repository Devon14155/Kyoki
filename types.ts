
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
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    output?: string;
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
}

export interface EventEnvelope {
    traceId: string;
    jobId: string;
    timestamp: string;
    phase: 'PLAN' | 'DISPATCH' | 'CONSENSUS' | 'TOOL_EXECUTION' | 'GROUNDING' | 'VERIFY' | 'FINALIZE';
    eventType: 'TASK_STARTED' | 'MODEL_RESPONSE' | 'CONSENSUS_READY' | 'TOOL_RESULT' | 'GROUNDING_ISSUE' | 'VERIFICATION_REPORT' | 'SUPERVISOR_ALERT' | 'METRICS_UPDATE' | 'LOG';
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
}

export const BLUEPRINT_SECTIONS = [
  "Executive Summary",
  "Requirements Breakdown",
  "Tech Stack Rationale",
  "High-Level Architecture",
  "Detailed Backend Architecture",
  "Detailed Frontend Architecture",
  "Data Models / DB Schema",
  "API Specification",
  "State Management",
  "Data Flow Diagrams",
  "DevOps + CI/CD",
  "Testing Strategy",
  "Security Model",
  "Performance & Caching",
  "Scalability & Fault Tolerance",
  "Observability & Monitoring",
  "Risks & Constraints",
  "Alternative Approaches",
  "Implementation Roadmap",
  "Glossary"
];
