---
date: 2026-04-10
title: "I Scanned the Top 48 Next.js Projects on GitHub. 92% Still Use Manual useMemo."
description: "Real data from scanning the 48 most-starred Next.js repos on GitHub for 2026 best-practice gaps. The results will change what you write tomorrow."
tags: [nextjs, react, javascript, webdev]
canonical_url: https://github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md
---

# I Scanned the Top 48 Next.js Projects on GitHub. 92% Still Use Manual useMemo.

I built a free CLI tool called **[axiom-check](https://github.com/yorkisestevez/axiom-check)** that scans any repo for 2026 best-practice gaps. Then I ran it against the 48 most-starred Next.js projects on GitHub (2 failed to clone — looking at you vercel/next.js).

Here's what I found.

## TL;DR

- **Average Axiom Score:** 68/100
- **Repos scanned:** 48
- **92%** still use manual useMemo/useCallback (React Compiler makes it obsolete)
- **90%** have inline styles instead of utility classes
- **81%** have console.log in production code
- **69%** still use Tailwind v3 deprecated class names
- **38%** of multi-tenant apps have no Row Level Security

## The Top 10 Gaps

| Rank | Gap | Severity | Found In |
|------|-----|----------|----------|
| 1 | Manual useMemo/useCallback | LOW | 44/48 (92%) |
| 2 | Inline styles instead of Tailwind | LOW | 43/48 (90%) |
| 3 | console.log in production code | LOW | 39/48 (81%) |
| 4 | Tailwind v3 deprecated classes | MED | 33/48 (69%) |
| 5 | README missing badges | LOW | 33/48 (69%) |
| 6 | Missing error boundaries | MED | 24/48 (50%) |
| 7 | Missing Row Level Security | HIGH | 18/48 (38%) |
| 8 | Missing .env.example | LOW | 15/48 (31%) |
| 9 | Possible hardcoded secrets | HIGH | 12/48 (25%) |
| 10 | TypeScript strict mode disabled | MED | 7/48 (15%) |

## The 92% Finding That Surprised Me

Here's the one I didn't expect: **44 out of 48 of the most popular Next.js repos on GitHub still use manual useMemo/useCallback.**

React Compiler handles memoization automatically in 2026. It's better than what humans write by hand — it catches edge cases, avoids stale closures, and only memoizes when it actually helps. Manual memoization is either redundant or actively worse.

And yet, 92% of repos with tens of thousands of stars haven't migrated. That's the gap between "what the framework team is telling you" and "what real production code looks like."

## The 38% Finding That Worried Me

38% of the top Next.js repos that use Supabase **don't have Row Level Security** on their tables.

For a multi-tenant SaaS, that's a tenant data leak waiting to happen. One missing `CREATE POLICY` statement and any authenticated user can query any other tenant's data.

The fix is 5 minutes per table. The cost of not fixing it is a disclosure incident that ends your company.

## Hall of Fame

The cleanest repos I scanned:

1. **[srbhr/Resume-Matcher](https://github.com/srbhr/Resume-Matcher)** — Score: **86/100** — 3 gaps (26,541 stars)
2. **[SigNoz/signoz](https://github.com/SigNoz/signoz)** — Score: **85/100** — 5 gaps (26,464 stars)
3. **[vercel/swr](https://github.com/vercel/swr)** — Score: **85/100** — 5 gaps (32,349 stars)
4. **[appwrite/appwrite](https://github.com/appwrite/appwrite)** — Score: **81/100** — 3 gaps (55,653 stars)
5. **[dyad-sh/dyad](https://github.com/dyad-sh/dyad)** — Score: **80/100** — 5 gaps (20,084 stars)

If you maintain any of these — you're doing something right. The rest of us should probably study what you're doing.

## Run It On Your Own Repo

Zero install. Takes 5 seconds:

```bash
npx axiom-check
```

You'll get a stylized terminal report with all 12 gap rules and a score out of 100. No signup, no telemetry, no upsell.

## The Methodology

The scanner uses regex-based detection against 12 rules. It's not perfect — it can have false positives (a `useMemo` inside a test file, for instance). The goal isn't forensic accuracy; it's surfacing patterns that usually indicate real issues.

All 12 rules are in the repo as JSON. If you think one is wrong, open an issue or a PR.

## Why I Built This

I run 15 projects. I kept noticing the same gaps across all of them — RLS missing here, Tailwind v3 classes there, manual memoization everywhere. Instead of remembering to check manually, I wrote a tool that does it automatically.

Then I wondered: **is it just me, or do all the top repos have these gaps too?**

The data says it's not just me. It's everyone.

## The Full Framework

`axiom-check` is the free scanner. It's part of a larger framework called **[Axiom](https://github.com/yorkisestevez/axiom)** — a self-improving AI operating system that runs daily gap scans, researches new patterns, and auto-extracts reusable skills from your successful builds.

Both are MIT licensed, zero dependencies, open source.

## What Next

I'll run this scan weekly against different topics (Supabase, React, Claude Code, Ollama). Each report publishes to the Axiom blog. If you want fresh data on what's actually happening in real codebases, follow the repo.

And if you run `npx axiom-check` on your own code, **share your score in the comments**. I'll DM the 90+ scores to find out what you're doing right.

---

*Yorkis Estevez — Toronto-based SaaS builder. Axiom is how I manage 15 projects without losing my mind.*
