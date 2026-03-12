# WareOS Codebase Refactoring Guide

## Part A — The Prompt for Claude Code

Copy-paste the prompt below into Claude Code. It instructs Claude to produce a plan first, get your approval, then execute step by step.

---

```
You are refactoring the WareOS warehouse management SaaS codebase. This app was built iteratively over multiple versions, and accumulated dead weight. There are no customers yet, so breaking changes are fine.

## PHASE 1 — AUDIT & PLAN (do NOT write code yet)

Produce a detailed refactoring plan as a markdown file at `docs/plans/refactoring-plan.md`. The plan must cover every section below. For each item, list the specific files affected, the change you'd make, and the estimated risk (low/medium/high).

### 1. Dead code & unused exports
- Search for functions, components, types, and constants that are defined but never imported anywhere.
- Search for commented-out code blocks longer than 5 lines.
- Search for TODO/FIXME comments that reference features that already exist or were abandoned.
- List every file that can be deleted outright.

### 2. Dependency cleanup
- Identify npm packages that are installed but never imported in `src/`.
- Flag duplicate-purpose libraries (e.g. `qrcode` and `react-qr-code` both do QR generation — pick one and remove the other).
- Check for packages that could be replaced by lighter alternatives.
- Check for outdated major versions that should be bumped.

### 3. Client/server boundary optimization
- List every file with `'use client'` and assess whether it truly needs client-side JS.
- Identify components that can be converted to Server Components (anything not using hooks, event handlers, or browser APIs).
- Identify heavy client components that should be split: server shell (layout, static text) + client island (interactive parts).
- Focus especially on: `dashboard-home.tsx`, all landing page components, table components that only render data.

### 4. Code splitting & lazy loading
- List heavy libraries (`@react-pdf/renderer`, `papaparse`, `qrcode`, `recharts`, any chart lib) and which pages import them.
- For each, propose a `dynamic()` import with `{ ssr: false }` so they only load on the pages that use them.
- Identify any page-level components that should use `React.lazy()` or `next/dynamic`.

### 5. Data fetching optimization
- Audit `page-guard.ts` and `middleware.ts` for sequential `await` chains that can be parallelized with `Promise.all`.
- Identify any page-level `page.tsx` files with waterfall fetches.
- Check that every list/table page uses proper pagination, not unbounded queries.

### 6. Large file decomposition
- List every file over 400 lines.
- For each, propose how to split it (extract sub-components, extract hooks, extract utilities).
- Special focus: dispatches/new, purchases/new, sales/new page.tsx files — extract shared form patterns into a `useTransactionForm` base hook.

### 7. Duplicate logic consolidation
- Compare `use-dispatch-form.ts`, `use-purchase-form.ts`, and `use-sale-form.ts` — extract common patterns (line item management, totals calculation, validation) into a shared base hook.
- Compare query files across modules for repeated patterns (tenant filtering, date ranges, pagination).
- Check for repeated Zod schemas or similar validation patterns across modules.

### 8. Supabase client singleton
- The browser client (`createBrowserClient()`) creates a new instance per call. Propose a singleton or React context pattern so all components share one client.
- Assess server-side client creation and whether it can be optimized.

### 9. Error boundaries
- List all route segments that lack an `error.tsx`.
- Propose which segments need one (prioritize routes with complex data fetching or user input).

### 10. Migration & database cleanup
- Check for duplicate migration numbering (e.g. two `00003_*` files).
- Check if any module migrations reference tables or columns that no longer exist.
- Verify that module DDL in `module-migrations.ts` is consistent with what the SQL migrations create.

### 11. Hook & utility consolidation
- Custom hooks live in `src/hooks/`, `src/lib/hooks/`, and inline in component directories. Propose a single canonical location.
- Check `src/lib/` for utilities that duplicate built-in JS/TS functionality or existing library functions.

### 12. Type safety improvements
- Search for `any` types and propose proper types.
- Search for `as` type assertions that might mask bugs.
- Check for missing return types on exported functions.

### 13. Test gaps
- There are 0 frontend component tests. Identify the 5 most critical components to test first.
- Check if any API routes lack test coverage.
- Verify test factories and seeds match current schema.

Format the plan as a checklist so I can review and approve/reject each item before you execute.

## PHASE 2 — EXECUTE (only after I approve the plan)

After I review the plan and say "go", execute each approved item one at a time:
1. Make the change.
2. Run `pnpm build` to verify no build errors.
3. Run `pnpm test` to verify no test regressions.
4. Commit with a descriptive message explaining what was refactored and why.
5. Move to the next item.

If a build or test fails, fix the issue before moving on. Do NOT skip broken items.

## CONSTRAINTS
- Do NOT change any user-facing behavior or UI appearance.
- Do NOT modify database schema or migration files without explicit approval.
- Do NOT remove any feature that is referenced in the module manifests.
- Do NOT touch `.env` files.
- Preserve all existing test coverage — tests must pass after every change.
- Each commit should be atomic and revertable.
```

---

## Part B — Technology Assessment

### What you're running now (March 2026)

| Layer | Current | Version |
|-------|---------|---------|
| Framework | Next.js (App Router) | 16.1.6 |
| React | React | 19.2.3 |
| Database | Supabase (PostgreSQL) | supabase-js 2.98 |
| UI | shadcn/ui + Tailwind | v4 |
| Auth | Supabase Auth | via SSR 0.9 |
| PDF | @react-pdf/renderer | — |
| CSV | papaparse | — |
| Email | Resend | — |

**Verdict: Your core stack is current.** Next.js 16.1, React 19, Tailwind v4, and shadcn/ui are all either the latest stable or within one minor version. No urgent upgrades needed here.

### Worth considering (not urgent, but meaningful wins)

**1. Drizzle ORM alongside Supabase**

Your current approach uses the Supabase JS client (PostgREST) for queries. This works, but your query files are getting large (547 and 480 lines) because PostgREST's chained syntax gets verbose for complex joins and aggregations.

Drizzle ORM connects directly to your Supabase PostgreSQL database, gives you type-safe SQL-like queries, and produces a ~7.4KB bundle (minimal cold-start impact). You can use both side by side — Supabase client for auth and realtime, Drizzle for complex queries. This would make your query files dramatically shorter and more maintainable.

**2. `pdfme` or `pdfmake` instead of `@react-pdf/renderer`**

`@react-pdf/renderer` is heavy — it ships a full React reconciler and layout engine to the client. If your PDFs are generated server-side only (which they appear to be, via API routes), `pdfmake` gives you the same declarative table/layout API at a fraction of the weight. `pdfme` is even lighter if your documents follow templates.

Since you have no customers yet, this is a clean swap window.

**3. Next.js 16 `"use cache"` directive**

Next.js 16 introduced explicit Cache Components via `"use cache"`. Your dashboard page fetches 7 queries in parallel on every load — some of those (KPIs, stock by location) are strong candidates for caching with a short TTL. This would reduce database load significantly once you have real traffic. Currently the codebase uses no caching at all.

**4. React Compiler (stable in Next.js 16)**

The React Compiler is now stable and auto-memoizes components, eliminating manual `useMemo`/`useCallback`. Since you're already on Next.js 16.1, you can enable it in `next.config.ts` with one line. Free performance.

**5. shadcn CLI v4 preset switching**

shadcn/ui shipped CLI v4 in March 2026 with a unified `radix-ui` package (replacing dozens of `@radix-ui/react-*` packages). Running `npx shadcn init --preset` would clean up your package.json and simplify your dependency tree.

### Not worth changing

| Suggestion | Why skip it |
|------------|------------|
| **TanStack Start** instead of Next.js | TanStack Start is impressive for client-heavy dashboards (83% dev speed improvement reported by Inngest), but your app is already built on Next.js 16 and works well. A framework migration with 30K+ lines of code and no customers is high risk for marginal gain. Revisit only if Next.js becomes a real bottleneck. |
| **Turso / PocketBase** instead of Supabase | Your multi-tenant schema-per-tenant architecture is deeply integrated with PostgreSQL. Supabase gives you auth, realtime, and storage in one package. Switching databases would be a rewrite, not a refactor. |
| **Firebase** | Going backward. Supabase is the better choice for PostgreSQL-based SaaS in 2026. |
| **Separate backend (NestJS, etc.)** | Adds operational complexity. Next.js API routes + Supabase is sufficient for your scale. |

### Summary

Your stack is sound. The biggest wins are not technology swaps — they're architectural hygiene: code splitting, server/client boundary cleanup, query consolidation, and enabling features you already have access to (React Compiler, `"use cache"`). The refactoring prompt above targets exactly these.

---

## Sources

- [Next.js 16 release blog](https://nextjs.org/blog/next-16)
- [Next.js 16.1 release](https://nextjs.org/blog/next-16-1)
- [Drizzle ORM with Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)
- [Drizzle vs Prisma 2026](https://www.bytebase.com/blog/drizzle-vs-prisma/)
- [TanStack Start vs Next.js comparison](https://tanstack.com/start/latest/docs/framework/react/start-vs-nextjs)
- [shadcn/ui February 2026 changelog](https://ui.shadcn.com/docs/changelog/2026-02-radix-ui)
- [shadcn CLI v4 / March 2026](https://ui.shadcn.com/docs/changelog)
- [Top JS PDF libraries 2026](https://www.nutrient.io/blog/top-js-pdf-libraries/)
- [Supabase alternatives 2026](https://northflank.com/blog/supabase-alternative)
- [Next.js 15 & 16 migration guide](https://jishulabs.com/blog/nextjs-15-16-features-migration-guide-2026)
