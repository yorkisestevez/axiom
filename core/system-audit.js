/**
 * OpenClaw System Audit — One-Shot Health Check
 * Run: node system-audit.js
 * Returns structured JSON report for Claude Code session boot.
 * Zero external dependencies. Uses process-registry.js for VRAM/process data.
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = require('./config');
const OPENCLAW = config.paths.root;
const WIKI = path.join(OPENCLAW, 'wiki');
const QUEUE = path.join(OPENCLAW, 'queue');
const STAGING = path.join(WIKI, '_staging', 'pending');

const registry = require(path.join(OPENCLAW, 'process-registry.js'));

function checkOllama() {
  try {
    const raw = execSync('curl -s http://127.0.0.1:11434/api/ps', {
      encoding: 'utf8', timeout: 3000, windowsHide: true
    });
    const data = JSON.parse(raw);
    const models = (data.models || []).map(m => ({
      name: m.name,
      vramMB: Math.round((m.size_vram || 0) / (1024 * 1024)),
      sizeMB: Math.round((m.size || 0) / (1024 * 1024))
    }));
    const vramUsedMB = models.reduce((s, m) => s + m.vramMB, 0);
    const vramTotalMB = 12288; // RTX 5070 = 12 GB physical VRAM
    return {
      status: 'running',
      models,
      vramUsedMB,
      vramTotalMB,
      vramPercent: Math.round((vramUsedMB / vramTotalMB) * 100)
    };
  } catch {
    return { status: 'down', models: [], vramUsedMB: 0, vramTotalMB: 12288, vramPercent: 0 };
  }
}

function checkRAM() {
  const totalMB = Math.round(os.totalmem() / (1024 * 1024));
  const freeMB = Math.round(os.freemem() / (1024 * 1024));
  return { freeMB, totalMB, freeGB: +(freeMB / 1024).toFixed(1), totalGB: +(totalMB / 1024).toFixed(1) };
}

function checkCPU() {
  const cpus = os.cpus();
  const avg = cpus.reduce((sum, c) => {
    const total = Object.values(c.times).reduce((a, b) => a + b, 0);
    return sum + (1 - c.times.idle / total);
  }, 0) / cpus.length;
  return Math.round(avg * 100);
}

function checkDisk() {
  const drives = {};
  try {
    const raw = execSync(
      'powershell -Command "Get-CimInstance Win32_LogicalDisk | Select-Object Caption, FreeSpace, Size | ConvertTo-Json"',
      { encoding: 'utf8', timeout: 5000, windowsHide: true }
    );
    const disks = JSON.parse(raw);
    const list = Array.isArray(disks) ? disks : [disks];
    for (const d of list) {
      if (d.Size > 0) {
        const letter = d.Caption.replace(':', '').toLowerCase();
        drives[letter] = {
          freeGB: +(d.FreeSpace / (1024 ** 3)).toFixed(1),
          totalGB: +(d.Size / (1024 ** 3)).toFixed(1)
        };
      }
    }
  } catch {}
  return drives;
}

function checkProcessBoard() {
  try {
    const status = registry.getStatus();
    const active = Object.entries(status.processes).map(([id, p]) => ({
      id, name: p.name, pid: p.pid, models: p.models || [], mode: p.mode
    }));
    const staleLocks = Object.entries(status.locks).map(([name, l]) => ({
      name, holder: l.holder, age: Math.round((Date.now() - new Date(l.acquiredAt).getTime()) / 60000) + 'm'
    }));
    return {
      active,
      staleLocks,
      vram: status.vram
    };
  } catch {
    return { active: [], staleLocks: [], vram: null };
  }
}

function countFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith('.md') || f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

function generateWarnings(report) {
  const w = [];
  if (report.ollama.status === 'down') w.push('Ollama is not running');
  if (report.ollama.vramPercent > 80) w.push(`VRAM at ${report.ollama.vramPercent}% — do not load additional models without unloading first`);
  if (report.system.ram.freeGB < 4) w.push(`RAM critically low: ${report.system.ram.freeGB} GB free (minimum 4 GB headroom)`);
  if (report.system.cpuPercent > 80) w.push(`CPU load high: ${report.system.cpuPercent}% — defer heavy computation`);
  const diskC = report.disk.c;
  if (diskC && diskC.freeGB < 10) w.push(`Disk C: low: ${diskC.freeGB} GB free`);
  if (report.processes.staleLocks.length > 0) w.push(`${report.processes.staleLocks.length} stale lock(s) detected`);
  return w;
}

// ── Run ─────────────────────────────────────────────────────────

const report = {
  timestamp: new Date().toISOString(),
  ollama: checkOllama(),
  system: {
    ram: checkRAM(),
    cpuPercent: checkCPU()
  },
  disk: checkDisk(),
  processes: checkProcessBoard(),
  queue: {
    pending: countFiles(QUEUE),
    staging: countFiles(STAGING)
  },
  warnings: []
};

report.warnings = generateWarnings(report);

// Output for Claude Code to ingest
const lines = [];
lines.push('=== OPENCLAW SYSTEM AUDIT ===');
lines.push(`Timestamp: ${report.timestamp}`);
lines.push('');

// Ollama
lines.push(`Ollama: ${report.ollama.status.toUpperCase()}`);
if (report.ollama.models.length > 0) {
  lines.push(`  Models loaded: ${report.ollama.models.map(m => `${m.name} (${m.vramMB}MB VRAM)`).join(', ')}`);
}
lines.push(`  VRAM: ${report.ollama.vramUsedMB}/${report.ollama.vramTotalMB} MB (${report.ollama.vramPercent}%)`);

// System
lines.push(`RAM: ${report.system.ram.freeGB}/${report.system.ram.totalGB} GB free`);
lines.push(`CPU: ${report.system.cpuPercent}% load`);

// Disk
for (const [letter, d] of Object.entries(report.disk)) {
  lines.push(`Disk ${letter.toUpperCase()}: ${d.freeGB}/${d.totalGB} GB free`);
}

// Processes
if (report.processes.active.length > 0) {
  lines.push(`Active processes: ${report.processes.active.map(p => p.name).join(', ')}`);
} else {
  lines.push('Active processes: none');
}
if (report.processes.staleLocks.length > 0) {
  lines.push(`Stale locks: ${report.processes.staleLocks.map(l => `${l.name} (${l.age})`).join(', ')}`);
}

// Queue
lines.push(`Pending queue tasks: ${report.queue.pending}`);
lines.push(`Pending wiki staging: ${report.queue.staging}`);

// Warnings
if (report.warnings.length > 0) {
  lines.push('');
  lines.push('WARNINGS:');
  for (const w of report.warnings) lines.push(`  ⚠ ${w}`);
} else {
  lines.push('');
  lines.push('All systems nominal.');
}

console.log(lines.join('\n'));
