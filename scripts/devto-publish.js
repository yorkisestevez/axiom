#!/usr/bin/env node

/**
 * devto-publish.js — Publish the next unpublished article to Dev.to.
 *
 * Usage:
 *   node scripts/devto-publish.js             # Publish the next article
 *   node scripts/devto-publish.js --dry-run   # Show what would be published
 *
 * Required env vars:
 *   DEVTO_API_KEY — generate at dev.to/settings/extensions
 *
 * Articles live in content/devto/*.md as markdown files with YAML frontmatter:
 *
 *   ---
 *   title: "Article Title"
 *   description: "Short summary for SEO"
 *   tags: [tag1, tag2, tag3, tag4]
 *   canonical_url: "https://yoursite.com/post/..."
 *   cover_image: "https://..."
 *   ---
 *   # Article body here
 *
 * State tracked in content/devto-state.json — already-published files are skipped.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(REPO_ROOT, 'content', 'devto');
const STATE_PATH = path.join(REPO_ROOT, 'content', 'devto-state.json');

const DRY_RUN = process.argv.includes('--dry-run');

function loadJson(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: raw };
  }
  const yaml = match[1];
  const body = match[2];
  const frontmatter = {};
  const lines = yaml.split('\n');
  for (const line of lines) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/i);
    if (!m) continue;
    const key = m[1].trim();
    let value = m[2].trim();
    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Parse arrays (simple: [a, b, c])
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body };
}

function findNextArticle(state) {
  if (!fs.existsSync(ARTICLES_DIR)) {
    throw new Error(`Articles directory not found: ${ARTICLES_DIR}`);
  }
  const published = new Set((state.published || []).map(a => a.file));
  const files = fs.readdirSync(ARTICLES_DIR)
    .filter(f => f.endsWith('.md'))
    .sort();
  return files.find(f => !published.has(f)) || null;
}

async function main() {
  const state = loadJson(STATE_PATH, { published: [], lastPublishedAt: null });
  const nextFile = findNextArticle(state);

  if (!nextFile) {
    console.log('[devto-publish] No unpublished articles remaining.');
    console.log(`[devto-publish] Add more to ${path.relative(REPO_ROOT, ARTICLES_DIR)}/ to continue.`);
    return;
  }

  const fullPath = path.join(ARTICLES_DIR, nextFile);
  const raw = fs.readFileSync(fullPath, 'utf8');
  const { frontmatter, body } = parseFrontmatter(raw);

  if (!frontmatter.title) {
    console.error(`[devto-publish] ✗ ${nextFile} missing title in frontmatter`);
    process.exit(1);
  }

  console.log(`[devto-publish] Next article: ${nextFile}`);
  console.log('─'.repeat(60));
  console.log('Title:', frontmatter.title);
  console.log('Description:', frontmatter.description || '(none)');
  console.log('Tags:', Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : frontmatter.tags || '(none)');
  console.log('Canonical:', frontmatter.canonical_url || '(none)');
  console.log('Body length:', body.length, 'chars');
  console.log('─'.repeat(60));

  if (DRY_RUN) {
    console.log('\n[devto-publish] DRY RUN — not publishing.');
    return;
  }

  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) {
    console.error('[devto-publish] Missing DEVTO_API_KEY env var.');
    console.error('  Generate one at https://dev.to/settings/extensions');
    process.exit(1);
  }

  const payload = {
    article: {
      title: frontmatter.title,
      body_markdown: body,
      published: true,
      tags: Array.isArray(frontmatter.tags)
        ? frontmatter.tags.slice(0, 4)  // Dev.to max 4 tags
        : (typeof frontmatter.tags === 'string' ? frontmatter.tags.split(',').map(t => t.trim()).slice(0, 4) : []),
      description: frontmatter.description || '',
      ...(frontmatter.canonical_url && { canonical_url: frontmatter.canonical_url }),
      ...(frontmatter.cover_image && { main_image: frontmatter.cover_image }),
      ...(frontmatter.series && { series: frontmatter.series })
    }
  };

  try {
    const res = await fetch('https://dev.to/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Accept': 'application/vnd.forem.api-v1+json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[devto-publish] ✗ Dev.to returned ${res.status}`);
      console.error('  Response:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log(`[devto-publish] ✓ Published: ${data.url || '(no URL in response)'}`);
    console.log(`  ID: ${data.id}`);

    if (!state.published) state.published = [];
    state.published.push({
      file: nextFile,
      id: data.id,
      url: data.url,
      title: frontmatter.title,
      publishedAt: new Date().toISOString()
    });
    state.lastPublishedAt = new Date().toISOString();
    saveJson(STATE_PATH, state);
    console.log(`[devto-publish] State updated (${state.published.length} total published)`);
  } catch (err) {
    console.error(`[devto-publish] ✗ Request failed: ${err.message}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[devto-publish] Unexpected error:', err);
  process.exit(1);
});
