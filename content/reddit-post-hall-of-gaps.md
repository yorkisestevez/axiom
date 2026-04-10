# Reddit Post Draft — Hall of Gaps

**This is a template. Real stats will be auto-filled when you run `scripts/hall-of-gaps.js`.**

---

## Subreddit Targets (in launch order)

1. **r/nextjs** — most relevant audience
2. **r/SideProject** — show and tell
3. **r/reactjs** — broader React community
4. **r/webdev** — general developer audience
5. **r/ClaudeAI** — if the topic is Claude Code
6. **r/LocalLLaMA** — if the topic is Ollama / local models

**Spread the posts** — don't post all on the same day. Start with r/SideProject (friendliest), then r/nextjs (most relevant), wait 48 hours between each sub.

---

## Title Options

**A) Straightforward:**
> I scanned the top 50 Next.js projects on GitHub for 2026 best-practice gaps. Here's what I found.

**B) Hook first:**
> 94% of the top 50 Next.js repos on GitHub are still using patterns deprecated in 2026. Here's the data.

**C) Question:**
> Are the top Next.js repos on GitHub actually following 2026 best practices? I built a tool to check.

**Recommendation:** Start with **B** on r/SideProject and r/nextjs, switch to **A** on the others.

---

## Post Body Template

```markdown
Hey everyone,

I built a free CLI tool called **axiom-check** that scans any repo for 2026 best-practice gaps — React Compiler, Tailwind v4, Supabase RLS, Stripe Meters API, and more. Zero install, just `npx axiom-check`.

Then I ran it against the **top 50 Next.js projects on GitHub** (by stars). Here's the pattern.

## The numbers
- **Average score:** [AUTOFILL]/100
- **[X]%** still use manual useMemo/useCallback (React Compiler makes this obsolete)
- **[X]%** still use Tailwind v3 deprecated class names (`bg-gradient-to-*` etc.)
- **[X]%** are missing error boundaries entirely

## The surprising part
[X]% of the most-starred repos still have **[top gap]**. These aren't hobby projects — these are repos with tens of thousands of stars. The gap between "cutting edge" and "production popular" is bigger than I thought.

## How to run it on your own repo

```bash
npx axiom-check
```

You'll get a stylized scorecard in under 5 seconds. 12 rules, each with HIGH/MED/LOW severity and a specific fix action. No install, no signup, no telemetry.

## Full report

All 10 gaps + Hall of Shame + Hall of Fame:
→ github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md

## Source

Both the scanner and the scan script are open source (MIT):
→ github.com/yorkisestevez/axiom

Would love feedback on the rules. If you have a specific pattern you think should be checked, open an issue.
```

---

## Launch Day Checklist

- [ ] Run `node scripts/hall-of-gaps.js --topic nextjs --limit 50` to generate real numbers
- [ ] Review the generated `hall-of-gaps.md` for any obviously wrong findings
- [ ] Update this template with the real stats
- [ ] Post to r/SideProject first (Tuesday or Wednesday morning)
- [ ] Wait 48h, post to r/nextjs
- [ ] Wait 48h, post to r/reactjs
- [ ] Monitor for comments — respond within 2 hours during the first 12 hours of each post
- [ ] Screenshot the scorecard of a recognizable repo and share on Twitter/X
- [ ] Track: stars gained per day, axiom-check npm downloads, Gumroad sales

---

## Response Playbook

**"Why don't you name the 'Hall of Shame' repos?"**
> Out of respect for maintainers. The point isn't to shame individual projects — the point is to show that even popular repos have these gaps and that most of them are easy to fix. Happy to share methodology privately if you're curious.

**"Your rules are opinionated / wrong about X"**
> That's fair — open a GitHub issue with your preferred rule. The whole scanner is MIT and designed to be extended. I'd rather the rules evolve with community feedback than be set by me alone.

**"This is just a linter"**
> `axiom-check` is just the free scanner — that's the Trojan horse. The full Axiom framework it comes from is a self-improving AI operating system that does a lot more (daily research, auto-skill extraction, cross-project sync). But the scanner is standalone and genuinely useful on its own.

**"I ran it and got a 32. Feels bad man."**
> Everyone starts low — that's the point. The score isn't a grade, it's a backlog. Each gap has a specific fix action you can knock out in an hour or two.
