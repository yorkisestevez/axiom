---
name: multi-tenant-rls
description: "Supabase Row Level Security patterns for multi-tenant SaaS. Tenant isolation from day 1."
metadata:
  openclaw:
    emoji: "🔒"
    skillKey: "multi-tenant-rls"
    pack: "saas-starter"
---

# Multi-Tenant RLS

## What
Row Level Security (RLS) patterns for Supabase that enforce tenant data isolation at the database level. Every query automatically filters by the authenticated user's tenant.

## When to Use
Any multi-tenant SaaS application using Supabase. Must be implemented from day 1 — retrofitting is described as "rebuilding the foundation while people live in it."

## Core Pattern

```sql
-- Enable RLS on every tenant table
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy
CREATE POLICY tenant_isolation ON items
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Composite index for performance (critical)
CREATE INDEX idx_items_tenant ON items (tenant_id, created_at DESC);
```

## Key Rules
- Every table with tenant data needs RLS enabled
- Every query that filters by tenant needs a composite index
- Test RLS policies with different JWT claims
- Never trust client-side tenant filtering alone
