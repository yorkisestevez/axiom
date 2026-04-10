---
name: stripe-metered-billing
description: "Stripe Meters API + hybrid pricing for SaaS. Base subscription + usage-based overages."
metadata:
  openclaw:
    emoji: "💳"
    skillKey: "stripe-metered-billing"
    pack: "saas-starter"
---

# Stripe Metered Billing

## What
Implementation patterns for Stripe's Meters API (post-2025-03-31). Hybrid pricing: base subscription + usage-based overages. Your database is source of truth, Stripe handles billing.

## When to Use
Any SaaS with usage-based pricing (API calls, tokens, agent tasks, storage).

## Core Pattern

1. **Meter** — defines what you're tracking and how to aggregate
2. **Price** — links to the Meter and sets cost per unit
3. **Subscription** — ties a customer to that Price
4. **Meter Events** — raw usage data you send to Stripe

## Key Rules
- Accumulate usage internally, flush aggregated events every minute or hour
- Your DB is source of truth for usage, not Stripe
- Handle webhooks: invoice.created, invoice.finalized, invoice.payment_failed
- Never send one Stripe event per user action — aggregate first
