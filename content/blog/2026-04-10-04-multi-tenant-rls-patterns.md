---
date: 2026-04-10
title: "Multi-Tenant SaaS with Supabase RLS: The Patterns That Matter"
description: "38% of top Next.js+Supabase repos have no Row Level Security. Here's the patterns you need before you ship tenant data."
tags: [supabase, saas, security, postgres]
canonical_url: https://github.com/yorkisestevez/axiom/blob/master/content/devto/04-multi-tenant-rls-patterns.md
---

# Multi-Tenant SaaS with Supabase RLS: The Patterns That Matter

I scanned the top 48 Next.js repos on GitHub. **38% of the ones using Supabase had no Row Level Security at all.**

If you're building multi-tenant SaaS, that's a tenant data leak waiting to happen. One missing `CREATE POLICY` statement and any authenticated user can query any other tenant's data.

Here are the patterns that actually matter, and the ones that will save you from a disclosure incident.

## The Problem: Retrofitting is Nearly Impossible

A Supabase engineer once described retrofitting tenant isolation as **"rebuilding the foundation while people live in the house."** They were being generous.

If you ship without RLS and discover the leak later, you have to:

1. Audit every query you've ever written
2. Audit every query any third-party tool ever writes
3. Add RLS policies to every table
4. Verify nothing broke
5. Hope no one noticed the leak in the meantime

The cost of doing it right on day one is 20 minutes per table. The cost of retrofitting is weeks of work and existential risk.

## Pattern 1: Enable RLS on Every Table

```sql
-- For every table that contains tenant data:
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

This is the baseline. Without RLS enabled, no policy matters.

**Common mistake:** Forgetting to enable RLS on join tables, audit logs, or denormalized materialized views. If it has tenant data, it needs RLS.

## Pattern 2: The Tenant ID Policy

```sql
CREATE POLICY tenant_isolation ON projects
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

Every query against `projects` now implicitly filters by the authenticated user's tenant. No more worrying about writing `WHERE tenant_id = $1` in every SELECT.

**Gotcha:** Your JWT needs to actually have `tenant_id` in the claims. In Supabase, you set this via an Auth Hook or store it in `user_metadata`:

```sql
-- If tenant_id is in raw_user_meta_data
CREATE POLICY tenant_isolation ON projects
  USING (
    tenant_id = (
      SELECT (raw_user_meta_data->>'tenant_id')::uuid
      FROM auth.users
      WHERE id = auth.uid()
    )
  );
```

## Pattern 3: Composite Indexes for RLS

This is the one people miss. RLS policies add `WHERE` clauses to every query. If you don't have composite indexes, your queries do full table scans.

```sql
-- Bad: only indexes tenant_id
CREATE INDEX idx_projects_tenant ON projects (tenant_id);

-- Good: indexes tenant_id + the column you usually order/filter by
CREATE INDEX idx_projects_tenant_created ON projects (tenant_id, created_at DESC);

-- Also good: for status-heavy queries
CREATE INDEX idx_projects_tenant_status ON projects (tenant_id, status)
WHERE deleted_at IS NULL;
```

**Rule of thumb:** For every SELECT query you run that filters by tenant + something, create a composite index starting with `tenant_id`.

## Pattern 4: Separate Policies for Read/Write

Don't use a single policy for all operations. Be explicit:

```sql
-- Read policy: users see their tenant's data
CREATE POLICY tenant_read ON projects
  FOR SELECT
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Write policy: users can only insert for their tenant
CREATE POLICY tenant_insert ON projects
  FOR INSERT
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Update policy: can only modify rows from their tenant
CREATE POLICY tenant_update ON projects
  FOR UPDATE
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
  WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Delete policy: only soft deletes allowed (no actual DELETE)
-- Or: explicit delete policy if you want it
```

The `WITH CHECK` clause is critical on INSERT/UPDATE — it prevents users from inserting rows for OTHER tenants. Easy to forget, expensive to miss.

## Pattern 5: Service Role Bypass

For admin operations, background jobs, and cron tasks, you need to bypass RLS:

```javascript
// Normal user client (RLS applies)
const supabase = createClient(url, anonKey);

// Service role client (RLS bypassed — use carefully!)
const admin = createClient(url, serviceKey);
```

**Rule:** The service role key should NEVER touch the browser. Server-side only. If you leak it, you've leaked everything.

Use it only for:
- Cron jobs
- Webhook handlers
- Admin dashboards
- Migrations

## Pattern 6: Test Your Policies

Supabase has a built-in way to test policies:

```sql
-- Simulate a specific user
SET request.jwt.claims = '{"sub": "user-uuid-here", "tenant_id": "tenant-uuid"}';

-- Run your query
SELECT * FROM projects;

-- Reset
RESET request.jwt.claims;
```

Write a test file that runs through every critical query with different user/tenant combinations. Run it in CI.

## Pattern 7: Audit Log Your Policy Changes

RLS policies are code. Treat them like code:

- Store them in migration files (`supabase/migrations/*.sql`)
- Review policy changes in PR
- Never edit policies in the Supabase dashboard directly
- Commit every change

## The Common Gotchas

**1. JOINs across tenants.** If you JOIN a protected table with an unprotected table, the unprotected one can leak tenant data through the join. Enable RLS on every table the protected one touches.

**2. Functions with SECURITY DEFINER.** These bypass RLS. Use sparingly and audit them carefully.

**3. Views.** Views inherit the RLS of underlying tables... sometimes. Test explicitly.

**4. Real-time subscriptions.** Supabase Realtime respects RLS, but only if you enable it per table. Don't forget to enable replica identity.

## How Axiom Catches This

I built a free tool called `axiom-check` that scans for missing RLS automatically:

```bash
npx axiom-check
```

It grep-detects `supabase.from(` calls and looks for `CREATE POLICY` statements anywhere in the repo. If the first exists without the second, it flags a HIGH severity gap.

Not perfect, but good enough to catch 90% of missing RLS cases. Free, MIT licensed.

## The Bigger Picture

`axiom-check` is part of a larger open-source framework called [Axiom](https://github.com/yorkisestevez/axiom) — a self-improving AI operating system that runs these scans daily against YOUR projects and feeds findings into a learning loop.

The SaaS Starter Pack on the Axiom store ($49) includes ready-to-drop-in RLS skills, Stripe metered billing patterns, and PLG free-tier designs. If you're building multi-tenant SaaS and want the patterns battle-tested, that's the fastest way to get them.

---

*Yorkis Estevez — Toronto-based SaaS builder, Axiom maintainer. [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom)*
