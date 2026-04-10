---
title: "I Built an AI That Gets Smarter Every Day — Here's the Architecture"
description: "Every AI agent framework in 2026 runs tasks but never learns from them. Here's a 6-layer architecture that does."
tags: [ai, nextjs, claude, opensource]
canonical_url: https://github.com/yorkisestevez/axiom/blob/master/content/devto/01-self-improving-ai-architecture.md
---

# I Built an AI That Gets Smarter Every Day — Here's the Architecture

I run 15 projects. My AI kept forgetting what worked.

Every session started from scratch. Patterns I discovered on Monday were gone by Wednesday. A bug I fixed in one project would show up in another. Research I did on new frameworks disappeared into browser bookmarks.

So I built **[Axiom](https://github.com/yorkisestevez/axiom)** — an AI operating system that actually learns from what I build.

## The Problem Nobody's Solving

Every AI agent framework in 2026 does the same thing: take a task, execute it, forget it. LangChain, CrewAI, AutoGPT — they're all stateless. They don't remember what worked. They don't learn from failures. They don't research new patterns and apply them to your code.

I needed something different. I needed an AI that:

- Researches new patterns daily and tells me about them
- Remembers findings using spaced repetition (not just a text file I never read)
- Detects when my code is behind current best practices
- Notices when a pattern I use in one project is missing from another
- Captures failures and re-checks if they're still present
- Extracts successful build patterns into reusable skills automatically

## The Architecture: 6 Layers

I built Axiom as a layered system. Each layer has a clear job:

```
Layer 5: Learning       — Knowledge Accelerator, Spaced Repetition, Gap Detector
Layer 4: Intelligence   — Auto-Skill Extraction, Self-Modification, Cross-Project Sync
Layer 3: Operations     — Process Registry, VRAM Management, Port Management
Layer 2: Knowledge      — Wiki Vault, Build Journal, Staging System
Layer 1: Execution      — Works with any LLM (Claude, Ollama, Gemini, local models)
Layer 0: Hardware       — GPU VRAM Budgeting, RAM Headroom, Disk Monitoring
```

### Layer 5: The Learning Loop

The **Knowledge Accelerator** runs daily. It searches the web across 11 domains (full-stack, AI engineering, SaaS architecture, cybersecurity, etc.) and distills findings into actionable briefs.

But here's the thing — reading a brief once doesn't mean you remember it. So findings feed into a **Spaced Repetition** engine that resurfaces them at day 1, 3, 7, and 14. By day 14, the pattern is either in your long-term memory or you've decided it's not relevant.

The **Gap Detector** takes it further: it cross-references research findings against your actual codebase. "The Knowledge Accelerator found that React Compiler handles memoization automatically — you have 47 manual useMemo calls."

### Layer 4: Self-Improving Intelligence

**Auto-Skill Extraction** watches your build journal. When a pattern appears in 2+ successful builds, it automatically generates a reusable SKILL.md file. Your AI literally evolves from experience.

**Self-Modification** does the same for corrections. If you correct your AI twice about the same thing ("don't use inline styles", "don't use inline styles"), it auto-promotes that to a permanent rule — but through a staging system you review first. It never modifies its own config without your approval.

**Cross-Project Sync** detects when a pattern used in one project (like Supabase RLS tenant isolation) is missing from another project that should have it.

### Layer 3: Hardware Awareness

This is what nobody else builds. Axiom knows your GPU.

I run an RTX 5070 with 12 GB VRAM and 22 Ollama models. The **Process Registry** tracks which models are loaded, how much VRAM they're using, and whether there's room for more. It uses a mutex-based locking system so two processes can't load models simultaneously and crash each other.

Before any operation that touches local models, Axiom checks: "Do I have VRAM budget for this?"

### Layer 2: Knowledge That Persists

An Obsidian-compatible wiki with a staging system. AI models propose changes, you review and approve. Git-versioned so nothing is ever lost.

The **Build Journal** logs every session: what was built, what patterns were used, what files were touched. Over time, you build a searchable knowledge base. "How did I handle authentication in that project 3 months ago?" — one command.

## What This Looks Like in Practice

Every morning at 6 AM, the Knowledge Accelerator researches 3-4 domains. By 7 AM, my morning briefing includes:

- New findings from overnight research
- Spaced repetition reviews (patterns due for reinforcement)
- Failure watch (unresolved issues across projects)
- Skill count (39 skills, 3 auto-generated this month)
- Learning brief link (full details if I want to dive deeper)

When I sit down to build, I'm not starting from scratch. I know what's new in my stack. I know what gaps exist in my code. I know what patterns from Project A should be in Project B.

## The Numbers

- 14 core modules
- 11 research domains, 44 daily search queries
- 39+ skills (and growing automatically)
- Zero external dependencies (Node.js built-ins only)
- Works with any LLM: Claude Code, Ollama, Gemini, GPT

## Try The Free Scanner Right Now

Before diving into the full framework, try the free scanner. Zero install:

```bash
npx axiom-check
```

It scans your current repo for 12 common 2026 best-practice gaps and gives you a score out of 100.

I ran it against the top 48 Next.js projects on GitHub — **average score was 68/100**. Writeup in the repo.

## It's Open Source

**GitHub:** [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom)

If you're tired of your AI forgetting what works, give it a shot. And if you build something cool with it, open a PR.

---

*Built by Yorkis Estevez. I build SaaS products and AI systems in Toronto. Axiom is how I manage 15 projects without losing my mind.*
