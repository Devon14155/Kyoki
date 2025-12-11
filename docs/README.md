
# Kyoki - Blueprint Engine

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

Go to **Settings** -> **Developer Menu** to run the in-browser test suite.
