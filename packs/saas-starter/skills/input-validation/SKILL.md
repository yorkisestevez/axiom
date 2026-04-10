---
name: input-validation
description: "Zod schema validation at all API boundaries. Prevents injection, type errors, and bad data."
metadata:
  openclaw:
    emoji: "🛡️"
    skillKey: "input-validation"
    pack: "saas-starter"
---

# Input Validation (Zod)

## What
Schema validation using Zod at every API boundary. Validates request bodies, query params, and path params before they touch business logic.

## Core Pattern

```typescript
import { z } from 'zod';

const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  price: z.number().positive(),
  tenantId: z.string().uuid(),
});

// In route handler
const parsed = CreateItemSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({ success: false, error: parsed.error.flatten() });
}
```

## Key Rules
- Validate at the API boundary, not in business logic
- Use safeParse (doesn't throw) over parse (throws)
- Return structured validation errors, not generic 400s
- Share schemas between frontend and backend via a shared package
