/**
 * daily-digest.js
 * Safer Yorkis-approved daily brief generator.
 *
 * Behavior:
 * - Reads local context/decision/project files
 * - Builds a concise morning brief locally
 * - If Telegram env vars exist, can send the brief directly
 * - If they do not exist, prints the brief to stdout
 *
 * Default design keeps things dependable and low-risk.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const config = require('./config');
const OPENCLAW_DIR = process.env.OPENCLAW_DIR || config.paths.root;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TRUSTED_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

function readIfExists(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function listProjectFiles() {
  const projectsDir = path.join(OPENCLAW_DIR, 'projects');
  if (!fs.existsSync(projectsDir)) return [];
  return fs.readdirSync(projectsDir)
    .filter((f) => f.endsWith('.md') && f !== 'PROJECT_TEMPLATE.md')
    .map((f) => path.join(projectsDir, f));
}

function extractSection(markdown, sectionTitle) {
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`, 'm'));
  return match ? match[1].trim() : '';
}

function firstMeaningfulLine(text) {
  return String(text)
    .split('\n')
    .map((x) => x.trim())
    .find((x) => x && !x.startsWith('#')) || 'No current status recorded';
}

function buildBrief() {
  const context = readIfExists(path.join(OPENCLAW_DIR, 'CONTEXT.md'));
  const decisions = readIfExists(path.join(OPENCLAW_DIR, 'DECISIONS.md'));
  const projects = listProjectFiles();

  const projectLines = projects.map((filePath) => {
    const name = path.basename(filePath, '.md');
    const content = readIfExists(filePath);
    const status = firstMeaningfulLine(extractSection(content, 'Current Status'));
    const next = firstMeaningfulLine(extractSection(content, 'Next Actions'));
    return `- ${name} -> ${status} -> next: ${next}`;
  });

  const openLoops = extractSection(context, 'Open Loops') || 'None recorded';
  const top3 = extractSection(context, 'Top 3 Right Now') || '1. No top priorities recorded';

  const recentDecisionLines = decisions
    .split('\n')
    .map((x) => x.trim())
    .filter((x) => x.startsWith('- '))
    .slice(-3);

  const needsDecision = recentDecisionLines.length
    ? recentDecisionLines.map((x) => `- ${x.replace(/^-\s*/, '')}`).join('\n')
    : 'None';

  // Marketing intelligence section
  let marketingSection = '';
  try {
    const { buildMarketingSection } = require('./skills/daily-digest-marketing');
    marketingSection = buildMarketingSection();
  } catch (err) {
    // Marketing skills not yet initialized — skip silently
  }

  // Spaced repetition reviews
  let spacedRepSection = '';
  try {
    const sr = require('./spaced-repetition');
    spacedRepSection = sr.formatForDigest();
  } catch {}

  // Failure watch
  let failureSection = '';
  try {
    const fr = require('./failure-replay');
    failureSection = fr.formatForDigest();
  } catch {}

  // Skill registry stats
  let skillSection = '';
  try {
    const sr = require('./skill-registry');
    skillSection = sr.formatForDigest();
  } catch {}

  // Check for recent learning brief
  let learningSection = '';
  try {
    const briefsDir = path.join(OPENCLAW_DIR, 'workspace', 'briefs');
    if (fs.existsSync(briefsDir)) {
      const briefs = fs.readdirSync(briefsDir)
        .filter(f => f.endsWith('_learning-brief.md'))
        .sort()
        .reverse();
      if (briefs.length > 0) {
        const latest = briefs[0];
        const age = Date.now() - fs.statSync(path.join(briefsDir, latest)).mtimeMs;
        if (age < 7 * 24 * 60 * 60 * 1000) { // within last 7 days
          learningSection = `\n\n*Learning Brief Available*\n→ workspace/briefs/${latest}`;
        }
      }
    }
  } catch {}

  return [
    '*MORNING BRIEF*',
    '',
    '*Active Projects*',
    projectLines.length ? projectLines.join('\n') : '- None recorded',
    '',
    '*Open Loops*',
    openLoops,
    '',
    '*Top 3 Today*',
    top3,
    '',
    '*Needs Your Decision*',
    needsDecision,
    marketingSection,
    spacedRepSection,
    failureSection,
    skillSection,
    learningSection,
  ].join('\n');
}

function sendTelegram(message) {
  // Silent — log only, no Telegram notifications
  console.log('[daily-digest] Brief generated (not sent to Telegram)');
  return Promise.resolve({ ok: true, silent: true });
}

async function main() {
  const brief = buildBrief();
  console.log(brief);
  await sendTelegram(brief);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('[daily-digest] Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  buildBrief,
  sendTelegram,
};
