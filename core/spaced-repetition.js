/**
 * OpenClaw Spaced Repetition Engine
 * Resurfaces key findings at optimal intervals: 1, 3, 7, 14 days.
 *
 * How it works:
 *   1. knowledge-accelerator.js distill calls `addFindings(items)` after each run
 *   2. daily-digest.js calls `getDueReviews()` each morning
 *   3. Findings are surfaced at day 1, 3, 7, 14 — then archived
 *   4. If Yorkis marks something as "learned" via Telegram, it skips future intervals
 *
 * Storage: spaced-repetition.json (flat file, no dependencies)
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const OPENCLAW = config.paths.root;
const SR_PATH = path.join(OPENCLAW, 'spaced-repetition.json');
const INTERVALS = [1, 3, 7, 14]; // days

// ── Read/Write Store ────────────────────────────────────────────

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(SR_PATH, 'utf8'));
  } catch {
    return { items: [], archived: [] };
  }
}

function writeStore(store) {
  const tmp = SR_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmp, SR_PATH);
}

// ── Core API ────────────────────────────────────────────────────

/**
 * Add new findings to the repetition queue.
 * Called by knowledge-accelerator.js after distill.
 * @param {Array} items - [{title, summary, domain, actionable, type}]
 */
function addFindings(items) {
  const store = readStore();
  const now = new Date().toISOString();

  for (const item of items) {
    // Deduplicate by title
    if (store.items.some(i => i.title === item.title)) continue;

    store.items.push({
      id: `sr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: item.title,
      summary: item.summary,
      domain: item.domain || 'unknown',
      actionable: item.actionable || null,
      type: item.type || 'pattern',
      addedAt: now,
      intervalIndex: 0, // next review at INTERVALS[0] = day 1
      nextReview: addDays(now, INTERVALS[0]),
      reviewCount: 0,
      status: 'active' // active | learned | archived
    });
  }

  writeStore(store);
  return store.items.length;
}

/**
 * Get findings due for review today.
 * Called by daily-digest.js each morning.
 * @returns {Array} items due for review
 */
function getDueReviews() {
  const store = readStore();
  const today = new Date().toISOString().split('T')[0];

  const due = store.items.filter(item => {
    if (item.status !== 'active') return false;
    const reviewDate = item.nextReview.split('T')[0];
    return reviewDate <= today;
  });

  return due;
}

/**
 * Advance a finding to the next interval after review.
 * Called after the finding is surfaced in the digest.
 * @param {string} itemId
 */
function markReviewed(itemId) {
  const store = readStore();
  const item = store.items.find(i => i.id === itemId);
  if (!item) return;

  item.reviewCount++;
  item.intervalIndex++;

  if (item.intervalIndex >= INTERVALS.length) {
    // All intervals complete — archive
    item.status = 'archived';
    store.archived.push(item);
    store.items = store.items.filter(i => i.id !== itemId);
  } else {
    item.nextReview = addDays(new Date().toISOString(), INTERVALS[item.intervalIndex]);
  }

  writeStore(store);
}

/**
 * Mark a finding as learned — skip remaining intervals.
 * @param {string} itemId
 */
function markLearned(itemId) {
  const store = readStore();
  const item = store.items.find(i => i.id === itemId);
  if (!item) return;

  item.status = 'learned';
  store.archived.push(item);
  store.items = store.items.filter(i => i.id !== itemId);
  writeStore(store);
}

/**
 * Auto-advance all due items (for unattended daily runs).
 * Surfaces them and bumps to next interval.
 */
function processDaily() {
  const due = getDueReviews();
  for (const item of due) {
    markReviewed(item.id);
  }
  return due;
}

/**
 * Format due reviews for the morning digest.
 * @returns {string} markdown section for digest
 */
function formatForDigest() {
  const due = getDueReviews();
  if (due.length === 0) return '';

  const lines = ['\n*Spaced Repetition — Review These*'];
  for (const item of due) {
    const interval = INTERVALS[item.intervalIndex];
    const tag = `Day ${interval}`;
    lines.push(`→ [${tag}] ${item.title}: ${item.summary}`);
    if (item.actionable) lines.push(`  Action: ${item.actionable}`);
  }

  // Auto-advance after formatting (they've been surfaced)
  processDaily();

  return lines.join('\n');
}

/**
 * Get stats for reporting.
 */
function getStats() {
  const store = readStore();
  return {
    active: store.items.length,
    archived: store.archived.length,
    dueToday: getDueReviews().length
  };
}

// ── Helpers ─────────────────────────────────────────────────────

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'due') {
    const due = getDueReviews();
    if (due.length === 0) {
      console.log('No reviews due today.');
    } else {
      console.log(`${due.length} review(s) due:`);
      for (const item of due) {
        console.log(`  [Day ${INTERVALS[item.intervalIndex]}] ${item.title}`);
        console.log(`    ${item.summary}`);
      }
    }
  } else if (cmd === 'stats') {
    const stats = getStats();
    console.log(`Active: ${stats.active} | Archived: ${stats.archived} | Due today: ${stats.dueToday}`);
  } else if (cmd === 'digest') {
    const output = formatForDigest();
    console.log(output || 'No reviews due.');
  } else {
    console.log('Spaced Repetition Engine');
    console.log('  node spaced-repetition.js due     — show due reviews');
    console.log('  node spaced-repetition.js stats   — show stats');
    console.log('  node spaced-repetition.js digest  — format for morning digest');
  }
}

module.exports = {
  addFindings,
  getDueReviews,
  markReviewed,
  markLearned,
  processDaily,
  formatForDigest,
  getStats
};
