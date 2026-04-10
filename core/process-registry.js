/**
 * OpenClaw Process Registry
 * Central coordination for all OpenClaw processes.
 * Every process checks in before starting, checks out when done.
 * Prevents VRAM contention, queue double-processing, and log corruption.
 *
 * Zero external dependencies. Pure fs + path + process.
 */

const fs = require('fs');
const path = require('path');

const config = require('./config');
const OPENCLAW_DIR = config.paths.root;
const BOARD_PATH = path.join(OPENCLAW_DIR, 'process-board.json');
const BOARD_LOCK_DIR = path.join(OPENCLAW_DIR, 'process-board.lock');
const WIKI_BOARD_PATH = path.join(OPENCLAW_DIR, 'wiki', '_system', 'process-board.md');

const TOTAL_VRAM_MB = 16384;
const HEARTBEAT_INTERVAL_MS = 30000;
const STALE_MULTIPLIER = 2.0;
const BOARD_LOCK_TIMEOUT_MS = 10000;  // 10s — generous under contention
const BOARD_LOCK_STALE_MS = 10000;

// Estimated VRAM per model (MB)
const MODEL_VRAM = {
  'gemma4:e4b':              5200,
  'gemma4:latest':           5200,
  'qwen2.5-coder:7b':       4800,
  'qwen2.5-coder:14b':      9000,
  'qwen2.5-coder:32b':      18000,
            'qwen3:8b':               5200,
  'qwen3.5:9b':             6000,
  'deepseek-r1:8b':         5500,
  'deepseek-r1:14b':        9000,
  'deepseek-r1:32b':        18000,
  'dolphin3:8b':            5000,
  'llama3.1:latest':        5000,
  'llama3.2-vision:latest': 4500,
  'mistral:7b':             4800,
  'gemma3:4b':              3000,
};
const DEFAULT_VRAM_MB = 5000;

// Active heartbeat timers (keyed by process ID)
const heartbeatTimers = new Map();

// ── Board-level file lock (mkdir-based mutex) ────────────────────

function withBoardLock(fn) {
  const start = Date.now();
  while (true) {
    try {
      fs.mkdirSync(BOARD_LOCK_DIR);
      break;
    } catch (e) {
      if (e.code === 'EEXIST') {
        try {
          const age = Date.now() - fs.statSync(BOARD_LOCK_DIR).mtimeMs;
          if (age > BOARD_LOCK_STALE_MS) { fs.rmdirSync(BOARD_LOCK_DIR); continue; }
        } catch {}
        if (Date.now() - start > BOARD_LOCK_TIMEOUT_MS) {
          try { fs.rmdirSync(BOARD_LOCK_DIR); } catch {}
          continue;
        }
        // Spin briefly
        const until = Date.now() + 5;
        while (Date.now() < until) {}
        continue;
      }
      throw e;
    }
  }
  try {
    return fn();
  } finally {
    try { fs.rmdirSync(BOARD_LOCK_DIR); } catch {}
  }
}

// ── Read / Write board (atomic) ──────────────────────────────────

function emptyBoard() {
  return { processes: {}, locks: {}, vram: { totalMB: TOTAL_VRAM_MB, estimatedUsedMB: 0, models: {} } };
}

function readBoard() {
  try {
    const raw = fs.readFileSync(BOARD_PATH, 'utf8');
    const board = JSON.parse(raw);
    if (!board.processes) board.processes = {};
    if (!board.locks) board.locks = {};
    if (!board.vram) board.vram = { totalMB: TOTAL_VRAM_MB, estimatedUsedMB: 0, models: {} };
    return board;
  } catch {
    return emptyBoard();
  }
}

function writeBoard(board) {
  const tmp = BOARD_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(board, null, 2), 'utf8');
  fs.renameSync(tmp, BOARD_PATH);
}

// ── VRAM helpers ─────────────────────────────────────────────────

const http = require('http');
let liveVramCache = null;
let liveVramCacheTime = 0;
const VRAM_CACHE_TTL_MS = 15000; // Cache live VRAM data for 15s

function estimateVram(models) {
  if (!models || !models.length) return 0;
  return models.reduce((sum, m) => sum + (MODEL_VRAM[m] || DEFAULT_VRAM_MB), 0);
}

/**
 * Query Ollama /api/ps for actual loaded models + VRAM usage.
 * Returns { models: { name: vramMB }, totalUsedMB } or null on failure.
 * Cached for 15s to avoid hammering Ollama.
 */
function queryOllamaVram() {
  if (liveVramCache && Date.now() - liveVramCacheTime < VRAM_CACHE_TTL_MS) {
    return liveVramCache;
  }
  try {
    // Synchronous HTTP via execSync (safe — local only, <100ms)
    const { execSync } = require('child_process');
    const raw = execSync('curl -s http://127.0.0.1:11434/api/ps', { encoding: 'utf8', timeout: 3000, windowsHide: true });
    const data = JSON.parse(raw);
    if (!data.models || !Array.isArray(data.models)) return null;

    const models = {};
    let totalUsedMB = 0;
    for (const m of data.models) {
      const vramMB = Math.round((m.size_vram || 0) / (1024 * 1024));
      models[m.name] = vramMB;
      totalUsedMB += vramMB;
    }

    liveVramCache = { models, totalUsedMB };
    liveVramCacheTime = Date.now();
    return liveVramCache;
  } catch {
    return null;
  }
}

function recalcVram(board) {
  // Try live VRAM from Ollama first
  const live = queryOllamaVram();

  if (live) {
    // Merge: live data is ground truth, plus estimates for models not yet loaded
    const modelSet = { ...live.models };
    let usedMB = live.totalUsedMB;

    // Add models declared by processes but not yet loaded in Ollama
    for (const proc of Object.values(board.processes)) {
      if (proc.models) {
        for (const m of proc.models) {
          if (!modelSet[m]) {
            const est = MODEL_VRAM[m] || DEFAULT_VRAM_MB;
            modelSet[m] = est;
            usedMB += est;
          }
        }
      }
    }

    board.vram = {
      totalMB: TOTAL_VRAM_MB,
      estimatedUsedMB: usedMB,
      models: modelSet,
      source: 'live+estimated',
    };
  } else {
    // Fallback to pure estimation from process declarations
    const modelSet = {};
    for (const proc of Object.values(board.processes)) {
      if (proc.models) {
        for (const m of proc.models) {
          if (!modelSet[m]) modelSet[m] = MODEL_VRAM[m] || DEFAULT_VRAM_MB;
        }
      }
    }
    board.vram = {
      totalMB: TOTAL_VRAM_MB,
      estimatedUsedMB: Object.values(modelSet).reduce((a, b) => a + b, 0),
      models: modelSet,
      source: 'estimated',
    };
  }
}

// ── PID alive check ──────────────────────────────────────────────

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// ── Stale cleanup ────────────────────────────────────────────────

function cleanStale(board) {
  const now = Date.now();
  let changed = false;

  // Clean stale processes
  for (const [id, proc] of Object.entries(board.processes)) {
    const heartbeatAge = now - new Date(proc.lastHeartbeat).getTime();
    const staleMs = (proc.ttlSeconds || 120) * STALE_MULTIPLIER * 1000;
    const pidDead = proc.pid && !isPidAlive(proc.pid);

    if (pidDead || heartbeatAge > staleMs) {
      delete board.processes[id];
      changed = true;
    }
  }

  // Clean stale locks
  for (const [name, lock] of Object.entries(board.locks)) {
    const holderGone = !board.processes[lock.holder];
    const lockAge = now - new Date(lock.acquiredAt).getTime();
    const lockStale = lockAge > (lock.ttlSeconds || 60) * 1000;

    if (holderGone || lockStale) {
      delete board.locks[name];
      changed = true;
    }
  }

  if (changed) recalcVram(board);
  return changed;
}

// ── Core API ─────────────────────────────────────────────────────

function checkIn(opts) {
  const { name, models = [], mode = 'batch', ttlSeconds, description = '' } = opts;
  const id = `${name}-${process.pid}`;
  const ttl = ttlSeconds || (mode === 'persistent' ? 600 : 120);

  withBoardLock(() => {
    const board = readBoard();
    cleanStale(board);

    board.processes[id] = {
      name,
      pid: process.pid,
      startedAt: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      ttlSeconds: ttl,
      status: 'running',
      models,
      vramMB: estimateVram(models),
      mode,
      description,
    };

    recalcVram(board);
    writeBoard(board);
  });

  // Auto-heartbeat
  const timer = setInterval(() => heartbeat(id), HEARTBEAT_INTERVAL_MS);
  timer.unref();
  heartbeatTimers.set(id, timer);

  // Cleanup on exit
  const exitHandler = () => { try { checkOut(id); } catch {} };
  process.on('exit', exitHandler);
  process.on('SIGTERM', exitHandler);
  process.on('SIGINT', exitHandler);

  // Export wiki status
  try { exportToWiki(); } catch {}

  return { id, heartbeatTimer: timer };
}

function checkOut(id) {
  // Clear heartbeat
  const timer = heartbeatTimers.get(id);
  if (timer) { clearInterval(timer); heartbeatTimers.delete(id); }

  withBoardLock(() => {
    const board = readBoard();

    // Release any locks held by this process
    for (const [name, lock] of Object.entries(board.locks)) {
      if (lock.holder === id) delete board.locks[name];
    }

    delete board.processes[id];
    recalcVram(board);
    writeBoard(board);
  });

  try { exportToWiki(); } catch {}
}

function checkOutByName(name) {
  withBoardLock(() => {
    const board = readBoard();
    for (const [id, proc] of Object.entries(board.processes)) {
      if (proc.name === name && proc.pid === process.pid) {
        // Release locks
        for (const [lockName, lock] of Object.entries(board.locks)) {
          if (lock.holder === id) delete board.locks[lockName];
        }
        delete board.processes[id];
      }
    }
    recalcVram(board);
    writeBoard(board);
  });
}

function heartbeat(id) {
  try {
    withBoardLock(() => {
      const board = readBoard();
      if (board.processes[id]) {
        board.processes[id].lastHeartbeat = new Date().toISOString();
        writeBoard(board);
      }
    });
  } catch {}
}

function canStart(opts) {
  const { name, models = [], requireLock, mode = 'advisory' } = opts;

  return withBoardLock(() => {
    const board = readBoard();
    cleanStale(board);
    writeBoard(board);

    const reasons = [];
    const conflicting = [];

    // VRAM check: what models are already loaded + what we'd add
    const loadedModels = { ...board.vram.models };
    let totalVram = board.vram.estimatedUsedMB;
    for (const m of models) {
      if (!loadedModels[m]) {
        const cost = MODEL_VRAM[m] || DEFAULT_VRAM_MB;
        totalVram += cost;
        loadedModels[m] = cost;
      }
    }
    if (totalVram > TOTAL_VRAM_MB) {
      reasons.push(`VRAM budget exceeded (${totalVram}/${TOTAL_VRAM_MB} MB)`);
    }

    // Lock check
    if (requireLock && board.locks[requireLock]) {
      const lock = board.locks[requireLock];
      reasons.push(`Lock '${requireLock}' held by ${lock.holder}`);
      conflicting.push(lock.holder);
    }

    const ok = mode === 'advisory' ? true : reasons.length === 0;
    if (mode === 'advisory' && reasons.length > 0) {
      console.log(`[registry] Advisory warning for ${name}: ${reasons.join('; ')}`);
    }

    return {
      ok,
      reason: reasons.join('; ') || undefined,
      vramAvailable: TOTAL_VRAM_MB - board.vram.estimatedUsedMB,
      conflictingProcesses: conflicting,
    };
  });
}

function waitForClear(opts, timeoutMs = 60000, pollMs = 2000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      const result = canStart({ ...opts, mode: 'strict' });
      if (result.ok) return resolve(result);
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting: ${result.reason}`));
      setTimeout(poll, pollMs);
    };
    poll();
  });
}

function acquireLock(lockName, holderId, ttlSeconds = 60) {
  return withBoardLock(() => {
    const board = readBoard();
    cleanStale(board);

    if (board.locks[lockName]) {
      const existing = board.locks[lockName];
      // Check if holder is still alive
      if (board.processes[existing.holder]) {
        writeBoard(board);
        return false;
      }
      // Stale lock — claim it
    }

    board.locks[lockName] = {
      holder: holderId,
      acquiredAt: new Date().toISOString(),
      ttlSeconds,
    };
    writeBoard(board);
    return true;
  });
}

function releaseLock(lockName, holderId) {
  return withBoardLock(() => {
    const board = readBoard();
    if (board.locks[lockName] && board.locks[lockName].holder === holderId) {
      delete board.locks[lockName];
      writeBoard(board);
      return true;
    }
    writeBoard(board);
    return false;
  });
}

function getStatus() {
  return withBoardLock(() => {
    const board = readBoard();
    cleanStale(board);
    writeBoard(board);
    return board;
  });
}

// ── Wiki export ──────────────────────────────────────────────────

function exportToWiki() {
  const board = readBoard();
  cleanStale(board);

  const procs = Object.values(board.processes);
  const locks = Object.entries(board.locks);
  const now = new Date();

  let md = `---
title: Process Board
wiki: system
updated: ${now.toISOString()}
auto_generated: true
---

# Process Board

> Auto-generated by process-registry.js. Do not edit manually.

## Active Processes

`;

  if (procs.length) {
    md += '| Process | PID | Uptime | Models | VRAM | Mode |\n';
    md += '|---------|-----|--------|--------|------|------|\n';
    for (const p of procs) {
      const upMin = Math.round((now - new Date(p.startedAt)) / 60000);
      const upStr = upMin >= 60 ? `${Math.floor(upMin / 60)}h ${upMin % 60}m` : `${upMin}m`;
      md += `| ${p.name} | ${p.pid} | ${upStr} | ${(p.models || []).join(', ') || 'none'} | ${((p.vramMB || 0) / 1024).toFixed(1)} GB | ${p.mode} |\n`;
    }
  } else {
    md += '_No active processes._\n';
  }

  md += `\n## VRAM Budget\n\n`;
  md += `**Total:** ${(board.vram.totalMB / 1024).toFixed(0)} GB | **Used:** ~${(board.vram.estimatedUsedMB / 1024).toFixed(1)} GB | **Available:** ~${((board.vram.totalMB - board.vram.estimatedUsedMB) / 1024).toFixed(1)} GB\n`;

  if (locks.length) {
    md += `\n## Locks\n\n`;
    md += '| Lock | Holder | Age |\n';
    md += '|------|--------|-----|\n';
    for (const [name, lock] of locks) {
      const ageMin = Math.round((now - new Date(lock.acquiredAt)) / 60000);
      md += `| ${name} | ${lock.holder} | ${ageMin}m |\n`;
    }
  }

  md += `\n## See Also\n\n`;
  md += `- [[openclaw/architecture|Architecture]] — system design\n`;
  md += `- [[_system/quick-reference|Quick Reference]] — operational dashboard\n`;

  try {
    fs.writeFileSync(WIKI_BOARD_PATH, md, 'utf8');
  } catch {}
}

// ── Exports ──────────────────────────────────────────────────────

module.exports = {
  checkIn,
  checkOut,
  checkOutByName,
  heartbeat,
  canStart,
  waitForClear,
  acquireLock,
  releaseLock,
  getStatus,
  exportToWiki,
  withBoardLock,
  queryOllamaVram,
  MODEL_VRAM,
  TOTAL_VRAM_MB,
};
