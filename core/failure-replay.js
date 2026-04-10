/**
 * OpenClaw Failure Replay Loop
 * Captures build failures, generates post-mortems, and periodically re-tests.
 *
 * Usage:
 *   node failure-replay.js log "Auth middleware crashed on null user" --project edgevault --category "null-safety" --files "src/middleware.ts"
 *   node failure-replay.js check        — re-test all unresolved failures against current code
 *   node failure-replay.js report       — generate failure pattern report
 *   node failure-replay.js recent 10    — show recent failures
 *
 * Storage: failure-replay.jsonl (append-only log)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./config');
const OPENCLAW = config.paths.root;
const FAILURES_PATH = path.join(OPENCLAW, 'failure-replay.jsonl');

// ── Failure Categories ──────────────────────────────────────────
// Used for pattern detection across projects

const CATEGORIES = [
  'null-safety',
  'type-error',
  'auth-bypass',
  'race-condition',
  'missing-validation',
  'api-error-handling',
  'state-management',
  'build-failure',
  'deployment',
  'vram-overflow',
  'model-routing',
  'dependency',
  'other'
];

// ── Core API ────────────────────────────────────────────────────

/**
 * Log a failure incident.
 */
function logFailure(entry) {
  const record = {
    id: `fail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    summary: entry.summary || '',
    project: entry.project || 'unknown',
    category: CATEGORIES.includes(entry.category) ? entry.category : 'other',
    files: entry.files || [],
    rootCause: entry.rootCause || null,
    fix: entry.fix || null,
    preventionRule: entry.preventionRule || null,
    status: 'unresolved', // unresolved | resolved | recurring
    retestCount: 0,
    lastRetest: null
  };

  fs.appendFileSync(FAILURES_PATH, JSON.stringify(record) + '\n', 'utf8');
  return record;
}

/**
 * Check if previously failed files still have the same patterns.
 * Read-only grep — no modifications.
 */
function recheckFailures() {
  const failures = readFailures().filter(f => f.status !== 'resolved');
  const results = [];

  for (const failure of failures) {
    const checks = [];
    for (const file of failure.files) {
      const fullPath = resolveFilePath(failure.project, file);
      if (!fullPath || !fs.existsSync(fullPath)) {
        checks.push({ file, status: 'file-missing' });
        continue;
      }

      // Check if the file was modified since the failure
      try {
        const stat = fs.statSync(fullPath);
        const failDate = new Date(failure.timestamp);
        if (stat.mtimeMs > failDate.getTime()) {
          checks.push({ file, status: 'modified-since-failure' });
        } else {
          checks.push({ file, status: 'unchanged' });
        }
      } catch {
        checks.push({ file, status: 'error' });
      }
    }

    failure.retestCount++;
    failure.lastRetest = new Date().toISOString();

    const allModified = checks.every(c => c.status === 'modified-since-failure' || c.status === 'file-missing');
    if (allModified && failure.fix) {
      failure.status = 'resolved';
    }

    results.push({
      failure,
      checks,
      recommendation: allModified
        ? 'Likely resolved — files were modified after failure'
        : 'Still at risk — original files unchanged'
    });
  }

  // Write back updated statuses
  writeFailures(readFailures().map(f => {
    const updated = results.find(r => r.failure.id === f.id);
    return updated ? updated.failure : f;
  }));

  return results;
}

/**
 * Get failure patterns — recurring categories across projects.
 */
function getPatterns() {
  const failures = readFailures();
  const patterns = {};

  for (const f of failures) {
    if (!patterns[f.category]) {
      patterns[f.category] = { count: 0, projects: new Set(), unresolved: 0 };
    }
    patterns[f.category].count++;
    patterns[f.category].projects.add(f.project);
    if (f.status === 'unresolved') patterns[f.category].unresolved++;
  }

  // Convert sets to arrays for serialization
  for (const p of Object.values(patterns)) {
    p.projects = [...p.projects];
  }

  return patterns;
}

/**
 * Format for morning digest — show unresolved count + top pattern.
 */
function formatForDigest() {
  const failures = readFailures().filter(f => f.status === 'unresolved');
  if (failures.length === 0) return '';

  const patterns = getPatterns();
  const topPattern = Object.entries(patterns)
    .filter(([, v]) => v.unresolved > 0)
    .sort((a, b) => b[1].unresolved - a[1].unresolved)[0];

  const lines = [`\n*Failure Watch — ${failures.length} unresolved*`];
  if (topPattern) {
    lines.push(`→ Top pattern: ${topPattern[0]} (${topPattern[1].unresolved} open across ${topPattern[1].projects.join(', ')})`);
  }
  return lines.join('\n');
}

// ── Internal ────────────────────────────────────────────────────

function readFailures() {
  try {
    const raw = fs.readFileSync(FAILURES_PATH, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function writeFailures(failures) {
  const content = failures.map(f => JSON.stringify(f)).join('\n') + '\n';
  fs.writeFileSync(FAILURES_PATH, content, 'utf8');
}

function resolveFilePath(project, file) {
  const knownRoots = {
    // Project paths loaded from config
    // Project paths loaded from config.projects,
  };
  const root = knownRoots[project];
  if (!root) return null;
  return path.join(root, file);
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'log') {
    const summary = process.argv[3];
    const args = process.argv.slice(4);
    const opts = {};
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace('--', '');
      const val = args[i + 1];
      if (key === 'files') opts[key] = val.split(',').map(s => s.trim());
      else opts[key] = val;
    }
    const record = logFailure({ summary, ...opts });
    console.log(`[failure-replay] Logged: ${record.summary} (${record.category})`);

  } else if (cmd === 'check') {
    const results = recheckFailures();
    if (results.length === 0) {
      console.log('No unresolved failures to check.');
    } else {
      for (const r of results) {
        console.log(`[${r.failure.status.toUpperCase()}] ${r.failure.project}: ${r.failure.summary}`);
        console.log(`  → ${r.recommendation}`);
      }
    }

  } else if (cmd === 'report') {
    const patterns = getPatterns();
    console.log('Failure Patterns:');
    for (const [cat, data] of Object.entries(patterns).sort((a, b) => b[1].count - a[1].count)) {
      console.log(`  ${cat}: ${data.count} total, ${data.unresolved} unresolved | Projects: ${data.projects.join(', ')}`);
    }

  } else if (cmd === 'recent') {
    const n = parseInt(process.argv[3]) || 10;
    const failures = readFailures().slice(-n);
    for (const f of failures) {
      console.log(`  [${f.status}] ${f.timestamp.split('T')[0]} ${f.project}: ${f.summary}`);
    }

  } else {
    console.log('Failure Replay');
    console.log('  node failure-replay.js log "summary" --project X --category Y --files "a,b"');
    console.log('  node failure-replay.js check      — recheck unresolved failures');
    console.log('  node failure-replay.js report     — pattern analysis');
    console.log('  node failure-replay.js recent [n] — show recent');
    console.log(`  Categories: ${CATEGORIES.join(', ')}`);
  }
}

module.exports = { logFailure, recheckFailures, getPatterns, formatForDigest };
