/**
 * Mythos Central Config Loader
 * Every module imports this instead of hardcoding paths.
 * Reads mythos.config.js from the install root.
 */

const fs = require('fs');
const path = require('path');

// Find the Mythos root (where mythos.config.js lives)
function findRoot() {
  // Check env override first
  if (process.env.MYTHOS_ROOT) return process.env.MYTHOS_ROOT;

  // Walk up from this file to find mythos.config.js
  let dir = path.resolve(__dirname, '..');
  for (let i = 0; i < 5; i++) {
    if (fs.existsSync(path.join(dir, 'mythos.config.js'))) return dir;
    dir = path.dirname(dir);
  }

  // Default: parent of core/
  return path.resolve(__dirname, '..');
}

const ROOT = findRoot();
const CONFIG_PATH = path.join(ROOT, 'mythos.config.js');

// Load user config or fall back to defaults
let userConfig = {};
try {
  userConfig = require(CONFIG_PATH);
} catch {
  // No config file yet — use defaults (setup.js not run yet)
}

const defaults = {
  paths: {
    root: ROOT,
    wiki: path.join(ROOT, 'wiki'),
    skills: path.join(ROOT, 'skills'),
    workspace: path.join(ROOT, 'workspace'),
    queue: path.join(ROOT, 'queue'),
    backups: path.join(ROOT, 'backups'),
  },
  hardware: {
    vramMB: 12288,       // 12 GB default (common for RTX 4070/5070)
    ramHeadroomMB: 4096, // Keep 4 GB free
    gpuModel: 'unknown',
  },
  projects: {},          // { slug: { codePath, wikiPath } }
  models: {},            // Loaded from config/models.json
  ollamaUrl: 'http://127.0.0.1:11434',
};

// Deep merge user config over defaults
function merge(target, source) {
  const result = { ...target };
  for (const [key, val] of Object.entries(source || {})) {
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof target[key] === 'object') {
      result[key] = merge(target[key], val);
    } else if (val !== undefined) {
      result[key] = val;
    }
  }
  return result;
}

const config = merge(defaults, userConfig);

// Ensure paths are resolved
for (const [key, val] of Object.entries(config.paths)) {
  if (typeof val === 'string' && !path.isAbsolute(val)) {
    config.paths[key] = path.resolve(ROOT, val);
  }
}

// Load JSON config files if they exist
function loadJsonConfig(filename) {
  const filepath = path.join(ROOT, 'config', filename);
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch {
    return null;
  }
}

config.domains = loadJsonConfig('domains.json') || {};
config.gapRules = loadJsonConfig('gap-rules.json') || [];
config.syncPatterns = loadJsonConfig('sync-patterns.json') || [];
config.modelVram = loadJsonConfig('models.json') || {};
config.ports = loadJsonConfig('ports.json') || {};

module.exports = config;
