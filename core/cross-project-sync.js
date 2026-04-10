/**
 * OpenClaw Cross-Project Pattern Sync
 * Detects when a pattern used in one project could upgrade another.
 * "EdgeVault uses RLS — Contractor Vault doesn't yet."
 *
 * Usage:
 *   node cross-project-sync.js scan     — scan all projects for transferable patterns
 *   node cross-project-sync.js report   — generate recommendations to staging
 *
 * Read-only. Outputs to wiki/_staging/pending/.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./config');
const OPENCLAW = config.paths.root;
const WIKI = path.join(OPENCLAW, 'wiki');
const STAGING = path.join(WIKI, '_staging', 'pending');

// ── Transferable Pattern Definitions ────────────────────────────
// Each pattern: what it looks like in code, which projects should have it.

const PATTERNS = [
  {
    id: 'rls-policies',
    name: 'Supabase Row Level Security',
    detect: 'CREATE POLICY|rls|row_level_security',
    fileGlob: '*.{sql,ts,js}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault'],
    reason: 'Multi-tenant SaaS requires RLS for data isolation'
  },
  {
    id: 'error-boundary',
    name: 'React Error Boundaries',
    detect: 'error\\.tsx|ErrorBoundary|componentDidCatch',
    fileGlob: '*.{tsx,jsx,ts}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault', 'synkops', 'dashboard'],
    reason: 'Production apps need error boundaries to prevent full-page crashes'
  },
  {
    id: 'loading-states',
    name: 'Loading/Suspense States',
    detect: 'loading\\.tsx|Suspense|Skeleton',
    fileGlob: '*.{tsx,jsx}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault', 'synkops'],
    reason: 'UX: users need feedback during data loading'
  },
  {
    id: 'api-error-handling',
    name: 'Consistent API Error Handling',
    detect: 'catch.*error|ApiError|handleError|errorHandler',
    fileGlob: '*.{ts,js}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault', 'synkops'],
    reason: 'Every API route needs consistent error handling (validated pattern from SynkOps)'
  },
  {
    id: 'env-validation',
    name: 'Environment Variable Validation',
    detect: 'z\\.string|env\\.parse|validateEnv|process\\.env\\.',
    fileGlob: '*.{ts,js}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault'],
    reason: 'Prevents runtime crashes from missing env vars'
  },
  {
    id: 'rate-limiting',
    name: 'API Rate Limiting',
    detect: 'rateLimit|rate-limit|throttle|limiter',
    fileGlob: '*.{ts,js}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault', 'openclaw'],
    reason: 'Production APIs need rate limiting for security and cost control'
  },
  {
    id: 'input-validation',
    name: 'Input Validation (Zod/Yup)',
    detect: 'z\\.object|z\\.string|yup\\.object|schema\\.validate',
    fileGlob: '*.{ts,js}',
    shouldHave: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault', 'synkops'],
    reason: 'All user input must be validated at API boundary'
  },
  {
    id: 'structured-logging',
    name: 'Structured Logging',
    detect: 'logger\\.|winston|pino|structuredLog',
    fileGlob: '*.{ts,js}',
    shouldHave: ['edgevault', 'openclaw'],
    reason: 'Production debugging requires structured, searchable logs'
  }
];

// ── Known Code Paths ────────────────────────────────────────────

const PROJECT_PATHS = {
  // Project paths loaded from config.projects,
  // Project paths loaded from config.projects,
  // Add more as projects get codebases
};

// ── Scanner ─────────────────────────────────────────────────────

function scanForPattern(pattern) {
  const results = { has: [], missing: [], noCode: [] };

  for (const project of pattern.shouldHave) {
    const codePath = PROJECT_PATHS[project];
    if (!codePath || !fs.existsSync(codePath)) {
      results.noCode.push(project);
      continue;
    }

    try {
      const cmd = `rg -c "${pattern.detect}" --glob "${pattern.fileGlob}" "${codePath}" 2>/dev/null`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 10000, windowsHide: true }).trim();
      const matchCount = output.split('\n').filter(l => l).reduce((sum, line) => {
        const parts = line.split(':');
        return sum + (parseInt(parts[parts.length - 1]) || 0);
      }, 0);

      if (matchCount > 0) {
        results.has.push({ project, matchCount });
      } else {
        results.missing.push(project);
      }
    } catch {
      results.missing.push(project);
    }
  }

  return results;
}

function scanAll() {
  const recommendations = [];

  for (const pattern of PATTERNS) {
    const results = scanForPattern(pattern);

    // Only recommend if at least one project HAS it and at least one DOESN'T
    if (results.has.length > 0 && results.missing.length > 0) {
      recommendations.push({
        pattern: pattern.name,
        reason: pattern.reason,
        hasIt: results.has.map(h => `${h.project} (${h.matchCount} refs)`),
        needsIt: results.missing,
        noCode: results.noCode
      });
    }
  }

  return recommendations;
}

// ── Report Generator ────────────────────────────────────────────

function generateReport(recommendations) {
  if (recommendations.length === 0) return null;

  const date = new Date().toISOString().split('T')[0];
  const d = new Date();
  const ts = `${date}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;

  const sections = recommendations.map(r => {
    return `### ${r.pattern}
**Why:** ${r.reason}
**Has it:** ${r.hasIt.join(', ')}
**Needs it:** ${r.needsIt.join(', ')}${r.noCode.length > 0 ? `\n**No codebase yet:** ${r.noCode.join(', ')}` : ''}`;
  });

  const content = `---
date: ${date}
wiki: technical
target_file: technical/patterns/cross-project-sync.md
action: replace_section
priority: low
source_model: claude-code
summary: Cross-project pattern sync — ${recommendations.length} transferable patterns found
---

## Proposed Content

# Cross-Project Pattern Sync — ${date}

${sections.join('\n\n')}

## Context

Auto-generated by cross-project-sync.js. Identifies patterns proven in one project that could benefit others.

## Affected Files

${[...new Set(recommendations.flatMap(r => r.needsIt))].map(p => `- ${p}/`).join('\n')}
`;

  const filename = `${ts}_technical_cross-project-sync.md`;
  const filepath = path.join(STAGING, filename);
  if (!fs.existsSync(STAGING)) fs.mkdirSync(STAGING, { recursive: true });
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`[cross-project-sync] Report: ${filename}`);
  return filepath;
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'scan') {
    const recs = scanAll();
    if (recs.length === 0) {
      console.log('All projects are in sync. No transferable patterns found.');
    } else {
      console.log(`${recs.length} transferable pattern(s):`);
      for (const r of recs) {
        console.log(`\n  ${r.pattern}`);
        console.log(`    Has: ${r.hasIt.join(', ')}`);
        console.log(`    Needs: ${r.needsIt.join(', ')}`);
      }
    }
  } else if (cmd === 'report') {
    const recs = scanAll();
    generateReport(recs);
  } else {
    console.log('Cross-Project Pattern Sync');
    console.log('  node cross-project-sync.js scan    — find transferable patterns');
    console.log('  node cross-project-sync.js report  — generate staging report');
  }
}

module.exports = { scanAll, scanForPattern, generateReport, PATTERNS };
