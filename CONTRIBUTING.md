# Contributing to Axiom

Thanks for your interest in making Axiom better.

## How to Contribute

### Report a Bug
Open an issue with:
- What you expected to happen
- What actually happened
- Your Node.js version and OS
- Steps to reproduce

### Suggest a Feature
Open an issue with the `enhancement` label. Describe the use case, not just the feature.

### Submit a Pull Request
1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Test: `node core/system-audit.js` and `node core/skill-registry.js scan`
5. Commit: `git commit -m "add: your feature description"`
6. Push and open a PR

### Add a Domain Pack
Domain packs live in `packs/`. Each pack contains:
- `SETUP.md` — installation instructions
- `config/` — domain configs, gap rules, sync patterns
- `skills/` — skill definitions with SKILL.md files
- `wiki-template/` — optional wiki starter content

### Add Gap Rules or Sync Patterns
Edit the JSON files in `config/`. Each rule needs:
- `id` — unique slug
- `name` — human-readable name
- `grep` — regex pattern to search for
- `finding` — what it means
- `action` — what to do about it
- `severity` — low, medium, or high

## Code Standards
- Zero external dependencies in core modules (Node.js built-ins only)
- All paths go through `core/config.js` — never hardcode
- Every module works standalone via CLI
- Test before submitting

## Questions?
Open a discussion on GitHub or reach out on Twitter.
