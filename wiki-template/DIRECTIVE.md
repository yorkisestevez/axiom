# UNIVERSAL OPERATING DIRECTIVE — WIKI-FIRST PROTOCOL
# For: All AI models and agents
# Version: 1.0 — Axiom Standard

---

## PRIME DIRECTIVE

There is ONE source of truth for all knowledge: the wiki.

Every model reads from the wiki before working. Every model proposes updates through staging. No model ever overwrites wiki files directly.

---

## SAFE UPDATE PROTOCOL

### THE GOLDEN RULE
Models NEVER directly edit wiki files. All updates go through `_staging/pending/`.

### Exceptions (no staging required):
- `_system/CONTEXT.md` — frequently rewritten by all platforms
- `personal/journal/**` — personal entries

### How staging works:

1. Create a file in `wiki/_staging/pending/`
2. Filename: `{YYYY-MM-DD}_{HH-MM}_{description}.md`
3. Include YAML frontmatter with: date, target_file, action, priority, summary
4. User reviews and approves by moving content to target files

---

## CONFLICT RESOLUTION

- Wiki says X, user says Y — follow user, then stage update to correct wiki
- Two wiki files contradict — flag to user, do not guess
- Unsure if worth staging — stage with `priority: low` and clear summary

---

## OPERATING PRINCIPLES

- Every output connects to value
- Production-ready. No drafts, no placeholders
- No fluff. Direct, expert-level output
- Security first. Never loosen security
