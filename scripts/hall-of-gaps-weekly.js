#!/usr/bin/env node

/**
 * hall-of-gaps-weekly.js — Rotates through topics and runs the scanner weekly.
 *
 * Each run picks the next topic from content/hall-of-gaps-topics.json,
 * invokes scripts/hall-of-gaps.js against that topic, archives the previous
 * report, and creates a blog post version that the SEO blog builder picks up.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TOPICS_PATH = path.join(REPO_ROOT, 'content', 'hall-of-gaps-topics.json');
const REPORT_PATH = path.join(REPO_ROOT, 'content', 'hall-of-gaps.md');
const ARCHIVE_DIR = path.join(REPO_ROOT, 'content', 'hall-of-gaps-archive');
const BLOG_DIR = path.join(REPO_ROOT, 'content', 'blog');
const HALL_SCRIPT = path.join(REPO_ROOT, 'scripts', 'hall-of-gaps.js');
const AXIOM_CHECK = path.join(REPO_ROOT, '..', 'axiom-check', 'index.js');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function pickNextTopic(state) {
  const idx = state.current_index % state.topics.length;
  const topic = state.topics[idx];
  state.current_index = (idx + 1) % state.topics.length;
  state.last_run = new Date().toISOString();
  return topic;
}

function archivePreviousReport(topicName) {
  if (!fs.existsSync(REPORT_PATH)) return;
  ensureDir(ARCHIVE_DIR);
  const date = new Date().toISOString().split('T')[0];
  const archivePath = path.join(ARCHIVE_DIR, `${date}-${topicName}.md`);
  fs.copyFileSync(REPORT_PATH, archivePath);
  console.log(`[weekly] Archived previous report to ${path.relative(REPO_ROOT, archivePath)}`);
}

function createBlogPostFromReport(topic) {
  if (!fs.existsSync(REPORT_PATH)) return;
  const report = fs.readFileSync(REPORT_PATH, 'utf8');
  const date = new Date().toISOString().split('T')[0];
  const slug = `${date}-hall-of-gaps-${topic.name}`;
  const blogPath = path.join(BLOG_DIR, `${slug}.md`);

  const frontmatter = `---
date: ${date}
title: "Hall of Gaps: Top ${topic.label} Repos on GitHub — ${date}"
description: "Weekly scan of the top ${topic.label} repos on GitHub for 2026 best-practice gaps. Real data, actionable findings."
tags: [${topic.name}, code-quality, best-practices, opensource]
canonical_url: https://axiom-ai.netlify.app/blog/posts/${slug}.html
---

`;
  ensureDir(BLOG_DIR);
  fs.writeFileSync(blogPath, frontmatter + report, 'utf8');
  console.log(`[weekly] Created blog post: ${path.relative(REPO_ROOT, blogPath)}`);
}

function main() {
  console.log('[weekly] Starting weekly Hall of Gaps rotation');

  if (!fs.existsSync(TOPICS_PATH)) {
    console.error(`[weekly] Topics file missing: ${TOPICS_PATH}`);
    process.exit(1);
  }

  const state = loadJson(TOPICS_PATH);
  if (!state.topics || state.topics.length === 0) {
    console.error('[weekly] No topics configured');
    process.exit(1);
  }

  const topic = pickNextTopic(state);
  console.log(`[weekly] This week's topic: ${topic.label} (${topic.name})`);

  // Archive before overwriting
  archivePreviousReport(topic.name);

  // Delegate to the existing hall-of-gaps.js
  const args = [
    HALL_SCRIPT,
    '--topic', topic.name,
    '--limit', '50',
    '--axiom-check', AXIOM_CHECK
  ];
  console.log('[weekly] Running:', 'node', args.join(' '));

  try {
    execSync(`node ${args.map(a => `"${a}"`).join(' ')}`, {
      stdio: 'inherit',
      cwd: REPO_ROOT
    });
  } catch (err) {
    console.error('[weekly] Hall of Gaps scan failed');
    // Still save state so we don't retry the same topic immediately
    saveJson(TOPICS_PATH, state);
    process.exit(1);
  }

  // Generate blog post version
  createBlogPostFromReport(topic);

  // Save rotation state
  saveJson(TOPICS_PATH, state);
  console.log(`[weekly] Next week's topic: ${state.topics[state.current_index].label}`);
}

if (require.main === module) main();
