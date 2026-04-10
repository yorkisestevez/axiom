# Axiom

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**The Self-Improving AI Operating System**

Your AI doesn't just execute tasks. It learns from them, remembers what works, and evolves every day.

Axiom is a personal AI operating system built for developers who use Claude Code, Ollama, or any LLM. It wraps around your existing tools and adds a self-improving intelligence layer that no other framework provides.

---

## See It In Action

```
$ node setup.js

  ╔═══════════════════════════════════════╗
  ║   AXIOM — Self-Improving AI OS        ║
  ║   Setup Wizard                        ║
  ╚═══════════════════════════════════════╝

Detecting GPU... Found: NVIDIA RTX 5070 (12288 MB VRAM)
Detecting Ollama models... Found 8 model(s): qwen2.5-coder:7b, gemma4:e4b...
Config written. Directories created. Wiki templates copied.

$ node core/system-audit.js

=== AXIOM SYSTEM AUDIT ===
Ollama: RUNNING
  Models loaded: qwen2.5-coder:7b (4696MB VRAM), gemma4:e4b (3262MB VRAM)
  VRAM: 7958/12288 MB (65%)
RAM: 14.4/31.8 GB free
CPU: 3% load
Pending queue tasks: 0
Pending wiki staging: 0
All systems nominal.

$ node core/knowledge-accelerator.js

=== KNOWLEDGE ACCELERATOR ===
Year: 2026 | Domains: 11 | Queries: 44

[Full-Stack Patterns]
  → Next.js 2026 best practices server components app router
  → React 2026 performance patterns optimization techniques
[AI Engineering]
  → AI agent architecture patterns 2026 autonomous
  → MCP model context protocol server design 2026
[Cybersecurity]
  → web application security best practices 2026 OWASP
...

$ node core/gap-detector.js scan

4 gap(s) found:
  [MED] my-saas: Ollama without Flash Attention (0 hits)
    → Set FLASH_ATTENTION=1 in Ollama startup configuration
  [MED] my-saas: Missing error boundaries (0 hits)
    → Add error.tsx to each route segment in Next.js App Router

$ node core/skill-registry.js search "billing"

2 skill(s) matching "billing":
  stripe-metered-billing (manual) — Stripe Meters API + hybrid pricing for SaaS
  plg-free-tier (manual) — Product-led growth with free tier + usage gates
```

---

## Why Axiom

Every other AI framework runs tasks. Axiom **learns from them.**

| Capability | What It Does |
|-----------|-------------|
| **Knowledge Accelerator** | Daily web research across your domains, distilled into actionable briefs |
| **Spaced Repetition** | Findings resurface at optimal intervals (day 1, 3, 7, 14) so you actually retain them |
| **Auto-Skill Extraction** | Successful build patterns automatically become reusable skills |
| **Self-Modification** | Repeated corrections auto-promote to permanent rules (via staging review) |
| **Codebase Gap Detector** | Cross-references new patterns against your actual code |
| **Cross-Project Sync** | Detects patterns in one project missing from another |
| **Failure Replay** | Captures failures, tracks resolution, prevents recurrence |
| **Build Journal** | Searchable history of everything you've built, with pattern indexing |
| **Hardware-Aware Scheduling** | VRAM budgeting, process registry, port management |
| **System Snapshots** | One-command portable backup of your entire config |
| **Skill Registry** | Searchable index of all your skills with usage tracking |
| **Wiki Knowledge Base** | Git-versioned, Obsidian-compatible knowledge vault with staging system |

---

## Quick Start

```bash
git clone https://github.com/yorkisestevez/axiom.git ~/.axiom
cd ~/.axiom
node setup.js
```

The setup wizard will:
1. Detect your GPU and VRAM
2. Detect your Ollama models
3. Ask about your projects
4. Create your config and directory structure

---

## Architecture

Axiom is built as a layered system. Each layer has a clear scope:

```
Layer 5: Learning       Knowledge Accelerator, spaced repetition, gap detector
Layer 4: Intelligence   Auto-skill extraction, self-modification, cross-project sync
Layer 3: Operations     Process registry, VRAM management, port management, system audit
Layer 2: Knowledge      Wiki vault (staging system, git-versioned), build journal
Layer 1: Execution      Works with any LLM (Claude, Ollama, Gemini, GPT, local models)
Layer 0: Hardware       GPU VRAM budgeting, RAM headroom, disk monitoring
```

---

## Core Modules

### System Health
```bash
node core/system-audit.js          # Full system health check
node core/process-registry.js      # Process coordination + VRAM tracking
```

### Learning Stack
```bash
node core/knowledge-accelerator.js # See research domains
node core/spaced-repetition.js due # Show reviews due today
node core/gap-detector.js scan     # Scan code for gaps
node core/cross-project-sync.js scan # Find transferable patterns
```

### Build Intelligence
```bash
node core/build-journal.js recent  # Recent build history
node core/auto-skill-extractor.js check # Extract qualifying patterns
node core/self-modifier.js scan    # Scan for promotable corrections
node core/failure-replay.js check  # Recheck unresolved failures
```

### Operations
```bash
node core/skill-registry.js scan   # Index all skills
node core/daily-digest.js          # Generate morning brief
node core/system-snapshot.js create # Create portable backup
```

---

## Configuration

All configuration lives in `mythos.config.js` (generated by setup wizard):

```javascript
module.exports = {
  paths: {
    root: "~/.axiom",
    wiki: "~/.axiom/wiki",
    skills: "~/.axiom/skills",
    workspace: "~/.axiom/workspace",
    backups: "~/backups/axiom",
  },
  hardware: {
    vramMB: 12288,        // Your GPU VRAM
    ramHeadroomMB: 4096,  // Minimum free RAM
  },
  projects: {
    "my-app": { codePath: "/path/to/my-app" },
  },
  ollamaUrl: "http://127.0.0.1:11434",
};
```

Domain-specific configs live in `config/`:
- `domains.json` — Knowledge Accelerator research topics
- `gap-rules.json` — Codebase gap detection rules
- `sync-patterns.json` — Cross-project sync patterns
- `models.json` — Local LLM VRAM estimates
- `ports.json` — Port allocations

---

## Wiki System

Axiom includes an Obsidian-compatible wiki with a staging system:

```
wiki/
  _system/         Identity + operating state
  _staging/        All model updates land here first
    pending/       Proposed changes
    approved/      Accepted changes
    rejected/      Rejected (system learns from these)
```

**Golden Rule:** AI models never directly edit wiki files. All updates go through staging. You review and approve.

---

## How Learning Works

```
                    +------------------+
                    | Knowledge        |
                    | Accelerator      |
                    | (daily research) |
                    +--------+---------+
                             |
                    +--------v---------+
                    | Spaced           |
                    | Repetition       |
                    | (1/3/7/14 days)  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------v---+  +------v------+  +----v--------+
     | Gap        |  | Cross-      |  | Auto-Skill  |
     | Detector   |  | Project     |  | Extractor   |
     | (code vs   |  | Sync        |  | (patterns   |
     |  research) |  | (reuse)     |  |  to skills) |
     +--------+---+  +------+------+  +----+--------+
              |              |              |
              +--------------+--------------+
                             |
                    +--------v---------+
                    | Wiki Staging     |
                    | (you review)     |
                    +--------+---------+
                             |
                    +--------v---------+
                    | Wiki             |
                    | (source of truth)|
                    +------------------+
```

---

## Requirements

- Node.js 18+
- Git (for wiki versioning)
- Optional: NVIDIA GPU + Ollama (for local LLM support)
- Optional: Obsidian (for wiki browsing)
- Works with: Claude Code, Cursor, any AI coding assistant

---

## Built By

**Yorkis Estevez** — SaaS builder, AI automation architect.

Axiom was born from building 15+ projects simultaneously and needing an AI system that actually gets smarter over time, not just completes tasks.

---

## License

MIT
