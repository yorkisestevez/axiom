---
name: error-handling
description: "Consistent API error response pattern. Every route returns {success, data} or {success, error}."
metadata:
  openclaw:
    emoji: "⚠️"
    skillKey: "error-handling"
    pack: "saas-starter"
---

# Consistent Error Handling

## What
Every API route uses the same error response shape. Clients always know what to expect. Errors are logged with context.

## Core Pattern

```typescript
// Success
res.json({ success: true, data: result });

// Error
res.status(code).json({ success: false, error: message });

// Route wrapper
async function handler(req, res) {
  try {
    const result = await doWork(req);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(`[${routeName}]`, err.message);
    const status = err.status || 500;
    res.status(status).json({ success: false, error: err.message });
  }
}
```

## Key Rules
- Never return raw error objects to the client
- Always include a context prefix in console.error: `[resource-name]`
- Use error.tsx / ErrorBoundary for client-side crash recovery
- Log enough context to debug without reproducing the issue
