# Reddit Post Draft

**Subreddit:** r/nextjs, r/reactjs, r/webdev, r/SideProject

**Title:** I scanned the top 50 claude projects on GitHub for 2026 best-practice gaps. Here's what I found.

---

Hey everyone,

I built a free CLI tool called **[axiom-check](https://github.com/yorkisestevez/axiom-check)** that scans any repo for 2026 best-practice gaps. Then I ran it against the top 50 claude projects on GitHub.

## The numbers

- **Average score:** 75/100 (out of the top 50 most-starred claude projects)
- **74%** still missing error boundaries
- **66%** still missing .env.example
- **62%** still readme missing badges

## The surprising part

74% of the most popular claude repos still have **Missing error boundaries**. These aren't small projects — these are repos with tens of thousands of stars.

## Run it yourself

```bash
npx axiom-check
```

Zero install, 5 seconds, and you get a stylized report + a score out of 100 you can share.

Full report with all 10 gaps: [github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md](https://github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md)

Source: [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom) — MIT licensed.

Would love feedback on the rules. If you have a specific pattern you think should be checked, open an issue.
