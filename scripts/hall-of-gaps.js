#!/usr/bin/env node

/**
 * hall-of-gaps.js — Scan the top 50 Next.js projects on GitHub with axiom-check
 * and generate a public report.
 *
 * Usage:
 *   node scripts/hall-of-gaps.js                 # default: top 50 Next.js repos
 *   node scripts/hall-of-gaps.js --topic supabase --limit 25
 *
 * Requires:
 *   - GitHub CLI (`gh`) authenticated
 *   - git
 *   - axiom-check installed globally OR path configured via --axiom-check flag
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ── Config ───────────────────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.findIndex(a => a === '--' + name);
  if (idx === -1) return fallback;
  return args[idx + 1];
}

const TOPIC = getArg('topic', 'nextjs');
const LIMIT = parseInt(getArg('limit', '50'), 10);
const TMP_DIR = path.resolve(__dirname, '..', 'scripts', 'hall-of-gaps-tmp');
const OUT_REPORT = path.resolve(__dirname, '..', 'content', 'hall-of-gaps.md');
const OUT_REDDIT = path.resolve(__dirname, '..', 'content', 'reddit-post-hall-of-gaps.md');
const AXIOM_CHECK = getArg('axiom-check', path.resolve(__dirname, '..', '..', 'axiom-check', 'index.js'));

// ── Helpers ──────────────────────────────────────────────────────
function log(msg, color = '') {
  const colors = { green: '\x1b[32m', red: '\x1b[31m', dim: '\x1b[2m', reset: '\x1b[0m' };
  console.log((colors[color] || '') + msg + colors.reset);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...opts });
  } catch (err) {
    return null;
  }
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ── Step 1: Fetch repo list via gh ───────────────────────────────
function fetchRepos() {
  log(`▸ Fetching top ${LIMIT} ${TOPIC} repos via gh CLI...`, 'dim');
  const cmd = `gh search repos --topic ${TOPIC} --limit ${LIMIT} --sort stars --json fullName,stargazerCount,url`;
  const out = run(cmd);
  if (!out) {
    log('✗ Failed to fetch repos. Is `gh` authenticated?', 'red');
    process.exit(1);
  }
  const repos = JSON.parse(out);
  log(`✓ Found ${repos.length} repos`, 'green');
  return repos;
}

// ── Step 2: Clone + scan each repo ───────────────────────────────
function scanRepo(repo) {
  const slug = repo.fullName.replace('/', '_');
  const dir = path.join(TMP_DIR, slug);

  // Skip if already cloned
  if (!fs.existsSync(dir)) {
    log(`  ▸ Cloning ${repo.fullName}...`, 'dim');
    const cloneResult = run(`git clone --depth 1 --single-branch ${repo.url} "${dir}"`);
    if (cloneResult === null) {
      log(`  ✗ Clone failed`, 'red');
      return null;
    }
  }

  // Run axiom-check and capture JSON-ish output
  log(`  ▸ Scanning...`, 'dim');
  const result = spawnSync('node', [AXIOM_CHECK, dir], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' }
  });

  const output = stripAnsi(result.stdout || '');

  // Parse the output into structured data
  const score = parseInt((output.match(/SCORE:\s*(\d+)\s*\/\s*100/) || [])[1] || '0', 10);
  const findings = [];
  const findingRegex = /●\s+(HIGH|MED|LOW)\s+(.+?)(?:\s+\((\d+)\s*hits?\))?\n/g;
  let m;
  while ((m = findingRegex.exec(output)) !== null) {
    findings.push({
      severity: m[1].trim(),
      name: m[2].trim(),
      hits: parseInt(m[3] || '0', 10)
    });
  }

  return {
    fullName: repo.fullName,
    url: repo.url,
    stars: repo.stargazerCount,
    score,
    findings,
    rawOutput: output
  };
}

// ── Step 3: Aggregate results ────────────────────────────────────
function aggregate(results) {
  const gapCounts = {}; // ruleName -> { count, severity }
  let totalScore = 0;
  let scanned = 0;

  for (const r of results) {
    if (!r) continue;
    scanned++;
    totalScore += r.score;
    for (const f of r.findings) {
      if (!gapCounts[f.name]) {
        gapCounts[f.name] = { count: 0, severity: f.severity, totalHits: 0 };
      }
      gapCounts[f.name].count++;
      gapCounts[f.name].totalHits += f.hits;
    }
  }

  const topGaps = Object.entries(gapCounts)
    .map(([name, data]) => ({ name, ...data, percent: Math.round((data.count / scanned) * 100) }))
    .sort((a, b) => b.count - a.count);

  const sorted = results.filter(Boolean).sort((a, b) => a.score - b.score);
  const hallOfShame = sorted.slice(0, 5);
  const hallOfFame = [...sorted].reverse().slice(0, 5);

  return {
    scanned,
    averageScore: Math.round(totalScore / scanned),
    topGaps,
    hallOfShame,
    hallOfFame
  };
}

// ── Step 4: Render report ────────────────────────────────────────
function renderReport(agg) {
  const date = new Date().toISOString().split('T')[0];
  const bar = (percent, width = 30) => {
    const filled = Math.round((percent / 100) * width);
    return '█'.repeat(filled) + '░'.repeat(width - filled);
  };

  let md = `# Hall of Gaps

## What 2026 Best Practices the Top ${agg.scanned} ${TOPIC} Projects Are Missing

> Generated ${date} by scanning the top ${agg.scanned} GitHub repos tagged **${TOPIC}** with [\`axiom-check\`](https://github.com/yorkisestevez/axiom).
> Run it on your own repo: \`npx axiom-check\`

---

## TL;DR

- **Average Axiom Score:** ${agg.averageScore} / 100
- **Repos scanned:** ${agg.scanned}
- **Top 3 gaps** appear in **${agg.topGaps.slice(0, 3).map(g => g.percent + '%').join(' / ')}** of repos

---

## Top 10 Most Common Gaps

| Rank | Gap | Severity | Found In | Distribution |
|------|-----|----------|----------|--------------|
`;

  agg.topGaps.slice(0, 10).forEach((g, i) => {
    md += `| ${i + 1} | **${g.name}** | ${g.severity} | ${g.count}/${agg.scanned} (${g.percent}%) | \`${bar(g.percent)}\` |\n`;
  });

  md += `\n---\n\n## Hall of Shame\n\nLowest scores — the most gaps per repo:\n\n`;
  agg.hallOfShame.forEach((r, i) => {
    md += `${i + 1}. **Repo ${String.fromCharCode(65 + i)}** — Score: **${r.score}/100** — ${r.findings.length} gaps (${r.stars.toLocaleString()} stars)\n`;
  });

  md += `\n## Hall of Fame\n\nHighest scores — the cleanest repos:\n\n`;
  agg.hallOfFame.forEach((r, i) => {
    md += `${i + 1}. **${r.fullName}** — Score: **${r.score}/100** — ${r.findings.length} gaps (${r.stars.toLocaleString()} stars)\n`;
  });

  md += `\n---\n\n## Run It On Your Repo\n\n\`\`\`bash\nnpx axiom-check\n\`\`\`\n\nYou'll get a stylized scorecard in under 5 seconds. No install, no signup.\n\n## About Axiom\n\nThis report was generated by the free \`axiom-check\` scanner. The full **[Axiom framework](https://github.com/yorkisestevez/axiom)** is a self-improving AI operating system that runs this scan daily against YOUR projects, researches new patterns, and auto-extracts reusable skills from your builds.\n\n**→ [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom)**\n`;

  return md;
}

function renderRedditPost(agg) {
  const top3 = agg.topGaps.slice(0, 3);
  return `# Reddit Post Draft

**Subreddit:** r/nextjs, r/reactjs, r/webdev, r/SideProject

**Title:** I scanned the top ${agg.scanned} ${TOPIC} projects on GitHub for 2026 best-practice gaps. Here's what I found.

---

Hey everyone,

I built a free CLI tool called **[axiom-check](https://github.com/yorkisestevez/axiom-check)** that scans any repo for 2026 best-practice gaps. Then I ran it against the top ${agg.scanned} ${TOPIC} projects on GitHub.

## The numbers

- **Average score:** ${agg.averageScore}/100 (out of the top ${agg.scanned} most-starred ${TOPIC} projects)
- **${top3[0].percent}%** still ${top3[0].name.toLowerCase()}
- **${top3[1].percent}%** still ${top3[1].name.toLowerCase()}
- **${top3[2].percent}%** still ${top3[2].name.toLowerCase()}

## The surprising part

${top3[0].percent}% of the most popular ${TOPIC} repos still have **${top3[0].name}**. These aren't small projects — these are repos with tens of thousands of stars.

## Run it yourself

\`\`\`bash
npx axiom-check
\`\`\`

Zero install, 5 seconds, and you get a stylized report + a score out of 100 you can share.

Full report with all 10 gaps: [github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md](https://github.com/yorkisestevez/axiom/blob/master/content/hall-of-gaps.md)

Source: [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom) — MIT licensed.

Would love feedback on the rules. If you have a specific pattern you think should be checked, open an issue.
`;
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  log('=== HALL OF GAPS ===\n', 'green');
  ensureDir(TMP_DIR);
  ensureDir(path.dirname(OUT_REPORT));

  if (!fs.existsSync(AXIOM_CHECK)) {
    log(`✗ axiom-check not found at ${AXIOM_CHECK}`, 'red');
    log(`  Pass --axiom-check <path> or install axiom-check globally`, 'dim');
    process.exit(1);
  }

  const repos = fetchRepos();
  const results = [];
  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    log(`[${i + 1}/${repos.length}] ${repo.fullName} (${repo.stargazerCount.toLocaleString()} stars)`, 'green');
    try {
      const r = scanRepo(repo);
      if (r) results.push(r);
    } catch (err) {
      log(`  ✗ Error: ${err.message}`, 'red');
    }
  }

  log(`\n▸ Aggregating results...`, 'dim');
  const agg = aggregate(results);

  log(`▸ Writing report to ${OUT_REPORT}...`, 'dim');
  fs.writeFileSync(OUT_REPORT, renderReport(agg), 'utf8');

  log(`▸ Writing Reddit post draft to ${OUT_REDDIT}...`, 'dim');
  fs.writeFileSync(OUT_REDDIT, renderRedditPost(agg), 'utf8');

  log(`\n✓ Done. Scanned ${agg.scanned}, average score ${agg.averageScore}/100`, 'green');
  log(`  Report: ${OUT_REPORT}`);
  log(`  Reddit: ${OUT_REDDIT}`);
  log(`\nNext: review the outputs, then delete ${TMP_DIR} to free disk space`, 'dim');
}

if (require.main === module) main();
