---
date: 2026-04-10
title: "Why React Compiler Makes useMemo Obsolete (and How to Migrate)"
description: "92% of top Next.js repos still use manual useMemo. Here's why React Compiler makes it redundant and how to migrate your codebase."
tags: [react, nextjs, performance, javascript]
canonical_url: https://github.com/yorkisestevez/axiom/blob/master/content/devto/03-react-compiler-usememo-migration.md
---

# Why React Compiler Makes useMemo Obsolete (and How to Migrate)

When I scanned the top 48 Next.js projects on GitHub, **92% still used manual `useMemo` or `useCallback`**. Every one of those calls is either redundant or actively worse than what React Compiler would do automatically.

Here's why, and how to migrate your codebase in an afternoon.

## The Old Mental Model

Before React Compiler, the recommended pattern was:

```javascript
function ProductList({ items, filter }) {
  const filteredItems = useMemo(
    () => items.filter(item => item.category === filter),
    [items, filter]
  );

  const handleClick = useCallback((id) => {
    analytics.track('item_click', { id });
  }, []);

  return (
    <ul>
      {filteredItems.map(item => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
    </ul>
  );
}
```

You memoized expensive computations with `useMemo`. You memoized callbacks with `useCallback` to avoid triggering child re-renders. It worked, but:

- **It's noisy.** Half your component is ceremony, not logic.
- **It's error-prone.** Wrong dependency arrays cause stale closures. Extra dependencies cause unnecessary recomputation.
- **It's often wrong.** Memoization has overhead. If your computation is cheap, `useMemo` can make things slower.

## What React Compiler Does

React Compiler analyzes your component at build time and automatically memoizes everything that benefits from it. The compiler knows:

- Which values are actually used in the render path
- Which dependencies actually change
- Whether memoization is worth the overhead
- How to handle stable references without manual dependency arrays

With the compiler, the same component becomes:

```javascript
function ProductList({ items, filter }) {
  const filteredItems = items.filter(item => item.category === filter);

  const handleClick = (id) => {
    analytics.track('item_click', { id });
  };

  return (
    <ul>
      {filteredItems.map(item => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
    </ul>
  );
}
```

Cleaner. Safer. Often faster, because the compiler makes better memoization decisions than you can by reading the code.

## When Manual Memoization is Still Useful

Almost never. The edge cases are:

1. **Extremely expensive computations** where you want to control exactly when they run (rare — usually you want a worker or Suspense).
2. **Third-party libraries that expect stable references** and you can't modify them.
3. **Legacy codebases** where you can't enable the compiler yet.

For everything else, remove the memoization and let the compiler do its job.

## How To Enable React Compiler

**For Next.js 15+:**

```javascript
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: true
  }
};
```

**For Vite:**

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]]
      }
    })
  ]
});
```

Install the Babel plugin if it's not already there:

```bash
npm install --save-dev babel-plugin-react-compiler
```

## The Migration Plan

You don't need to rip out all your `useMemo`/`useCallback` calls at once. The compiler is backwards-compatible — existing memoization still works.

Here's the pragmatic path:

1. **Enable the compiler** (one config change)
2. **Run your test suite** — nothing should break
3. **Pick one component** you're about to refactor anyway
4. **Remove all the manual memoization** in that component
5. **Verify** it still works (tests + manual check)
6. **Commit**
7. **Repeat**

After a few weeks, your codebase looks modern and you're done.

## The Axiom Way

If you don't want to hunt down manual memoization by hand, run:

```bash
npx axiom-check
```

The free scanner counts your `useMemo`/`useCallback` calls and flags them as a LOW severity gap with an action item. It's one of 12 rules it checks.

No install, 5 seconds, stylized terminal report.

## What Else Changed in React 2026

React Compiler isn't the only thing. The App Router is stable. Server Components are the default. Server Actions replaced most API route boilerplate. If you're still writing code like it's 2023, you're not just missing `useMemo` optimizations — you're missing the whole paradigm shift.

I wrote more about this in [my deep-dive on the 12 gaps hiding in top Next.js repos](https://dev.to/yorkisestevez/hall-of-gaps-nextjs).

## Try It

Clone a side project. Enable React Compiler. Remove 20 `useMemo` calls. See if anything breaks.

Nothing will. That's the point.

---

*Yorkis Estevez — SaaS builder, Axiom maintainer. Axiom is an open-source AI operating system. [github.com/yorkisestevez/axiom](https://github.com/yorkisestevez/axiom)*
