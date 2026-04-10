/**
 * OpenClaw Build Journal
 * Auto-logs what gets built each Claude Code session.
 * Creates a searchable knowledge base of patterns, decisions, and outcomes.
 *
 * Usage:
 *   node build-journal.js log "Built RLS tenant isolation for Contractor Vault" --project contractor-vault --patterns "rls,multi-tenant,supabase" --files "src/lib/auth.ts,supabase/migrations/001.sql"
 *   node build-journal.js search "authentication"
 *   node build-journal.js recent 10
 *   node build-journal.js patterns
 *
 * Integrates with SessionEnd hook via shared-context.js
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const OPENCLAW = config.paths.root;
const JOURNAL_PATH = path.join(OPENCLAW, 'build-journal.jsonl');
const PATTERNS_INDEX = path.join(OPENCLAW, 'workspace', 'pattern-index.json');

// ── Core API ────────────────────────────────────────────────────

/**
 * Log a build entry.
 * @param {Object} entry
 * @param {string} entry.summary - What was built (1-2 sentences)
 * @param {string} entry.project - Project slug
 * @param {string[]} entry.patterns - Pattern tags used (e.g., ['rls', 'server-components'])
 * @param {string[]} entry.files - Key files created/modified
 * @param {string} entry.outcome - 'success' | 'partial' | 'failed'
 * @param {string} entry.learnings - What was learned (optional)
 * @param {string} entry.nextSteps - What comes next (optional)
 */
function logBuild(entry) {
  const record = {
    timestamp: new Date().toISOString(),
    summary: entry.summary || '',
    project: entry.project || 'unknown',
    patterns: entry.patterns || [],
    files: entry.files || [],
    outcome: entry.outcome || 'success',
    learnings: entry.learnings || null,
    nextSteps: entry.nextSteps || null,
    platform: entry.platform || 'claude-code'
  };

  fs.appendFileSync(JOURNAL_PATH, JSON.stringify(record) + '\n', 'utf8');
  updatePatternIndex(record);

  // Auto-skill extraction: check if patterns qualify
  if (record.outcome === 'success' && record.patterns.length > 0) {
    try {
      const extractor = require('./auto-skill-extractor');
      extractor.checkForSkill(record);
    } catch {}
  }

  return record;
}

/**
 * Search journal entries by keyword.
 * @param {string} query - Search term
 * @returns {Array} matching entries
 */
function search(query) {
  const entries = readJournal();
  const q = query.toLowerCase();
  return entries.filter(e =>
    e.summary.toLowerCase().includes(q) ||
    (e.learnings && e.learnings.toLowerCase().includes(q)) ||
    e.patterns.some(p => p.toLowerCase().includes(q)) ||
    e.project.toLowerCase().includes(q) ||
    e.files.some(f => f.toLowerCase().includes(q))
  );
}

/**
 * Get the N most recent entries.
 */
function recent(n = 10) {
  const entries = readJournal();
  return entries.slice(-n);
}

/**
 * Get pattern usage frequency + last used date.
 */
function getPatternStats() {
  try {
    return JSON.parse(fs.readFileSync(PATTERNS_INDEX, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Get entries for a specific project.
 */
function byProject(project) {
  return readJournal().filter(e => e.project === project);
}

// ── Internal ────────────────────────────────────────────────────

function readJournal() {
  try {
    const raw = fs.readFileSync(JOURNAL_PATH, 'utf8').trim();
    if (!raw) return [];
    return raw.split('\n').map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function updatePatternIndex(record) {
  const index = getPatternStats();
  for (const pattern of record.patterns) {
    const key = pattern.toLowerCase().trim();
    if (!index[key]) {
      index[key] = { count: 0, lastUsed: null, projects: [] };
    }
    index[key].count++;
    index[key].lastUsed = record.timestamp;
    if (!index[key].projects.includes(record.project)) {
      index[key].projects.push(record.project);
    }
  }

  const dir = path.dirname(PATTERNS_INDEX);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PATTERNS_INDEX, JSON.stringify(index, null, 2), 'utf8');
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
      if (key === 'patterns' || key === 'files') {
        opts[key] = val.split(',').map(s => s.trim());
      } else {
        opts[key] = val;
      }
    }
    const record = logBuild({ summary, ...opts });
    console.log(`[build-journal] Logged: ${record.summary}`);
    console.log(`  Project: ${record.project} | Patterns: ${record.patterns.join(', ') || 'none'}`);

  } else if (cmd === 'search') {
    const query = process.argv[3];
    if (!query) { console.log('Usage: node build-journal.js search <query>'); process.exit(1); }
    const results = search(query);
    console.log(`${results.length} result(s) for "${query}":`);
    for (const r of results) {
      console.log(`  [${r.timestamp.split('T')[0]}] ${r.project}: ${r.summary}`);
      if (r.patterns.length) console.log(`    Patterns: ${r.patterns.join(', ')}`);
    }

  } else if (cmd === 'recent') {
    const n = parseInt(process.argv[3]) || 10;
    const entries = recent(n);
    console.log(`Last ${entries.length} build(s):`);
    for (const e of entries) {
      console.log(`  [${e.timestamp.split('T')[0]}] ${e.project}: ${e.summary} (${e.outcome})`);
    }

  } else if (cmd === 'patterns') {
    const stats = getPatternStats();
    const sorted = Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
    console.log('Pattern Usage:');
    for (const [name, data] of sorted) {
      console.log(`  ${name}: ${data.count}x | Projects: ${data.projects.join(', ')} | Last: ${data.lastUsed.split('T')[0]}`);
    }

  } else if (cmd === 'project') {
    const project = process.argv[3];
    if (!project) { console.log('Usage: node build-journal.js project <slug>'); process.exit(1); }
    const entries = byProject(project);
    console.log(`${entries.length} build(s) for ${project}:`);
    for (const e of entries) {
      console.log(`  [${e.timestamp.split('T')[0]}] ${e.summary} (${e.outcome})`);
    }

  } else {
    console.log('Build Journal');
    console.log('  node build-journal.js log "summary" --project X --patterns "a,b" --files "x,y"');
    console.log('  node build-journal.js search <query>');
    console.log('  node build-journal.js recent [n]');
    console.log('  node build-journal.js patterns');
    console.log('  node build-journal.js project <slug>');
  }
}

module.exports = { logBuild, search, recent, getPatternStats, byProject };
