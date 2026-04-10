/**
 * OpenClaw Knowledge Accelerator
 * External learning pipeline — researches cutting-edge patterns, distills into wiki staging + learning briefs.
 *
 * Designed to run as a Claude Code scheduled task (Sunday 9 AM).
 * Claude Code executes the research via WebSearch, then this script distills and outputs.
 *
 * Two modes:
 *   1. `node knowledge-accelerator.js queries`  — prints search queries for Claude Code to execute
 *   2. `node knowledge-accelerator.js distill <results.json>` — distills raw results into staging + brief
 *   3. `node knowledge-accelerator.js run` — prints the full prompt for Claude Code scheduled task
 *
 * Zero external dependencies. Pure fs + path.
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const OPENCLAW = config.paths.root;
const WIKI = path.join(OPENCLAW, 'wiki');
const STAGING = path.join(WIKI, '_staging', 'pending');
const BRIEFS = path.join(OPENCLAW, 'workspace', 'briefs');

// ── Research Domain Config ──────────────────────────────────────

const DOMAINS = {
  'full-stack': {
    label: 'Full-Stack Patterns',
    queries: [
      'Next.js {year} best practices server components app router',
      'React {year} performance patterns optimization techniques',
      'Supabase {year} new features edge functions realtime',
      'Tailwind CSS {year} new features utilities'
    ],
    wikiTarget: 'technical/stack/',
    relevantProjects: ['contractor-vault', 'rate-shield', 'permit-iq', 'edgevault']
  },
  'ai-engineering': {
    label: 'AI Engineering',
    queries: [
      'AI agent architecture patterns {year} autonomous',
      'MCP model context protocol server design {year}',
      'local LLM optimization Ollama VRAM {year}',
      'Claude API tool use advanced patterns {year}'
    ],
    wikiTarget: 'technical/openclaw/',
    relevantProjects: ['openclaw']
  },
  'saas-architecture': {
    label: 'SaaS Architecture',
    queries: [
      'multi-tenant SaaS architecture patterns {year}',
      'Stripe billing integration best practices {year}',
      'usage-based pricing implementation SaaS',
      'serverless edge computing patterns {year}'
    ],
    wikiTarget: 'technical/patterns/',
    relevantProjects: ['contractor-vault', 'rate-shield', 'permit-iq']
  },
  'business-growth': {
    label: 'Business & Market',
    queries: [
      'bootstrapped SaaS go-to-market strategy {year}',
      'contractor software market trends {year}',
      'AI automation consulting revenue model {year}',
      'Ontario home renovation digital tools market'
    ],
    wikiTarget: 'business/reference/markets/',
    relevantProjects: ['golden-maple', 'red-wolf-consulting']
  },
  'cybersecurity': {
    label: 'Cybersecurity',
    queries: [
      'web application security best practices {year} OWASP',
      'SaaS security architecture zero trust {year}',
      'API security authentication patterns {year}',
      'supply chain security npm dependencies {year}'
    ],
    wikiTarget: 'technical/infrastructure/',
    relevantProjects: ['openclaw', 'contractor-vault', 'edgevault']
  },
  'web-design': {
    label: 'Web Design & UX',
    queries: [
      'web design trends {year} modern UI patterns',
      'landing page conversion optimization {year}',
      'mobile-first responsive design best practices {year}',
      'contractor website design portfolio examples {year}'
    ],
    wikiTarget: 'business/reference/',
    relevantProjects: ['golden-maple', 'contractor-tool-shop']
  },
  'outdoor-living': {
    label: 'Outdoor Living & Landscaping',
    queries: [
      'landscaping business trends {year} Canada',
      'outdoor living design trends {year} hardscaping',
      'landscape estimating software tools {year}',
      'seasonal landscaping marketing strategies {year}'
    ],
    wikiTarget: 'business/projects/golden-maple/',
    relevantProjects: ['golden-maple', 'synkops']
  },
  'ai-skills': {
    label: 'AI Skills & Prompting',
    queries: [
      'advanced prompt engineering techniques {year}',
      'AI coding assistant tips productivity {year}',
      'Claude Code advanced workflows {year}',
      'AI automation no-code workflows {year}'
    ],
    wikiTarget: 'technical/patterns/',
    relevantProjects: ['openclaw', 'ai-elite']
  },
  'ai-breakthroughs': {
    label: 'AI Latest & Greatest',
    queries: [
      'latest AI model releases {year} capabilities',
      'AI use cases business automation {year}',
      'open source AI models local inference {year}',
      'AI agent real world production use cases {year}'
    ],
    wikiTarget: 'technical/openclaw/',
    relevantProjects: ['openclaw', 'ai-elite']
  },
  'business-ops': {
    label: 'Business Operations',
    queries: [
      'solo founder business scaling strategies {year}',
      'small business automation tools {year}',
      'revenue diversification strategies bootstrapped {year}',
      'Canadian small business tax optimization {year}'
    ],
    wikiTarget: 'business/reference/',
    relevantProjects: ['golden-maple', 'red-wolf-consulting']
  },
  'github-trending': {
    label: 'GitHub Trending & Open Source',
    queries: [
      'GitHub trending repositories Next.js Supabase this week',
      'GitHub trending TypeScript React projects {year}',
      'GitHub trending AI agent frameworks open source {year}',
      'new open source developer tools {year} trending'
    ],
    wikiTarget: 'technical/patterns/',
    relevantProjects: ['openclaw', 'contractor-vault', 'edgevault']
  }
};

// ── Helpers ──────────────────────────────────────────────────────

function getYear() {
  return new Date().getFullYear();
}

function getDate() {
  return new Date().toISOString().split('T')[0];
}

function getTimestamp() {
  const d = new Date();
  return `${getDate()}_${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}`;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Query Generation ────────────────────────────────────────────

function generateQueries() {
  const year = getYear();
  const output = {};
  for (const [domain, config] of Object.entries(DOMAINS)) {
    output[domain] = {
      label: config.label,
      queries: config.queries.map(q => q.replace('{year}', year)),
      relevantProjects: config.relevantProjects
    };
  }
  return output;
}

// ── Staging Entry Writer ──��─────────────────────────────────────

function writeStagingEntry(findings) {
  ensureDir(STAGING);
  const ts = getTimestamp();
  const filename = `${ts}_technical_knowledge-accelerator.md`;
  const filepath = path.join(STAGING, filename);

  const sections = [];
  for (const [domain, data] of Object.entries(findings)) {
    const config = DOMAINS[domain];
    if (!config || !data.items || data.items.length === 0) continue;

    sections.push(`### ${config.label}`);
    for (const item of data.items) {
      sections.push(`- **${item.type}:** ${item.title} — ${item.summary}`);
      if (item.actionable) sections.push(`  - Action: ${item.actionable}`);
    }
    sections.push('');
  }

  if (sections.length === 0) {
    console.log('[knowledge-accelerator] No findings to stage.');
    return null;
  }

  const content = `---
date: ${getDate()}
wiki: technical
target_file: technical/patterns/external-learnings.md
action: append
priority: medium
source_model: claude-code
summary: Weekly knowledge accelerator — external patterns and techniques
---

## Proposed Content

# Knowledge Accelerator — ${getDate()}

${sections.join('\n')}

## Context

Auto-generated by the Knowledge Accelerator scheduled task.
These findings come from web research across ${Object.keys(findings).length} domains.
Review and approve actionable items for integration into the wiki.

## Affected Files

${Object.values(DOMAINS).map(d => `- ${d.wikiTarget}`).join('\n')}
`;

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`[knowledge-accelerator] Staging entry: ${filename}`);
  return filepath;
}

// ── Learning Brief Writer ──────────��────────────────────────────

function writeLearningBrief(findings) {
  ensureDir(BRIEFS);
  const date = getDate();
  const filename = `${date}_learning-brief.md`;
  const filepath = path.join(BRIEFS, filename);

  const domainSections = [];
  const actionItems = [];
  const sources = [];
  const takeaways = [];

  for (const [domain, data] of Object.entries(findings)) {
    const config = DOMAINS[domain];
    if (!config || !data.items || data.items.length === 0) continue;

    const lines = [`## ${config.label}`];
    const newItems = data.items.filter(i => i.type === 'pattern' || i.type === 'tool');
    const antiPatterns = data.items.filter(i => i.type === 'anti-pattern');
    const migrations = data.items.filter(i => i.type === 'migration');

    if (newItems.length > 0) {
      lines.push('### New This Week');
      for (const item of newItems) {
        lines.push(`- **${item.title}**: ${item.summary}`);
        if (item.actionable) actionItems.push(`- [ ] ${item.actionable} (${config.label})`);
      }
    }
    if (antiPatterns.length > 0) {
      lines.push('### Avoid');
      for (const item of antiPatterns) {
        lines.push(`- **${item.title}**: ${item.summary}`);
      }
    }
    if (migrations.length > 0) {
      lines.push('### Migration Watch');
      for (const item of migrations) {
        lines.push(`- **${item.title}**: ${item.summary}`);
        if (item.actionable) actionItems.push(`- [ ] ${item.actionable} (${config.label})`);
      }
    }

    // Top takeaway per domain
    if (data.items.length > 0) {
      takeaways.push(`- ${config.label}: ${data.items[0].summary}`);
    }

    if (data.sources) sources.push(...data.sources);
    domainSections.push(lines.join('\n'));
  }

  const content = `---
title: Weekly Learning Brief
date: ${date}
domains: ${Object.keys(findings).join(', ')}
generated_by: knowledge-accelerator
---

# Learning Brief — Week of ${date}

## Key Takeaways
${takeaways.length > 0 ? takeaways.join('\n') : '- No significant findings this week'}

${domainSections.join('\n\n')}

## Action Items
${actionItems.length > 0 ? actionItems.join('\n') : '- No immediate actions this week'}

## Sources
${sources.length > 0 ? sources.map(s => `- ${s}`).join('\n') : '- See staging entry for full references'}
`;

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`[knowledge-accelerator] Brief: ${filename}`);
  return filepath;
}

// ── Log to shared context ───────���───────────────────────────────

function feedSpacedRepetition(findings) {
  try {
    const sr = require(path.join(OPENCLAW, 'spaced-repetition'));
    const allItems = [];
    for (const [domain, data] of Object.entries(findings)) {
      if (!data.items) continue;
      for (const item of data.items) {
        allItems.push({ ...item, domain });
      }
    }
    const count = sr.addFindings(allItems);
    console.log(`[knowledge-accelerator] Fed ${allItems.length} findings to spaced repetition (${count} total active)`);
  } catch (err) {
    console.log(`[knowledge-accelerator] Spaced repetition feed skipped: ${err.message}`);
  }
}

function logActivity(stagingPath, briefPath) {
  try {
    const sc = require(path.join(OPENCLAW, 'shared-context'));
    sc.logEntry({
      platform: 'scheduled',
      type: 'task_completed',
      summary: `Knowledge Accelerator: generated learning brief and wiki staging entry`,
      details: JSON.stringify({ staging: stagingPath, brief: briefPath })
    });
  } catch {}
}

// ── Prompt Generator (for Claude Code scheduled task) ───────────

function generateTaskPrompt() {
  const queries = generateQueries();
  const year = getYear();

  return `# Knowledge Accelerator — Weekly Research Cycle

You are running the OpenClaw Knowledge Accelerator. Your job is to research cutting-edge patterns across 4 domains, distill actionable findings, and output them for Yorkis.

## Step 1: Research

For each domain below, run 2-3 WebSearch queries and collect the most relevant, actionable findings.

${Object.entries(queries).map(([domain, data]) => `### ${data.label}
Queries:
${data.queries.map(q => `- "${q}"`).join('\n')}
Relevant projects: ${data.relevantProjects.join(', ')}`).join('\n\n')}

## Step 2: Distill

For each domain, extract findings in these categories:
- **pattern**: New architectural pattern or technique worth adopting
- **tool**: New tool/library worth evaluating
- **anti-pattern**: Common mistake or outdated practice to avoid
- **migration**: Breaking change or major version update in tools Yorkis uses

For each finding, provide:
- title: Short name (3-6 words)
- type: pattern | tool | anti-pattern | migration
- summary: 1-2 sentences — what it is and why it matters to Yorkis's stack
- actionable: Optional — specific thing to try in a specific project

## Step 3: Write Outputs

Save the distilled findings as a JSON file, then run:
\`\`\`bash
node knowledge-accelerator.js distill <path-to-results.json>
\`\`\`

The results JSON format:
\`\`\`json
{
  "full-stack": {
    "items": [
      { "type": "pattern", "title": "...", "summary": "...", "actionable": "..." }
    ],
    "sources": ["https://..."]
  },
  "ai-engineering": { ... },
  "saas-architecture": { ... },
  "business-growth": { ... }
}
\`\`\`

This will generate:
1. A wiki staging entry in \`wiki/_staging/pending/\`
2. A learning brief in \`workspace/briefs/\`
3. A session-log entry

## Step 4: Report

Tell Yorkis what was found. Highlight the top 3 most actionable findings across all domains.
Focus on what's relevant to active projects: EdgeVault, OpenClaw, the Ontario portfolio, Golden Maple.
`;
}

// ── CLI ─────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === 'queries') {
  const queries = generateQueries();
  console.log(JSON.stringify(queries, null, 2));
} else if (command === 'distill') {
  const resultsPath = process.argv[3];
  if (!resultsPath) {
    console.error('Usage: node knowledge-accelerator.js distill <results.json>');
    process.exit(1);
  }
  try {
    const findings = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const stagingPath = writeStagingEntry(findings);
    const briefPath = writeLearningBrief(findings);
    feedSpacedRepetition(findings);
    logActivity(stagingPath, briefPath);
    console.log('[knowledge-accelerator] Done.');
  } catch (err) {
    console.error('[knowledge-accelerator] Error:', err.message);
    process.exit(1);
  }
} else if (command === 'run') {
  console.log(generateTaskPrompt());
} else {
  // Default: print queries for quick reference
  const queries = generateQueries();
  const year = getYear();
  console.log('=== KNOWLEDGE ACCELERATOR ===');
  console.log(`Year: ${year} | Domains: ${Object.keys(queries).length}`);
  console.log('');
  for (const [domain, data] of Object.entries(queries)) {
    console.log(`[${data.label}]`);
    for (const q of data.queries) console.log(`  → ${q}`);
    console.log(`  Projects: ${data.relevantProjects.join(', ')}`);
    console.log('');
  }
  console.log('Commands:');
  console.log('  node knowledge-accelerator.js queries    → JSON query list');
  console.log('  node knowledge-accelerator.js distill X  → process results file');
  console.log('  node knowledge-accelerator.js run        → full task prompt');
}
