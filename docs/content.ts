export const DOCS_README = `# Kyoki - Blueprint Engine

Kyoki is a **production-grade, local-first PWA** designed to generate FAANG-level software engineering blueprints. It utilizes a sophisticated **Multi-Agent Intelligence Layer** to decompose abstract requirements into rigorous technical artifacts (PRDs, OpenAPI specs, Terraform code, etc.).

## 🌟 Key Features

- **Virtual Engineering Team**: Orchestrates 8 specialized agents (Product, UX, Frontend, Backend, Data, Security, DevOps, SDET).
- **Local-First & Private**: All data stored in IndexedDB (AES-GCM encrypted). No cloud backend (BYOK LLM).
- **Deterministic**: SHA-256 prompt hashing guarantees bit-identical reproducibility.
- **Self-Healing**: Automated "Linter Loop" corrects architecture flaws before you see them.
- **Artifact Driven**: Generates valid Mermaid diagrams, OpenAPI specs, and JSON schemas.

## 🛠 Tech Stack

- **Frontend**: React 18, Tailwind CSS, Lucide Icons.
- **Storage**: IndexedDB (Async wrapper), LocalStorage (Settings).
- **Security**: Web Crypto API (AES-GCM-256 + PBKDF2).
- **AI Integration**: Google GenAI SDK + Fetch adapters for OpenAI/Anthropic.
- **Intelligence**: Custom HTD Planner, EventBus, and Deterministic Controller.

## 🚀 Getting Started

1.  **Install**: Add to Home Screen (PWA) or run locally.
2.  **Configure**: Go to **Settings** -> **Model Configuration**.
3.  **BYOK**: Enter your API Key (Gemini 2.5 Recommended for speed).
4.  **Create**: Go to **Dashboard** -> **New Blueprint**.

## 🧪 Testing

Go to **Settings** -> **Developer Menu** to run the in-browser test suite.`;

export const DOCS_ARCH = `# System Architecture

Kyoki follows a **Local-First, Intelligence-Driven** architecture.

## 1. High-Level Topology

\`\`\`mermaid
graph TD
    UI[React Frontend] <--> EventBus
    EventBus <--> Supervisor[Global Intelligence Supervisor]
    Supervisor --> Planner[HTD Planner]
    Supervisor --> Dispatcher[Model Dispatcher]
    Supervisor --> Tools[Deterministic Tool Suite]
    
    Dispatcher --> LLM[External AI Provider]
    
    Supervisor --> DB[(IndexedDB)]
    DB --> VectorStore[Unified Knowledge Index]
    DB --> DetCache[Deterministic Cache]
\`\`\`

## 2. Intelligence Layer v3.0

The core of Kyoki is the **8-Agent Engineering Pipeline**:

1.  **Product Architect**: User Intent -> PRD.json
2.  **UX Architect**: PRD -> DesignSystem.md
3.  **Frontend Engineer**: Design -> FrontendArch.md
4.  **Backend Architect**: FrontendArch -> OpenAPI.yaml
5.  **Data Modeler**: OpenAPI -> Schema.sql
6.  **Security Engineer**: Architecture -> ThreatModel.md
7.  **Platform Engineer**: Architecture -> Infra.tf
8.  **SDET**: Artifacts -> TestPlan.md

## 3. Data Flow & Security

1.  **Input**: User types prompt.
2.  **Seeding**: \`deterministic.ts\` generates a SHA-256 seed from the Project ID.
3.  **Planning**: \`planner.ts\` creates a DAG of tasks.
4.  **Execution**: \`dispatcher.ts\` calls LLM.
    *   *Check*: Is the prompt hash in \`det_cache\`? If yes, return cached.
    *   *Call*: If no, call API (redacting PII).
5.  **Validation**: \`tools.ts\` runs scanners (Security, Mermaid) on output.
6.  **Persistence**: Result stored in \`IndexedDB (blueprints store)\`.

## 4. Storage Schema

- **projects**: Metadata & Settings.
- **blueprints**: Versioned content & artifacts.
- **jobs**: Intelligence Layer execution logs.
- **det_cache**: { hash_key: encrypted_response }.
- **uki_chunks**: Vector embeddings for RAG.`;

export const DOCS_RUNBOOK = `# Developer Runbook

## 🚑 Emergency Recovery

**Issue: Application stuck / White screen**
1. Clear Browser Data (Application -> Storage -> Clear Site Data).
2. **Warning**: This deletes all local blueprints. Use Export regularly.

**Issue: API Keys lost**
1. Keys are device-bound in \`IndexedDB\`. If you clear cache, you must re-enter keys.

**Issue: "Decryption Failed" on Export**
1. Ensure you are using the correct passphrase.
2. Exports use \`PBKDF2\` (100k iterations) + \`AES-GCM\`.

## 🐛 Debugging

**Enable Developer Mode:**
1. Go to Settings.
2. Toggle "Developer Mode".
3. Click "Open DevTools".

**Event Tracing:**
1. Open DevTools.
2. Look at the "Live Events" log.
3. Trace ID correlates all events for a single generation job.

## 📦 Backup & Restore

**Backup (Export)**
1. Settings -> Data Management -> Export.
2. Enter Passphrase.
3. Result: JSON file containing all Projects + Blueprints + Context (Encrypted).

**Restore (Import)**
1. Settings -> Data Management -> Import.
2. Select file.
3. Enter Passphrase.
4. App will reload with restored data.`;