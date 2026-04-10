// Axiom Configuration Example
// Copy this to mythos.config.js and customize, or run: node setup.js

module.exports = {
  paths: {
    root: "~/.axiom",           // Where Axiom is installed
    wiki: "~/.axiom/wiki",       // Obsidian-compatible wiki vault
    skills: "~/.axiom/skills",   // Skill definitions
    workspace: "~/.axiom/workspace", // Generated files (briefs, indexes)
    queue: "~/.axiom/queue",     // Task queue
    backups: "~/backups/axiom",  // Snapshot destination
  },

  hardware: {
    vramMB: 12288,               // Your GPU VRAM in MB (0 = no GPU)
    ramHeadroomMB: 4096,         // Minimum free RAM to maintain
    gpuModel: "RTX 4070",        // For display only
  },

  // Your active projects — used by gap detector, cross-project sync, and research
  projects: {
    "my-saas": { codePath: "/path/to/my-saas" },
    "my-api": { codePath: "/path/to/my-api" },
  },

  user: {
    name: "Your Name",
    role: "Full-stack developer",
  },

  ollamaUrl: "http://127.0.0.1:11434",
};
