# Launch Posts — Day-of Assets

Ready-to-paste content for launch day. Replace `68` stats with real numbers from `hall-of-gaps.md` after the scan completes.

---

## Hacker News — "Show HN"

**Title (max 80 chars):**
```
Show HN: Axiom – Self-improving AI OS for Claude Code, Ollama, any LLM
```

**URL:** `https://github.com/yorkisestevez/axiom`

**First comment (post immediately after submission, required for Show HN):**

```
Hey HN,

Author here. I built Axiom because every AI agent framework in 2026 does
the same thing: take a task, execute it, forget it. None of them learn.

I run 15 projects and my AI kept forgetting what worked. Patterns from
Monday were gone by Wednesday. Research I did disappeared into bookmarks.
Same bugs across different projects. No memory, no spaced repetition,
nothing.

So I built this. Six layers:
- Hardware-aware scheduling (VRAM budgeting for local Ollama models)
- Wiki knowledge base with staging system (AI never overwrites your knowledge)
- Process/port registry (no more collisions between background agents)
- Self-modification (corrections auto-promote to rules via review)
- Auto-skill extraction (successful build patterns become reusable skills)
- Knowledge accelerator (daily web research + spaced repetition briefs)

You can try the free scanner right now without installing anything:

  npx axiom-check

It scans your repo for 12 common 2026 best-practice gaps and gives you
a score out of 100.

I also ran it against the top 48 Next.js projects on GitHub (vercel/next.js
and 1 other failed to clone). Average score: 68/100. The kicker: 92% still
use manual useMemo/useCallback even though React Compiler obsoleted it,
and 38% of multi-tenant apps have no Row Level Security. Full writeup in
the repo at content/hall-of-gaps.md.

The whole thing is MIT, zero external dependencies. Works with Claude
Code, Ollama, Cursor, or any LLM you already use.

Happy to answer questions about the architecture or the learning stack.

— Yorkis
```

---

## Twitter / X Thread (7 tweets)

**Tweet 1 (hook):**
```
I built an AI operating system that gets smarter every day.

14 core modules. Hardware-aware. Self-improving. Open source.

Here's the architecture behind it. 🧵
```
*Attach og-image.svg*

**Tweet 2:**
```
The problem with every AI agent framework:

They run tasks. They don't learn from them.

You discover a pattern Monday → forget it by Wednesday.
Same bugs across every project.
Research evaporates into bookmarks.
No memory between sessions.

Fine for demos. Useless for daily work.
```

**Tweet 3:**
```
So I built Axiom around 6 layers:

L5 — Learning (knowledge accelerator, spaced repetition, gap detector)
L4 — Intelligence (auto-skill extraction, self-modification, cross-project sync)
L3 — Operations (process registry, VRAM management, port management)
L2 — Knowledge (wiki vault, build journal, staging system)
L1 — Execution (any LLM)
L0 — Hardware (GPU VRAM budgeting)
```

**Tweet 4:**
```
The killer layer is L5.

Daily web research across 11 domains.
Findings go through spaced repetition — surface at day 1, 3, 7, 14.
Not a text file you never read. An actual learning loop.

By day 14 the pattern is either in your long-term memory or archived.
```

**Tweet 5:**
```
L4 is where it gets wild.

Successful build patterns auto-extract into reusable skills.
Repeated corrections auto-promote to permanent rules (through a review system).

Your AI literally evolves from experience.
```

**Tweet 6:**
```
You can try the free scanner right now with zero install:

npx axiom-check

It checks 12 common 2026 gaps (RLS, Tailwind v4, Stripe Meters API, React Compiler, etc.) and gives you a score out of 100.

I ran it against the top 48 Next.js repos. Average: 68/100.
92% still use manual useMemo/useCallback.
```

**Tweet 7:**
```
Free, MIT, zero external dependencies. Works with Claude Code, Ollama, or any LLM.

github.com/yorkisestevez/axiom

If you build something cool with it, open a PR. If you find a bug, open an issue. If the rules are wrong, tell me — I'll fix them.
```

---

## LinkedIn (1 post)

```
I just open-sourced Axiom — a self-improving AI operating system for developers.

The problem: every AI agent framework in 2026 runs tasks but never learns from them. You discover a pattern, use it once, forget it next week. Same mistakes across every project. No memory, no context, no evolution.

So I built a 14-module framework that sits on top of any LLM (Claude Code, Ollama, Gemini) and adds:

• A daily Knowledge Accelerator that researches 11 domains and feeds findings through a spaced repetition engine (day 1, 3, 7, 14 — you actually retain what you learn)
• Auto-skill extraction from successful builds (patterns that work get captured automatically)
• Cross-project sync (if you used RLS in Project A, Axiom knows Project B is missing it)
• Hardware-aware scheduling for local Ollama models (VRAM budgeting, no more out-of-memory crashes)
• A git-versioned wiki knowledge base where AI proposes changes through staging (you review and approve)

There's also a free standalone scanner you can run right now with zero install:

npx axiom-check

It gives your repo a score out of 100 based on 12 common 2026 best-practice gaps. I ran it against the top 50 Next.js projects on GitHub — writeup in the repo.

Everything is MIT licensed.

→ github.com/yorkisestevez/axiom

Feedback, stars, and PRs welcome.

#AI #OpenSource #DeveloperTools #NextJS #Claude
```

---

## Indie Hackers Milestone Post

```
Title: Just open-sourced my AI operating system + a free scanner tool

Body:
After 6 months of building Axiom to manage my own projects, I open-sourced it today.

It's a self-improving framework that sits on top of any LLM (Claude Code, Ollama, etc.) and adds a learning layer nobody else has:

- Daily web research with spaced repetition
- Auto-skill extraction from successful builds
- Cross-project pattern sync
- Hardware-aware VRAM budgeting for local models

Plus a free standalone scanner (`npx axiom-check`) that grades any repo out of 100 based on 2026 best practices.

I also ran the scanner against the top 50 Next.js projects on GitHub and wrote up what I found. Average score: 68/100.

GitHub: github.com/yorkisestevez/axiom
Free scanner: npx axiom-check

The framework is free. I'm monetizing via domain packs — pre-configured skill bundles for specific verticals (SaaS Starter Pack is live on Gumroad for $49).

Would love feedback on the architecture, the rules, or the monetization strategy.
```

---

## Launch Day Order of Operations

1. **Morning (7 AM PT)** — Post to Hacker News first (Show HN). Be ready to respond to every comment in the first 2 hours.
2. **Morning (9 AM PT)** — Post to Reddit r/SideProject (friendliest audience for "show me your thing" posts).
3. **Midday (12 PM PT)** — Post the Twitter/X thread.
4. **Afternoon (2 PM PT)** — Post to r/nextjs with the Hall of Gaps angle.
5. **Afternoon (4 PM PT)** — Post to LinkedIn.
6. **Evening (7 PM PT)** — Post to Indie Hackers.
7. **Next day** — Post to r/reactjs, r/webdev, r/ClaudeAI, r/LocalLLaMA (spread over 48 hours).

**DO NOT post everything at once.** Reddit mods and HN algorithms penalize cross-posting spam. Spread it out.

**DO respond to every comment in the first 2 hours of each post.** First impressions determine whether the algorithm promotes or buries your post.

**DO check GitHub notifications every 30 minutes for the first 24 hours.** Someone will open an issue or ask a question. Fast responses = better reputation.
