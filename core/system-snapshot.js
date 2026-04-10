/**
 * OpenClaw System Snapshot/Export (inspired by PAI releases)
 * Creates a portable archive of the entire OpenClaw configuration.
 *
 * Usage:
 *   node system-snapshot.js create   — create snapshot
 *   node system-snapshot.js list     — list existing snapshots
 *   node system-snapshot.js verify   — check last snapshot integrity
 *
 * Output: C:\Business\backups\openclaw\snapshot-{date}.tar.gz
 * Excludes: node_modules, .git, credentials, .env, sqlite, media, logs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./config');
const OPENCLAW = config.paths.root;
const BACKUP_DIR = (config && config.paths && config.paths.backups) || path.join(OPENCLAW, 'backups');
const MANIFEST_PATH = path.join(OPENCLAW, 'workspace', 'last-snapshot.json');

// Files and directories to include
const INCLUDE = {
  configFiles: [
    'CLAUDE.md', 'CONTEXT.md', 'DECISIONS.md', 'MEMORY.md',
    'ARCHITECTURE.md', 'SOUL.md', 'USER.md', 'SECURITY.md',
    'CRYPTO_GUARDRAILS.md', 'openclaw.json', 'autonomy-config.json',
    'port-registry.json'
  ],
  scripts: [
    'system-audit.js', 'knowledge-accelerator.js', 'spaced-repetition.js',
    'build-journal.js', 'gap-detector.js', 'failure-replay.js',
    'cross-project-sync.js', 'auto-skill-extractor.js', 'self-modifier.js',
    'skill-registry.js', 'process-registry.js', 'shared-context.js',
    'model-orchestrator.js', 'agent_orchestrator.js', 'correction_engine.js',
    'self-improver.js', 'learning-engine.js', 'overnight-learner.js',
    'daily-digest.js', 'weekly-review.js', 'nightly-processor.js',
    'self-heal.js', 'system-snapshot.js'
  ],
  directories: [
    'skills',           // All SKILL.md files
    'wiki/_system',     // Identity + operating state
    'wiki/_staging',    // Staging system
    'agents',           // Agent profiles
    'prompts',          // Prompt templates
    'workspace'         // Generated indexes and briefs
  ]
};

// Always exclude
const EXCLUDE_PATTERNS = [
  'node_modules', '.git', 'credentials', '.env',
  '*.sqlite', '*.sqlite-wal', '*.sqlite-shm',
  'media', 'stt-models', 'tts-models', 'whisper',
  'session-log.jsonl', 'routing_log.jsonl', 'tool-audit.jsonl',
  'completions', 'logs', '*.lock'
];

// ── Core API ────────────────────────────────────────────────────

function create() {
  // Ensure backup directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = `snapshot-${date}.zip`;
  const outputPath = path.join(BACKUP_DIR, filename);

  // Build file list
  const files = collectFiles();

  if (files.length === 0) {
    console.log('[snapshot] No files to archive.');
    return null;
  }

  // Create tar.gz using git bash tar
  try {
    // Stage files into a temp directory, then zip
    const tempDir = path.join(OPENCLAW, 'workspace', '.snapshot-staging');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    fs.mkdirSync(tempDir, { recursive: true });

    for (const file of files) {
      const src = path.join(OPENCLAW, file);
      const dest = path.join(tempDir, file);
      const destDir = path.dirname(dest);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      try { fs.copyFileSync(src, dest); } catch {}
    }

    // Remove old snapshot if exists
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

    const cmd = `powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${outputPath}' -Force"`;
    execSync(cmd, { encoding: 'utf8', timeout: 120000, windowsHide: true });

    // Cleanup staging
    fs.rmSync(tempDir, { recursive: true });

    // Write manifest
    const stat = fs.statSync(outputPath);
    const manifest = {
      filename,
      path: outputPath,
      createdAt: new Date().toISOString(),
      sizeMB: +(stat.size / (1024 * 1024)).toFixed(2),
      fileCount: files.length,
      includes: {
        configFiles: INCLUDE.configFiles.filter(f => fs.existsSync(path.join(OPENCLAW, f))).length,
        scripts: INCLUDE.scripts.filter(f => fs.existsSync(path.join(OPENCLAW, f))).length,
        directories: INCLUDE.directories.length,
        skillCount: countSkills()
      }
    };

    const manifestDir = path.dirname(MANIFEST_PATH);
    if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

    return manifest;
  } catch (err) {
    throw err;
  }
}

function list() {
  if (!fs.existsSync(BACKUP_DIR)) return [];

  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('snapshot-') && f.endsWith('.zip'))
    .sort()
    .reverse()
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        filename: f,
        date: f.replace('snapshot-', '').replace('.tar.gz', ''),
        sizeMB: +(stat.size / (1024 * 1024)).toFixed(2),
        created: stat.mtime.toISOString()
      };
    });
}

function verify() {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const exists = fs.existsSync(manifest.path);
    const stat = exists ? fs.statSync(manifest.path) : null;
    const sizeMatch = stat ? +(stat.size / (1024 * 1024)).toFixed(2) === manifest.sizeMB : false;

    return {
      valid: exists && sizeMatch,
      manifest,
      fileExists: exists,
      sizeMatch,
      currentSizeMB: stat ? +(stat.size / (1024 * 1024)).toFixed(2) : 0
    };
  } catch {
    return { valid: false, error: 'No manifest found. Run: node system-snapshot.js create' };
  }
}

// ── File Collection ─────────────────────────────────────────────

function collectFiles() {
  const files = [];

  // Config files
  for (const f of INCLUDE.configFiles) {
    if (fs.existsSync(path.join(OPENCLAW, f))) {
      files.push(f);
    }
  }

  // Scripts
  for (const f of INCLUDE.scripts) {
    if (fs.existsSync(path.join(OPENCLAW, f))) {
      files.push(f);
    }
  }

  // Directories (recursive, excluding binaries and large files)
  for (const dir of INCLUDE.directories) {
    const fullDir = path.join(OPENCLAW, dir);
    if (!fs.existsSync(fullDir)) continue;

    const dirFiles = walkDir(fullDir, OPENCLAW);
    files.push(...dirFiles);
  }

  return files;
}

function walkDir(dir, basePath) {
  const files = [];
  try {
    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

      // Skip excluded patterns
      if (EXCLUDE_PATTERNS.some(p => {
        if (p.startsWith('*')) return entry.endsWith(p.slice(1));
        return entry === p || relativePath.includes(p);
      })) continue;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath, basePath));
      } else if (stat.isFile()) {
        // Skip files > 1MB (likely binaries or data)
        if (stat.size > 1024 * 1024) continue;
        files.push(relativePath);
      }
    }
  } catch {}
  return files;
}

function countSkills() {
  try {
    return fs.readdirSync(SKILLS_DIR).filter(d =>
      fs.statSync(path.join(SKILLS_DIR, d)).isDirectory() &&
      fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))
    ).length;
  } catch {
    return 0;
  }
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
  const cmd = process.argv[2];

  if (cmd === 'create') {
    console.log('[snapshot] Creating system snapshot...');
    try {
      const manifest = create();
      if (manifest) {
        console.log(`[snapshot] Created: ${manifest.filename}`);
        console.log(`  Size: ${manifest.sizeMB} MB | Files: ${manifest.fileCount}`);
        console.log(`  Config: ${manifest.includes.configFiles} | Scripts: ${manifest.includes.scripts} | Skills: ${manifest.includes.skillCount}`);
        console.log(`  Path: ${manifest.path}`);
      }
    } catch (err) {
      console.error(`[snapshot] Error: ${err.message}`);
    }

  } else if (cmd === 'list') {
    const snapshots = list();
    if (snapshots.length === 0) {
      console.log('No snapshots found.');
    } else {
      console.log(`${snapshots.length} snapshot(s):`);
      for (const s of snapshots) {
        console.log(`  ${s.filename} — ${s.sizeMB} MB (${s.date})`);
      }
    }

  } else if (cmd === 'verify') {
    const result = verify();
    if (result.valid) {
      console.log(`[snapshot] Last snapshot valid: ${result.manifest.filename} (${result.manifest.sizeMB} MB)`);
    } else {
      console.log(`[snapshot] ${result.error || 'Last snapshot INVALID or missing'}`);
    }

  } else {
    console.log('System Snapshot');
    console.log('  node system-snapshot.js create   — create snapshot archive');
    console.log('  node system-snapshot.js list      — list existing snapshots');
    console.log('  node system-snapshot.js verify    — verify last snapshot');
  }
}

module.exports = { create, list, verify };
