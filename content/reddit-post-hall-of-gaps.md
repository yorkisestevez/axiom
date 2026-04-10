# Reddit Post Draft

**Subreddit:** r/nextjs, r/reactjs, r/webdev, r/SideProject

**Title:** I scanned the top 48 nextjs projects on GitHub for 2026 best-practice gaps. Here's what I found.

---

Hey everyone,

I built a free CLI tool called **[axiom-check](https://github.com/yorkisestevez/axiom-check)** that scans any repo for 2026 best-practice gaps. Then I ran it against the top 48 nextjs projects on GitHub.

## The numbers

- **Average score:** 68/100 (out of the top 48 most-starred nextjs projects)
- **92%** still manual usememo/usecallback
- **90%** still inline styles instead of tailwind
- **81%** still console.log in production code

## The surprising part

92% of the most popular nextjs repos still have **Manual useMemo/useCallback**. These aren't small projects — these are repos with tens of thousands of stars.

## Run it yourself

```bash
npx axiom-check
```

Zero install, 5 seconds, and you get a stylized report + a score out of 100 you can share.

Full report with all 10 gaps: [github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md](https://github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md)

Source: [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom) — MIT licensed.

Would love feedback on the rules. If you have a specific pattern you think should be checked, open an issue.
