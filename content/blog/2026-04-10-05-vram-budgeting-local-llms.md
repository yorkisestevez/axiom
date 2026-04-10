---
date: 2026-04-10
title: "VRAM Budgeting for Local LLMs: The Missing Piece in Every AI Agent Framework"
description: "Every AI agent framework ignores your GPU. Here's how to build hardware-aware scheduling for local Ollama models on a 12GB RTX."
tags: [ai, ollama, opensource, llm]
canonical_url: https://github.com/yorkisestevez/axiom/blob/master/content/devto/05-vram-budgeting-local-llms.md
---

# VRAM Budgeting for Local LLMs: The Missing Piece in Every AI Agent Framework

Name one AI agent framework that knows how much VRAM your GPU has. I'll wait.

LangChain doesn't. CrewAI doesn't. AutoGPT doesn't. Every framework assumes you have infinite compute and gracefully crashes when you don't.

If you run local models on a 12GB RTX like I do, you need hardware-aware scheduling. Here's how I built it in Axiom.

## The Problem

I have an RTX 5070 with 12GB VRAM. I run 22 Ollama models. Some are 8GB loaded, some are 4GB. At any given time, I can fit maybe 2-3 models simultaneously before I start spilling into system RAM (5-20x slower) or OOM-crashing.

Without coordination, things like this happen:

- Claude Code spawns an agent that loads `qwen2.5-coder:32b` (18GB — already over budget)
- My Telegram bot tries to answer a question with `deepseek-r1:14b` (9GB — can't load)
- The overnight research task tries to load `llama3.1:70b` (40GB — never had a chance)
- Ollama OOMs, crashes, and I lose the state of all three running tasks

Fix: a process registry that knows your VRAM budget and refuses to load models that won't fit.

## The Data You Need

Before you can budget anything, you need to know:

1. **How much VRAM your GPU has** (static — ask once at setup)
2. **How much VRAM each model uses when loaded** (estimated per-model, with a table)
3. **What's currently loaded in Ollama** (query `/api/ps` endpoint)
4. **Which processes declared they'd load which models** (track ahead of actually loading)

The first three are straightforward. The fourth is where most frameworks fall apart.

## The Architecture

I call it the **Process Registry**. It's a single JSON file plus a Node.js module that coordinates access:

```
process-board.json
├── processes[]
│   ├── id: "scalper-1-12345"
│   ├── pid: 12345
│   ├── models: ["qwen2.5-coder:7b"]
│   ├── vramMB: 4800
│   ├── mode: "persistent"
│   └── lastHeartbeat: "2026-04-10T03:00:00Z"
├── locks[]
│   └── (file locks held by processes)
└── vram
    ├── totalMB: 12288
    ├── estimatedUsedMB: 7958
    └── models: { "qwen2.5-coder:7b": 4800, "gemma4:e4b": 3158 }
```

Every process that wants to load a model calls `canStart({ name, models })` first:

```javascript
const registry = require('./process-registry');

const result = registry.canStart({
  name: 'overnight-learner',
  models: ['deepseek-r1:14b'],
  mode: 'strict'
});

if (!result.ok) {
  console.error(`Cannot start: ${result.reason}`);
  process.exit(1);
}

// OK to proceed
const { id } = registry.checkIn({ name: 'overnight-learner', ... });
```

The registry checks:

1. Is the VRAM budget exceeded? (total loaded + this new model ≤ 12GB?)
2. Are any required locks held by other processes?
3. Are any processes declared dead but haven't checked out?

If the answer is "safe to load," it lets you proceed. Otherwise it returns a structured refusal.

## The Locking Problem

You can't just use `fs.writeFileSync` to update the process board — two processes hitting it at the same time will corrupt it.

I use a **mkdir-based mutex** because `mkdir()` is atomic across POSIX and Windows:

```javascript
function withBoardLock(fn) {
  const start = Date.now();
  while (true) {
    try {
      fs.mkdirSync(BOARD_LOCK_DIR);
      break;
    } catch (e) {
      if (e.code === 'EEXIST') {
        // Lock held — check if it's stale
        const age = Date.now() - fs.statSync(BOARD_LOCK_DIR).mtimeMs;
        if (age > BOARD_LOCK_STALE_MS) {
          fs.rmdirSync(BOARD_LOCK_DIR);
          continue;
        }
        if (Date.now() - start > BOARD_LOCK_TIMEOUT_MS) {
          throw new Error('Board lock timeout');
        }
        sleep(5);  // busy-wait briefly
        continue;
      }
      throw e;
    }
  }
  try {
    return fn();  // critical section
  } finally {
    fs.rmdirSync(BOARD_LOCK_DIR);
  }
}
```

`mkdir` succeeds only if the directory doesn't exist. That's the lock acquisition. `rmdir` releases it. If a process crashes while holding the lock, the staleness check auto-recovers after 10 seconds.

Simple, portable, no native deps.

## The Live VRAM Query

Estimates get stale. The ground truth is what Ollama is actually running:

```javascript
function queryOllamaVram() {
  const raw = execSync('curl -s http://127.0.0.1:11434/api/ps', {
    encoding: 'utf8',
    timeout: 3000,
    windowsHide: true
  });
  const data = JSON.parse(raw);
  const models = {};
  let totalUsedMB = 0;
  for (const m of data.models) {
    const vramMB = Math.round((m.size_vram || 0) / (1024 * 1024));
    models[m.name] = vramMB;
    totalUsedMB += vramMB;
  }
  return { models, totalUsedMB };
}
```

Cache the result for 15 seconds to avoid hammering Ollama, but always re-query before any decision that matters. This is the difference between "my estimate says we're at 7GB" and "Ollama actually has 9GB loaded right now."

## The Heartbeat System

Processes crash. If a process checks in to the registry and then dies without checking out, the registry will think its VRAM is still claimed forever.

Solution: every checked-in process must heartbeat every 30 seconds. If its last heartbeat is older than 2x the TTL, the registry considers it dead and reclaims its resources:

```javascript
function cleanStale(board) {
  const now = Date.now();
  for (const [id, proc] of Object.entries(board.processes)) {
    const heartbeatAge = now - new Date(proc.lastHeartbeat).getTime();
    const staleMs = (proc.ttlSeconds || 120) * 2 * 1000;
    const pidDead = proc.pid && !isPidAlive(proc.pid);

    if (pidDead || heartbeatAge > staleMs) {
      delete board.processes[id];
    }
  }
}
```

Belt and suspenders: we check both the heartbeat AND whether the PID is actually alive. Either signal means the process is dead.

## The Wiki Export

For visibility, the registry exports its current state to a human-readable markdown file in the wiki:

```markdown
# Process Board

## Active Processes

| Process | PID | Uptime | Models | VRAM | Mode |
|---------|-----|--------|--------|------|------|
| claude-code-session | 8472 | 45m | qwen2.5-coder:7b | 4.6 GB | batch |
| overnight-learner | 9133 | 2h 12m | deepseek-r1:8b | 5.5 GB | persistent |

## VRAM Budget

**Total:** 12 GB | **Used:** ~10.1 GB | **Available:** ~1.9 GB
```

When I open Obsidian, I can see exactly what's running without touching the terminal. This has saved me from `ollama ps` a thousand times.

## The Results

Since building this, I haven't had a single VRAM OOM crash in 3 months. Before, I was getting one every few days.

The framework is 524 lines of pure Node.js, zero external dependencies. It's part of the [Axiom open-source framework](https://github.com/yorkisestevez/axiom).

If you run local LLMs and don't have hardware-aware scheduling, you're playing Russian roulette with your GPU. Build this or steal it from Axiom — but build it.

## Try It

Clone Axiom, run the setup wizard, and your local Ollama fleet becomes a managed system instead of a free-for-all:

```bash
git clone https://github.com/yorkisestevez/axiom.git ~/.axiom
cd ~/.axiom
node setup.js
```

Or scan your current repo for 2026 best-practice gaps right now, no install:

```bash
npx axiom-check
```

---

*Yorkis Estevez — SaaS builder, Axiom maintainer. Running 22 Ollama models on an RTX 5070. Toronto.*
