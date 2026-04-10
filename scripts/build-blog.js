#!/usr/bin/env node

/**
 * build-blog.js — Build static SEO blog from markdown sources.
 *
 * Reads markdown files from content/blog/*.md with YAML frontmatter,
 * converts them to HTML, generates:
 *   - site/blog/index.html (blog listing)
 *   - site/blog/posts/<slug>.html (individual posts)
 *   - site/sitemap.xml (SEO sitemap)
 *
 * Zero external deps — includes a minimal markdown-to-HTML converter.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(REPO_ROOT, 'content', 'blog');
const BLOG_DIR = path.join(REPO_ROOT, 'site', 'blog');
const POSTS_DIR = path.join(BLOG_DIR, 'posts');
const SITEMAP_PATH = path.join(REPO_ROOT, 'site', 'sitemap.xml');
const BASE_URL = 'https://axiom-ai.netlify.app';

// ── Frontmatter parser ─────────────────────────────────────────

function parseFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw };

  const yaml = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of yaml.split('\n')) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/i);
    if (!m) continue;
    let [, key, value] = m;
    value = value.trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body };
}

// ── Minimal markdown -> HTML converter ─────────────────────────

function mdToHtml(md) {
  // Strip frontmatter if still present
  md = md.replace(/^---[\s\S]*?---\n/, '').trim();

  // Placeholder code blocks to protect them from other transforms
  const codeBlocks = [];
  md = md.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeBlocks.push({ lang: lang || '', code: escapeHtml(code) }) - 1;
    return `\x00CODEBLOCK${idx}\x00`;
  });

  // Inline code placeholders
  const inlineCode = [];
  md = md.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = inlineCode.push(escapeHtml(code)) - 1;
    return `\x00INLINE${idx}\x00`;
  });

  // Headers
  md = md.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  md = md.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  md = md.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold + italic
  md = md.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Images: ![alt](url)
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');

  // Links: [text](url)
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Tables (basic)
  md = md.replace(/(\|.+\|\n\|[\s|:-]+\|\n(?:\|.+\|\n?)+)/g, (table) => {
    const rows = table.trim().split('\n');
    const header = rows[0].slice(1, -1).split('|').map(c => c.trim());
    const body = rows.slice(2).map(r => r.slice(1, -1).split('|').map(c => c.trim()));
    let html = '<table><thead><tr>';
    for (const h of header) html += `<th>${h}</th>`;
    html += '</tr></thead><tbody>';
    for (const row of body) {
      html += '<tr>';
      for (const cell of row) html += `<td>${cell}</td>`;
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  });

  // Unordered lists
  md = md.replace(/(^[\-*] .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^[\-*] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  md = md.replace(/(^\d+\. .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Horizontal rules
  md = md.replace(/^---$/gm, '<hr>');

  // Blockquotes
  md = md.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Paragraphs: double newlines become <p> blocks, but don't wrap already-HTML lines
  const blocks = md.split(/\n\n+/);
  md = blocks.map(b => {
    const trimmed = b.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<')) return trimmed;
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  }).join('\n');

  // Restore code blocks
  md = md.replace(/\x00CODEBLOCK(\d+)\x00/g, (_, idx) => {
    const { lang, code } = codeBlocks[idx];
    return `<pre><code class="language-${lang}">${code}</code></pre>`;
  });

  // Restore inline code
  md = md.replace(/\x00INLINE(\d+)\x00/g, (_, idx) => `<code>${inlineCode[idx]}</code>`);

  return md;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Post template ─────────────────────────────────────────────

function renderPost({ frontmatter, bodyHtml, slug }) {
  const title = frontmatter.title || 'Untitled';
  const description = frontmatter.description || '';
  const date = frontmatter.date || new Date().toISOString().split('T')[0];
  const canonical = `${BASE_URL}/blog/posts/${slug}.html`;
  const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(', ') : (frontmatter.tags || '');
  const ogImage = `${BASE_URL}/assets/og-image.svg`;

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    datePublished: date,
    author: {
      '@type': 'Person',
      name: 'Yorkis Estevez',
      url: 'https://github.com/yorkisestevez'
    },
    publisher: {
      '@type': 'Organization',
      name: 'Axiom',
      url: BASE_URL
    },
    image: ogImage,
    mainEntityOfPage: canonical
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} // Axiom Blog</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="keywords" content="${escapeHtml(tags)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="article:published_time" content="${date}">
  <meta property="article:author" content="Yorkis Estevez">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${ogImage}">
  <script type="application/ld+json">${jsonLd}</script>
  <link rel="stylesheet" href="../blog.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <nav class="blog-nav">
    <a href="/" class="brand">AXIOM_OS</a>
    <div class="links">
      <a href="/">Home</a>
      <a href="/blog/">Blog</a>
      <a href="https://github.com/yorkisestevez/axiom">GitHub</a>
    </div>
  </nav>

  <main class="blog-post">
    <article>
      <header class="post-header">
        <div class="post-meta">
          <span class="post-date">${date}</span>
          <span class="post-tags">${tags.split(',').map(t => `<span>${t.trim()}</span>`).join('')}</span>
        </div>
        <h1>${escapeHtml(title)}</h1>
        ${description ? `<p class="post-description">${escapeHtml(description)}</p>` : ''}
      </header>
      <div class="post-body">
        ${bodyHtml}
      </div>
      <footer class="post-footer">
        <div class="cta-box">
          <p class="cta-label">// TRY IT NOW</p>
          <pre><code>npx axiom-check</code></pre>
          <p>Scan your repo for 2026 best-practice gaps. Zero install. Free. MIT licensed.</p>
          <a href="https://github.com/yorkisestevez/axiom" class="btn">▸ View on GitHub</a>
        </div>
      </footer>
    </article>
  </main>

  <footer class="site-footer">
    <div class="inner">
      <span>// BUILT BY <a href="https://github.com/yorkisestevez">YORKIS_ESTEVEZ</a></span>
      <div class="links">
        <a href="/blog/">Blog</a>
        <a href="https://github.com/yorkisestevez/axiom">GitHub</a>
        <span>MIT // 2026</span>
      </div>
    </div>
  </footer>
</body>
</html>
`;
}

function renderIndex(posts) {
  const postList = posts.map(p => `
    <article class="post-card">
      <div class="post-meta">
        <span class="post-date">${p.frontmatter.date || ''}</span>
      </div>
      <h2><a href="posts/${p.slug}.html">${escapeHtml(p.frontmatter.title || 'Untitled')}</a></h2>
      <p>${escapeHtml(p.frontmatter.description || '')}</p>
      <div class="post-tags">${(Array.isArray(p.frontmatter.tags) ? p.frontmatter.tags : [p.frontmatter.tags || '']).filter(Boolean).map(t => `<span>${t}</span>`).join('')}</div>
      <a href="posts/${p.slug}.html" class="read-more">Read more →</a>
    </article>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog // Axiom</title>
  <meta name="description" content="Technical deep-dives, 2026 best-practice gaps from real repos, and weekly Hall of Gaps reports.">
  <link rel="canonical" href="${BASE_URL}/blog/">
  <meta property="og:title" content="Axiom Blog">
  <meta property="og:description" content="Technical deep-dives, 2026 best-practice gaps from real repos, and weekly Hall of Gaps reports.">
  <meta property="og:image" content="${BASE_URL}/assets/og-image.svg">
  <link rel="stylesheet" href="blog.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <nav class="blog-nav">
    <a href="/" class="brand">AXIOM_OS</a>
    <div class="links">
      <a href="/">Home</a>
      <a href="/blog/">Blog</a>
      <a href="https://github.com/yorkisestevez/axiom">GitHub</a>
    </div>
  </nav>

  <main class="blog-index">
    <header class="index-header">
      <div class="label">// BLOG</div>
      <h1>Technical deep-dives + weekly reports</h1>
      <p>Auto-scanning the top repos on GitHub for 2026 best-practice gaps. Published weekly.</p>
    </header>

    <div class="post-list">
      ${postList}
    </div>
  </main>

  <footer class="site-footer">
    <div class="inner">
      <span>// BUILT BY <a href="https://github.com/yorkisestevez">YORKIS_ESTEVEZ</a></span>
      <div class="links">
        <a href="/blog/">Blog</a>
        <a href="https://github.com/yorkisestevez/axiom">GitHub</a>
        <span>MIT // 2026</span>
      </div>
    </div>
  </footer>
</body>
</html>
`;
}

function renderSitemap(posts) {
  const urls = [
    `${BASE_URL}/`,
    `${BASE_URL}/blog/`,
    ...posts.map(p => `${BASE_URL}/blog/posts/${p.slug}.html`)
  ];
  const now = new Date().toISOString();
  const urlEntries = urls.map(url => `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;
}

// ── Main build ────────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.log(`[build-blog] No source directory at ${SRC_DIR}, nothing to build.`);
    return;
  }

  if (!fs.existsSync(POSTS_DIR)) fs.mkdirSync(POSTS_DIR, { recursive: true });

  const files = fs.readdirSync(SRC_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse();  // Newest first if filenames contain dates

  const posts = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(SRC_DIR, file), 'utf8');
    const { frontmatter, body } = parseFrontmatter(raw);
    const bodyHtml = mdToHtml(body);
    const html = renderPost({ frontmatter, bodyHtml, slug });
    fs.writeFileSync(path.join(POSTS_DIR, `${slug}.html`), html, 'utf8');
    posts.push({ slug, frontmatter });
    console.log(`[build-blog] Built ${slug}.html`);
  }

  // Sort posts by date (newest first), fallback to filename
  posts.sort((a, b) => {
    const da = a.frontmatter.date || '';
    const db = b.frontmatter.date || '';
    return db.localeCompare(da);
  });

  const indexHtml = renderIndex(posts);
  fs.writeFileSync(path.join(BLOG_DIR, 'index.html'), indexHtml, 'utf8');
  console.log(`[build-blog] Built index.html (${posts.length} posts)`);

  const sitemap = renderSitemap(posts);
  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf8');
  console.log(`[build-blog] Wrote sitemap.xml (${posts.length + 2} URLs)`);
}

main();
