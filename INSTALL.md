# Installing Axiom

Complete installation guide for the Axiom Self-Improving AI Operating System.

---

## Prerequisites

You need these installed first:

### Required
- **Node.js 18 or higher** — [Download from nodejs.org](https://nodejs.org)
  - Check: open terminal and run `node --version` (should show v18.x or higher)
- **Git** — [Download from git-scm.com](https://git-scm.com)
  - Check: `git --version`

### Optional (recommended)
- **Ollama** — for free local LLM support — [Download from ollama.com](https://ollama.com)
- **Claude Code** — for the full experience — [Download from claude.com/code](https://claude.com/code)
- **Obsidian** — to browse your wiki as a knowledge base — [Download from obsidian.md](https://obsidian.md)

---

## Step 1: Clone the Repository

Open a terminal in the folder where you want Axiom installed.

**macOS / Linux:**
```bash
cd ~
git clone https://github.com/yorkisestevez/axiom.git .axiom
cd .axiom
```

**Windows (PowerShell or Git Bash):**
```bash
cd $HOME
git clone https://github.com/yorkisestevez/axiom.git .axiom
cd .axiom
```

This creates a hidden `.axiom` folder in your home directory.

---

## Step 2: Run the Setup Wizard

```bash
node setup.js
```

The wizard will ask you:

1. **Install directory** — press Enter to accept the default
2. **GPU detection** — it automatically detects NVIDIA GPUs via `nvidia-smi`. If you don't have one, enter `0`
3. **Ollama detection** — it automatically finds your loaded models if Ollama is running
4. **Your name** — for identity files
5. **Your role** — e.g., "Full-stack developer", "SaaS builder"
6. **Active projects** — enter the name and code path for each project you want Axiom to watch. Press Enter on an empty name to finish
7. **Backup directory** — where to save system snapshots (press Enter for default)

When it finishes, you'll see:
```
Axiom is ready.

Next steps:
  node core/system-audit.js     — run system health check
  node core/skill-registry.js scan — index your skills
  node core/knowledge-accelerator.js — see research domains
```

---

## Step 3: Verify the Installation

Run the system audit:

```bash
node core/system-audit.js
```

You should see output like:
```
=== AXIOM SYSTEM AUDIT ===
Ollama: RUNNING (or DOWN if not installed)
RAM: X.X/XX.X GB free
CPU: X% load
All systems nominal.
```

If you see any warnings, they're safe to ignore for a first install — they tell you about missing optional components.

---

## Step 4: Connect to Claude Code (Optional but Recommended)

If you use Claude Code, create a `CLAUDE.md` file in your home directory (or the directory you run Claude Code from) with this content:

```markdown
# My Personal AI Operating Instructions

## Axiom Integration

I use Axiom for my AI operating system. Before any significant task:

1. Run `node ~/.axiom/core/system-audit.js` to check system health
2. Run `node ~/.axiom/core/skill-registry.js search <topic>` to check for existing capabilities
3. After building something, log it with:
   `node -e "require('~/.axiom/core/build-journal').logBuild({summary:'WHAT',project:'PROJECT',patterns:['pattern'],outcome:'success'})"`

For detailed operating rules, see `~/.axiom/templates/CLAUDE.md`.
```

Claude Code will read this file automatically and know how to use Axiom.

---

## Step 5: Run Your First Daily Digest

```bash
node core/daily-digest.js
```

This shows you your current state — projects, priorities, and any pending tasks. On first run it'll be mostly empty. As you use Axiom, it fills up with real data.

---

## Installing a Domain Pack

If you bought a domain pack (like the **SaaS Starter Pack**) from Gumroad, you'll get a zip file in your email.

1. **Extract the zip** to a temporary folder
2. **Copy the contents** into your Axiom install:
   - Copy `config/*.json` into `.axiom/config/` (merges with existing files — you may want to back them up first)
   - Copy each folder in `skills/` into `.axiom/skills/`
   - Copy the `wiki-template/` contents into `.axiom/wiki/` (optional — adds starter content)
3. **Rebuild the skill registry**:
   ```bash
   node core/skill-registry.js scan
   ```
4. **Verify the new skills loaded**:
   ```bash
   node core/skill-registry.js list
   ```
   You should see the new skills from the pack in the list.

Each pack includes its own `SETUP.md` with specific instructions.

---

## Common Commands

Once installed, these are the commands you'll use most:

```bash
# System
node core/system-audit.js          # Health check
node core/system-snapshot.js create # Backup everything

# Learning
node core/knowledge-accelerator.js  # Show research domains
node core/spaced-repetition.js due  # What to review today
node core/daily-digest.js           # Morning brief

# Code Intelligence
node core/gap-detector.js scan      # Find code gaps
node core/cross-project-sync.js scan # Find transferable patterns
node core/failure-replay.js recent  # Recent failures

# Skills
node core/skill-registry.js scan    # Rebuild skill index
node core/skill-registry.js search <term>  # Search skills
node core/skill-registry.js stats   # Usage stats

# Build Journal
node core/build-journal.js recent   # Recent builds
node core/build-journal.js patterns # Pattern usage
```

---

## Updating Axiom

```bash
cd ~/.axiom
git pull
```

Your `mythos.config.js` and any data in `workspace/` are gitignored — updates won't touch your config.

---

## Uninstalling

Axiom is self-contained. To remove:

```bash
rm -rf ~/.axiom
```

Or manually delete the `.axiom` folder from your home directory.

---

## Troubleshooting

### "Command not found: node"
Node.js is not installed. Download from [nodejs.org](https://nodejs.org).

### "Permission denied" on macOS/Linux
Make sure you have write permission to your home directory. You should never need `sudo` for Axiom.

### "nvidia-smi: command not found"
You don't have an NVIDIA GPU (or drivers aren't installed). Axiom works fine without one — just enter `0` when the wizard asks for VRAM.

### Ollama not detected
Make sure Ollama is running:
```bash
ollama serve
```
Then in another terminal, check:
```bash
curl http://127.0.0.1:11434/api/tags
```

### The setup wizard crashes
Check that your Node.js is version 18 or higher:
```bash
node --version
```
If it's lower, update Node from [nodejs.org](https://nodejs.org).

### Scripts can't find `./config`
Make sure you're running commands from the Axiom root directory:
```bash
cd ~/.axiom
node core/system-audit.js
```

---

## Support

- **GitHub Issues**: https://github.com/yorkisestevez/axiom/issues
- **Email**: If you bought a pack, reply to your Gumroad receipt
- **Documentation**: See `README.md` and `CONTRIBUTING.md` in this repo

---

## Quick Reference Card

| What | Command |
|------|---------|
| Install | `git clone https://github.com/yorkisestevez/axiom.git ~/.axiom && cd ~/.axiom && node setup.js` |
| Health check | `node core/system-audit.js` |
| Morning brief | `node core/daily-digest.js` |
| Find a skill | `node core/skill-registry.js search <term>` |
| Scan code for gaps | `node core/gap-detector.js scan` |
| Backup | `node core/system-snapshot.js create` |
| Update | `cd ~/.axiom && git pull` |
