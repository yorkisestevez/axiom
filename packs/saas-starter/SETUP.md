# SaaS Starter Pack — Setup Guide

Thank you for buying the Axiom SaaS Starter Pack. This guide gets you from zip file to running in under 5 minutes.

---

## Step 0: Install Axiom First (If You Haven't)

This pack requires the free Axiom framework. If you don't have it yet:

```bash
cd ~
git clone https://github.com/yorkisestevez/axiom.git .axiom
cd .axiom
node setup.js
```

Follow the wizard prompts. Full instructions at:
https://github.com/yorkisestevez/axiom/blob/master/INSTALL.md

Come back here when the wizard finishes with "Axiom is ready."

---

## Step 1: Extract the Pack

Extract the `axiom-saas-starter-pack.zip` you downloaded. You'll see:

```
saas-starter/
├── SETUP.md                    (this file)
├── config/
│   ├── domains.json            (3 SaaS research domains)
│   └── gap-rules.json          (6 gap detection rules)
└── skills/
    ├── multi-tenant-rls/
    ├── stripe-metered-billing/
    ├── plg-free-tier/
    ├── input-validation/
    └── error-handling/
```

---

## Step 2: Merge Config Files

The pack adds **new** domains and gap rules. You need to merge them with your existing Axiom config.

### Option A: Automatic Merge (Recommended)

From your Axiom root directory (`~/.axiom`), run:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const packDir = process.argv[1]; // pass the extracted pack path
const files = ['domains.json', 'gap-rules.json'];
for (const f of files) {
  const packFile = path.join(packDir, 'config', f);
  const axiomFile = path.join(process.cwd(), 'config', f);
  if (!fs.existsSync(packFile)) continue;
  const pack = JSON.parse(fs.readFileSync(packFile, 'utf8'));
  let existing;
  try { existing = JSON.parse(fs.readFileSync(axiomFile, 'utf8')); }
  catch { existing = Array.isArray(pack) ? [] : {}; }
  if (Array.isArray(pack)) {
    const ids = new Set(existing.map(r => r.id));
    const merged = [...existing, ...pack.filter(r => !ids.has(r.id))];
    fs.writeFileSync(axiomFile, JSON.stringify(merged, null, 2));
    console.log('Merged ' + (merged.length - existing.length) + ' items into ' + f);
  } else {
    const merged = { ...existing, ...pack };
    fs.writeFileSync(axiomFile, JSON.stringify(merged, null, 2));
    console.log('Merged ' + (Object.keys(merged).length - Object.keys(existing).length) + ' keys into ' + f);
  }
}
" /path/to/extracted/saas-starter
```

Replace `/path/to/extracted/saas-starter` with the actual path where you extracted the pack.

### Option B: Manual Merge

If you prefer to merge by hand:

**`config/domains.json`** — open both files and add the 3 new keys (`saas-billing`, `saas-growth`, `saas-security`) to your Axiom `domains.json`.

**`config/gap-rules.json`** — open both files and append the 6 new rule objects to your Axiom `gap-rules.json` array.

---

## Step 3: Install the Skills

Copy each skill directory into your Axiom skills folder:

**macOS / Linux:**
```bash
cp -r skills/* ~/.axiom/skills/
```

**Windows (PowerShell):**
```powershell
Copy-Item -Path "skills\*" -Destination "$HOME\.axiom\skills\" -Recurse
```

**Windows (Git Bash):**
```bash
cp -r skills/* ~/.axiom/skills/
```

---

## Step 4: Rebuild the Skill Registry

From your Axiom root directory:

```bash
cd ~/.axiom
node core/skill-registry.js scan
```

You should see:
```
[skill-registry] Indexed XX skills (0 auto-generated)
```

The number should be 5 higher than before.

---

## Step 5: Verify Everything Loaded

```bash
node core/skill-registry.js search saas
```

You should see at least these 5 skills:
- `multi-tenant-rls`
- `stripe-metered-billing`
- `plg-free-tier`
- `input-validation`
- `error-handling`

And check the research domains loaded:

```bash
node core/knowledge-accelerator.js
```

You should see 3 new sections in the output:
- **SaaS Billing & Payments**
- **SaaS Growth & PLG**
- **SaaS Security & Auth**

---

## Step 6: Run the Gap Detector Against Your Code

```bash
node core/gap-detector.js scan
```

With the new gap rules, it now checks for:
- Missing RLS policies (critical for multi-tenant SaaS)
- Legacy Stripe usage records API (deprecated since 2025-03-31)
- Missing input validation (Zod schemas)
- Missing API rate limiting
- Hardcoded pricing values
- Missing error boundaries

Review the findings and address them in your projects.

---

## What You Get

### Skills (5)

| Skill | Purpose |
|-------|---------|
| **multi-tenant-rls** | Supabase Row Level Security patterns for tenant isolation |
| **stripe-metered-billing** | Stripe Meters API + hybrid pricing implementation |
| **plg-free-tier** | Product-led growth with free tier + usage gates |
| **input-validation** | Zod schema validation at every API boundary |
| **error-handling** | Consistent error response patterns across routes |

### Research Domains (3)

The Knowledge Accelerator will now research these topics daily:

| Domain | Queries |
|--------|---------|
| **SaaS Billing & Payments** | Stripe, usage-based pricing, subscriptions, webhooks |
| **SaaS Growth & PLG** | PLG strategies, conversion optimization, churn |
| **SaaS Security & Auth** | RBAC, RLS, API security, multi-tenant auth |

### Gap Detection Rules (6)

Automatic code scanning for SaaS-critical patterns:

| Rule | Severity |
|------|----------|
| Missing RLS policies | HIGH |
| Legacy Stripe usage records API | HIGH |
| Missing input validation | HIGH |
| Missing API rate limiting | MEDIUM |
| Hardcoded pricing | LOW |
| Missing error boundaries | MEDIUM |

---

## Troubleshooting

### "Cannot find module" errors
You're not in the Axiom root directory. Run:
```bash
cd ~/.axiom
```
Then try the command again.

### Skills don't appear in registry scan
Make sure each skill was copied into its own subdirectory inside `~/.axiom/skills/`. Each skill needs its own folder with a `SKILL.md` file inside.

Check the structure:
```bash
ls ~/.axiom/skills/multi-tenant-rls/
```
You should see `SKILL.md`.

### Config files didn't merge
If you see JSON parse errors, there's a syntax problem in the merged file. Restore your original from the Axiom repo:
```bash
cd ~/.axiom
git checkout config/domains.json config/gap-rules.json
```
Then redo Step 2 carefully.

### The Knowledge Accelerator doesn't show the new domains
The script reads `config/domains.json` on every run. Make sure you edited the right file at `~/.axiom/config/domains.json` — not the pack's config folder.

---

## Using These Skills with Claude Code

Once installed, when you ask Claude Code to build something SaaS-related, these skills are discoverable via:

```bash
node ~/.axiom/core/skill-registry.js search <topic>
```

For example:
```bash
node ~/.axiom/core/skill-registry.js search tenant
# Returns: multi-tenant-rls

node ~/.axiom/core/skill-registry.js search billing
# Returns: stripe-metered-billing
```

Claude Code reads the `SKILL.md` files to know the patterns you've established.

---

## Support

If you run into issues:
- **GitHub Issues**: https://github.com/yorkisestevez/axiom/issues
- **Email**: Reply to your Gumroad receipt

Thanks for buying the pack. Ship fast, ship clean.
