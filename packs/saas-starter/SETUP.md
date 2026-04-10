# SaaS Starter Pack — Setup Guide

## What's Included

- 5 pre-built skills for SaaS development
- Domain configs for Knowledge Accelerator (SaaS-focused research)
- Gap rules tuned for multi-tenant SaaS patterns
- Cross-project sync patterns for SaaS best practices
- Wiki template with SaaS project structure

## Installation

1. Copy `config/` files into your Axiom `config/` directory (merges with existing)
2. Copy `skills/` directories into your Axiom `skills/` directory
3. Copy `wiki-template/` into your Axiom `wiki/` directory
4. Run `node core/skill-registry.js scan` to index new skills
5. Run `node core/knowledge-accelerator.js` to verify new domains loaded

## Skills Included

| Skill | What It Does |
|-------|-------------|
| multi-tenant-rls | Supabase Row Level Security patterns for tenant isolation |
| stripe-metered-billing | Stripe Meters API + hybrid pricing implementation |
| plg-free-tier | Product-led growth free tier design patterns |
| input-validation | Zod schema validation for all API boundaries |
| error-handling | Consistent error response patterns across routes |

## Research Domains Added

- `saas-billing` — Stripe, usage-based pricing, subscription management
- `saas-growth` — PLG, conversion optimization, churn reduction
- `saas-security` — Auth patterns, RBAC, API security, compliance
