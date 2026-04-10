/**
 * OpenClaw Self-Modification Engine (inspired by PAI)
 * Auto-promotes repeated correction patterns to permanent rules via wiki staging.
 * NEVER writes directly to CLAUDE.md, SOUL.md, or any config file.
 *
 * Usage:
 *   node self-modifier.js scan       — scan MEMORY.md for promotable patterns
 *   node self-modifier.js history    — show promotion history
 *   node self-modifier.js rejected   — show rejected patterns (won't re-propose)
 *
 * Safety: All promotions go through wiki/_staging/pending/. Yorkis approves or rejects.
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const OPENCLAW = config.paths.root;
const MEMORY_PATH = path.join(OPENCLAW, 'MEMORY.md');
const WIKI = path.join(OPENCLAW, 'wiki');
const STAGING = path.join(WIKI, '_staging', 'pending');
const REJECTED_DIR = path.join(WIKI, '_staging', 'rejected');
const PROMOTION_LOG = path.join(OPENCLAW, 'workspace', 'promotion-history.json');

const MIN_OCCURRENCES = 2; // Pattern must appear 2+ times to be promoted

// ── Core API ────────────────────────────────────────────────────

/**
 * Scan MEMORY.md for correction patterns that qualify for promotion.
 * Called after correction_engine.js handleCorrection().
 */
function checkForPromotion() {
  const corrections = parseCorrections();
  if (corrections.length === 0) return [];

  const patterns = groupByPattern(corrections);
  const history = readHistory();
  const promoted = [];

  for (const [pattern, entries] of Object.entries(patterns)) {
    // Skip if already promoted or rejected
    if (history.promoted && history.promoted[pattern]) continue;
    if (history.rejected && history.rejected[pattern]) continue;

    if (entries.length >= MIN_OCCURRENCES) {
      const rule = generateRule(pattern, entries);
      const stagingPath = writeStagingEntry(rule);
      markPromoted(pattern, stagingPath, entries.length);
      promoted.push({ pattern, occurrences: entries.length, stagingPath });
      console.log(`[self-modifier] Promoted: "${pattern}" (${entries.length} occurrences) → staging`);
    }
  }

  return promoted;
}

/**
 * Scan for promotable patterns without actually promoting (dry run).
 */
function scan() {
  const corrections = parseCorrections();
  const patterns = groupByPattern(corrections);
  const history = readHistory();
  const results = { promotable: [], approaching: [], alreadyHandled: [] };

  for (const [pattern, entries] of Object.entries(patterns)) {
    if ((history.promoted && history.promoted[pattern]) || (history.rejected && history.rejected[pattern])) {
      results.alreadyHandled.push({ pattern, count: entries.length, status: history.promoted?.[pattern] ? 'promoted' : 'rejected' });
      continue;
    }

    if (entries.length >= MIN_OCCURRENCES) {
      results.promotable.push({ pattern, count: entries.length });
    } else {
      results.approaching.push({ pattern, count: entries.length });
    }
  }

  return results;
}

/**
 * Learn from rejected staging entries.
 * Call this when Yorkis moves a self-modifier entry to _staging/rejected/.
 */
function learnFromRejections() {
  const history = readHistory();
  if (!history.rejected) history.rejected = {};

  try {
    const rejectedFiles = fs.readdirSync(REJECTED_DIR)
      .filter(f => f.includes('auto-rule'));

    for (const file of rejectedFiles) {
      const content = fs.readFileSync(path.join(REJECTED_DIR, file), 'utf8');
      const patternMatch = content.match(/Rule: (.+)/);
      if (patternMatch) {
        const pattern = patternMatch[1].trim().toLowerCase();
        history.rejected[pattern] = {
          rejectedAt: new Date().toISOString(),
          file
        };
      }
    }

    writeHistory(history);
    return Object.keys(history.rejected).length;
  } catch {
    return 0;
  }
}

// ── Pattern Extraction ──────────────────────────────────────────

function parseCorrections() {
  try {
    const content = fs.readFileSync(MEMORY_PATH, 'utf8');
    const corrections = [];

    // Parse correction entries from MEMORY.md
    // Format: lines starting with "- [CORRECTION" or containing correction markers
    const lines = content.split('\n');
    let currentCorrection = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Look for correction markers
      if (trimmed.match(/^\-\s*\[?(CORRECTION|RULE|ALWAYS|NEVER)/i) ||
          trimmed.match(/^\-\s*\*\*(CORRECTION|RULE|ALWAYS|NEVER)/i)) {
        if (currentCorrection) corrections.push(currentCorrection);
        currentCorrection = {
          text: trimmed.replace(/^-\s*\[?\*?\*?/, '').trim(),
          keywords: extractKeywords(trimmed)
        };
      } else if (trimmed.match(/^\-\s*(always|never|don't|do not|stop|avoid|prefer|use)/i)) {
        if (currentCorrection) corrections.push(currentCorrection);
        currentCorrection = {
          text: trimmed.replace(/^-\s*/, '').trim(),
          keywords: extractKeywords(trimmed)
        };
      }
    }
    if (currentCorrection) corrections.push(currentCorrection);

    return corrections;
  } catch {
    return [];
  }
}

function extractKeywords(text) {
  const lower = text.toLowerCase();
  const keywords = [];

  // Extract action verbs and subjects
  const actionPatterns = [
    /always\s+(\w+\s+\w+)/i,
    /never\s+(\w+\s+\w+)/i,
    /don't\s+(\w+\s+\w+)/i,
    /avoid\s+(\w+)/i,
    /prefer\s+(\w+)/i,
    /use\s+(\w+)/i,
  ];

  for (const pattern of actionPatterns) {
    const match = lower.match(pattern);
    if (match) keywords.push(match[1].trim());
  }

  // Extract technical terms
  const techTerms = lower.match(/\b(api|auth|rls|vram|model|route|deploy|build|test|lint|commit|push|config|env|port|database|supabase|stripe|tailwind|react|nextjs)\b/g);
  if (techTerms) keywords.push(...techTerms);

  return [...new Set(keywords)];
}

function groupByPattern(corrections) {
  const groups = {};

  for (const correction of corrections) {
    // Group by keyword similarity
    const key = correction.keywords.sort().join('+') || correction.text.slice(0, 40).toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(correction);
  }

  return groups;
}

// ── Rule Generation ─────────────────────────────────────────────

function generateRule(pattern, entries) {
  const allTexts = entries.map(e => e.text);
  const representative = allTexts[0]; // Use first occurrence as the primary rule text
  const allKeywords = [...new Set(entries.flatMap(e => e.keywords))];

  // Determine target file based on keywords
  let targetFile = 'CLAUDE.md';
  if (allKeywords.some(k => ['personality', 'tone', 'voice', 'communication'].includes(k))) {
    targetFile = '_system/SOUL.md';
  } else if (allKeywords.some(k => ['user', 'preference', 'personal'].includes(k))) {
    targetFile = '_system/USER.md';
  }

  return {
    rule: representative,
    occurrences: entries.length,
    allVersions: allTexts,
    keywords: allKeywords,
    targetFile,
    generatedAt: new Date().toISOString()
  };
}

// ── Staging Writer ──────────────────────────────────────────────

function writeStagingEntry(rule) {
  if (!fs.existsSync(STAGING)) fs.mkdirSync(STAGING, { recursive: true });

  const date = new Date().toISOString().split('T')[0];
  const d = new Date();
  const ts = `${date}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;
  const filename = `${ts}_system_auto-rule.md`;
  const filepath = path.join(STAGING, filename);

  const content = `---
date: ${date}
wiki: system
target_file: ${rule.targetFile}
action: append
priority: high
source_model: self-modifier
summary: Auto-promoted rule from ${rule.occurrences} corrections — "${rule.rule.slice(0, 60)}"
---

## Proposed Content

### Auto-Promoted Rule

**Rule:** ${rule.rule}

**Occurrences:** ${rule.occurrences} corrections with this pattern
**Keywords:** ${rule.keywords.join(', ')}
**Target file:** ${rule.targetFile}

${rule.allVersions.length > 1 ? `**All versions:**\n${rule.allVersions.map(v => `- ${v}`).join('\n')}` : ''}

## Context

This rule was auto-detected by the self-modification engine after appearing ${rule.occurrences}+ times in correction memory. It should be reviewed and either:
1. **Approved** — move to target file as a permanent rule
2. **Rejected** — move to _staging/rejected/ (the system will not re-propose it)

## Affected Files

- ${rule.targetFile}
`;

  fs.writeFileSync(filepath, content, 'utf8');
  return filepath;
}

// ── History Management ──────────────────────────────────────────

function readHistory() {
  try {
    return JSON.parse(fs.readFileSync(PROMOTION_LOG, 'utf8'));
  } catch {
    return { promoted: {}, rejected: {} };
  }
}

function writeHistory(history) {
  const dir = path.dirname(PROMOTION_LOG);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(PROMOTION_LOG, JSON.stringify(history, null, 2), 'utf8');
}

function markPromoted(pattern, stagingPath, occurrences) {
  const history = readHistory();
  if (!history.promoted) history.promoted = {};
  history.promoted[pattern] = {
    promotedAt: new Date().toISOString(),
    stagingPath,
    occurrences
  };
  writeHistory(history);
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'scan') {
    const results = scan();
    console.log('Self-Modifier Scan:');
    if (results.promotable.length > 0) {
      console.log(`\n  Promotable (${results.promotable.length}):`);
      for (const r of results.promotable) console.log(`    "${r.pattern}" — ${r.count} occurrences`);
    }
    if (results.approaching.length > 0) {
      console.log(`\n  Approaching threshold (${results.approaching.length}):`);
      for (const r of results.approaching) console.log(`    "${r.pattern}" — ${r.count}/${MIN_OCCURRENCES}`);
    }
    if (results.alreadyHandled.length > 0) {
      console.log(`\n  Already handled (${results.alreadyHandled.length}):`);
      for (const r of results.alreadyHandled) console.log(`    "${r.pattern}" — ${r.status}`);
    }
    if (results.promotable.length === 0 && results.approaching.length === 0) {
      console.log('  No correction patterns found in MEMORY.md');
    }

  } else if (cmd === 'promote') {
    const promoted = checkForPromotion();
    if (promoted.length === 0) {
      console.log('No patterns qualify for promotion.');
    } else {
      console.log(`Promoted ${promoted.length} pattern(s) to staging.`);
    }

  } else if (cmd === 'history') {
    const history = readHistory();
    const pCount = Object.keys(history.promoted || {}).length;
    const rCount = Object.keys(history.rejected || {}).length;
    console.log(`Promotion history: ${pCount} promoted, ${rCount} rejected`);
    for (const [pattern, data] of Object.entries(history.promoted || {})) {
      console.log(`  [PROMOTED] ${pattern} (${data.promotedAt.split('T')[0]})`);
    }
    for (const [pattern, data] of Object.entries(history.rejected || {})) {
      console.log(`  [REJECTED] ${pattern} (${data.rejectedAt.split('T')[0]})`);
    }

  } else if (cmd === 'learn') {
    const count = learnFromRejections();
    console.log(`Learned from ${count} rejected pattern(s).`);

  } else {
    console.log('Self-Modifier');
    console.log('  node self-modifier.js scan      — dry-run pattern scan');
    console.log('  node self-modifier.js promote    — promote qualifying patterns to staging');
    console.log('  node self-modifier.js history    — show promotion/rejection history');
    console.log('  node self-modifier.js learn      — learn from rejected staging entries');
  }
}

module.exports = { checkForPromotion, scan, learnFromRejections };
