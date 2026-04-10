/**
 * OpenClaw Codebase Gap Detector
 * Cross-references Knowledge Accelerator findings against actual code.
 * Identifies applicable upgrades: "You have X, the world moved to Y."
 *
 * Usage:
 *   node gap-detector.js scan           — scan all projects for known gaps
 *   node gap-detector.js report         — generate gap report for staging
 *
 * Runs weekly via scheduled task (Sunday, after Knowledge Accelerator).
 * Read-only scan — outputs to wiki/_staging/pending/.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./config');
const OPENCLAW = config.paths.root;
const WIKI = path.join(OPENCLAW, 'wiki');
const STAGING = path.join(WIKI, '_staging', 'pending');

// ── Gap Definitions ─────────────────────────────────────────────
// Each gap: what to grep for, what it means, what the modern replacement is.

const GAP_RULES = [
  {
    id: 'manual-memo',
    name: 'Manual useMemo/useCallback',
    grep: 'useMemo|useCallback',
    fileGlob: '*.{tsx,jsx,ts,js}',
    finding: 'React Compiler now handles memoization automatically',
    action: 'Remove manual useMemo/useCallback — React Compiler does this for you',
    severity: 'low'
  },
  {
    id: 'tailwind-v3-classes',
    name: 'Tailwind v3 deprecated classes',
    grep: 'bg-gradient-to-|flex-shrink-0|flex-grow-0',
    fileGlob: '*.{tsx,jsx,html,css}',
    finding: 'Tailwind v4 renamed these: bg-gradient-to-* → bg-linear-to-*, flex-shrink-0 → shrink-0',
    action: 'Plan Tailwind v4 migration — these classes will break',
    severity: 'medium'
  },
  {
    id: 'use-client-overuse',
    name: 'Excessive "use client" directives',
    grep: '"use client"|\'use client\'',
    fileGlob: '*.{tsx,jsx}',
    finding: 'Next.js best practice: default to Server Components, only add "use client" when needed',
    action: 'Audit "use client" usage — many components may work as Server Components',
    severity: 'low'
  },
  {
    id: 'no-rls',
    name: 'Missing Row Level Security',
    grep: 'supabase\\.from\\(|createClient',
    fileGlob: '*.{ts,js}',
    finding: 'Multi-tenant SaaS requires RLS from day 1. Retrofitting is extremely costly.',
    action: 'Verify all Supabase queries are protected by RLS policies',
    severity: 'high'
  },
  {
    id: 'legacy-stripe-usage',
    name: 'Legacy Stripe usage records API',
    grep: 'usage_records|create_usage_record|usageRecords',
    fileGlob: '*.{ts,js}',
    finding: 'Stripe deprecated usage records API (2025-03-31). Use Meters API instead.',
    action: 'Migrate to Stripe Meters API before legacy endpoints are removed',
    severity: 'high'
  },
  {
    id: 'no-flash-attention',
    name: 'Ollama without Flash Attention',
    grep: 'FLASH_ATTENTION',
    fileGlob: '*.{js,json,env,sh,bat}',
    finding: 'Flash Attention reduces KV cache 5-10%. Free VRAM savings on RTX 5070.',
    action: 'Set FLASH_ATTENTION=1 in Ollama startup configuration',
    severity: 'medium',
    invertMatch: true // gap exists if NOT found
  },
  {
    id: 'inline-styles',
    name: 'Inline styles instead of Tailwind',
    grep: 'style=\\{|style={{',
    fileGlob: '*.{tsx,jsx}',
    finding: 'Code standard: Tailwind only, no inline styles.',
    action: 'Convert inline styles to Tailwind utility classes',
    severity: 'low'
  },
  {
    id: 'missing-error-boundary',
    name: 'Missing error boundaries',
    grep: 'ErrorBoundary|error\\.tsx',
    fileGlob: '*.{tsx,jsx}',
    finding: 'Production apps need error boundaries to prevent full-page crashes.',
    action: 'Add error.tsx to each route segment in Next.js App Router',
    severity: 'medium',
    invertMatch: true
  }
];

// ── Project Paths ───────────────────────────────────────────────

function getProjectPaths() {
  const projects = {};
  // Check wiki for project paths
  const projectsDir = path.join(WIKI, 'business', 'projects');
  try {
    const dirs = fs.readdirSync(projectsDir).filter(d =>
      fs.statSync(path.join(projectsDir, d)).isDirectory()
    );
    for (const dir of dirs) {
      // Try to find actual code paths from TECH.md or README.md
      const techPath = path.join(projectsDir, dir, 'TECH.md');
      const brainPath = path.join(projectsDir, dir, 'BRAIN.md');
      projects[dir] = { wikiPath: path.join(projectsDir, dir) };
    }
  } catch {}

  // Known code paths
  const knownPaths = {
    // 'edgevault': loaded from config,
    // Project paths loaded from config.projects,
    'golden-maple': null, // Duda — no local code
  };

  for (const [name, codePath] of Object.entries(knownPaths)) {
    if (projects[name]) projects[name].codePath = codePath;
  }

  return projects;
}

// ── Scanner ─────────────────────────────────────────────────────

function scanProject(projectName, codePath) {
  if (!codePath || !fs.existsSync(codePath)) return [];

  const gaps = [];
  for (const rule of GAP_RULES) {
    try {
      const cmd = `rg -c "${rule.grep}" --glob "${rule.fileGlob}" "${codePath}" 2>/dev/null || echo "0"`;
      const result = execSync(cmd, { encoding: 'utf8', timeout: 10000, windowsHide: true }).trim();

      const lines = result.split('\n').filter(l => l && !l.startsWith('0'));
      const matchCount = lines.reduce((sum, line) => {
        const parts = line.split(':');
        return sum + (parseInt(parts[parts.length - 1]) || 0);
      }, 0);

      const hasMatches = matchCount > 0;
      const isGap = rule.invertMatch ? !hasMatches : hasMatches;

      if (isGap) {
        gaps.push({
          rule: rule.id,
          name: rule.name,
          project: projectName,
          matchCount: rule.invertMatch ? 0 : matchCount,
          finding: rule.finding,
          action: rule.action,
          severity: rule.severity,
          files: rule.invertMatch ? [] : lines.map(l => l.split(':')[0]).slice(0, 5)
        });
      }
    } catch {}
  }
  return gaps;
}

function scanAll() {
  const projects = getProjectPaths();
  const allGaps = [];

  for (const [name, info] of Object.entries(projects)) {
    if (info.codePath) {
      const gaps = scanProject(name, info.codePath);
      allGaps.push(...gaps);
    }
  }

  return allGaps;
}

// ── Report Generator ────────────────────────────────────────────

function generateReport(gaps) {
  if (gaps.length === 0) return null;

  const date = new Date().toISOString().split('T')[0];
  const d = new Date();
  const ts = `${date}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;

  const byProject = {};
  for (const gap of gaps) {
    if (!byProject[gap.project]) byProject[gap.project] = [];
    byProject[gap.project].push(gap);
  }

  const sections = [];
  for (const [project, projectGaps] of Object.entries(byProject)) {
    sections.push(`### ${project}`);
    for (const g of projectGaps.sort((a, b) => severityRank(b.severity) - severityRank(a.severity))) {
      const badge = g.severity === 'high' ? '🔴' : g.severity === 'medium' ? '🟡' : '🟢';
      sections.push(`- ${badge} **${g.name}** (${g.matchCount} occurrences)`);
      sections.push(`  Finding: ${g.finding}`);
      sections.push(`  Action: ${g.action}`);
      if (g.files.length > 0) {
        sections.push(`  Files: ${g.files.slice(0, 3).join(', ')}`);
      }
    }
    sections.push('');
  }

  const content = `---
date: ${date}
wiki: technical
target_file: technical/patterns/codebase-gaps.md
action: replace_section
priority: medium
source_model: claude-code
summary: Codebase gap analysis — ${gaps.length} gaps found across ${Object.keys(byProject).length} projects
---

## Proposed Content

# Codebase Gap Analysis — ${date}

${sections.join('\n')}

## Context

Auto-generated by gap-detector.js. Cross-references Knowledge Accelerator findings against actual code patterns.

## Affected Files

${[...new Set(gaps.flatMap(g => g.files))].slice(0, 10).map(f => `- ${f}`).join('\n')}
`;

  const filename = `${ts}_technical_gap-analysis.md`;
  const filepath = path.join(STAGING, filename);
  if (!fs.existsSync(STAGING)) fs.mkdirSync(STAGING, { recursive: true });
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`[gap-detector] Report: ${filename}`);
  return filepath;
}

function severityRank(s) {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1;
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'scan') {
    const gaps = scanAll();
    if (gaps.length === 0) {
      console.log('No gaps detected.');
    } else {
      console.log(`${gaps.length} gap(s) found:`);
      for (const g of gaps) {
        const badge = g.severity === 'high' ? '[HIGH]' : g.severity === 'medium' ? '[MED]' : '[LOW]';
        console.log(`  ${badge} ${g.project}: ${g.name} (${g.matchCount} hits)`);
        console.log(`    → ${g.action}`);
      }
    }
  } else if (cmd === 'report') {
    const gaps = scanAll();
    const path = generateReport(gaps);
    if (path) {
      console.log('[gap-detector] Report written to staging.');
    } else {
      console.log('[gap-detector] No gaps to report.');
    }
  } else {
    console.log('Gap Detector');
    console.log('  node gap-detector.js scan     — scan all projects');
    console.log('  node gap-detector.js report   — generate staging report');
  }
}

module.exports = { scanAll, scanProject, generateReport, GAP_RULES };
